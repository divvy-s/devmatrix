import { fetchEns } from './sources/ens.js';
import { fetchFarcaster } from './sources/farcaster.js';
import { fetchLens } from './sources/lens.js';
import { InvalidAddressError } from './errors.js';

const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function isValidEthAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function resolveIdentity(address, options, logger, signal) {
  if (!isValidEthAddress(address)) {
    throw new InvalidAddressError(address);
  }

  const normalized = address.toLowerCase();

  // 1. Basic TTL Caching
  if (CACHE.has(normalized)) {
    const cached = CACHE.get(normalized);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug('IdentityResolver', `Cache hit for ${normalized}`);
      return cached.data;
    }
    CACHE.delete(normalized);
  }

  // 2. Parallel Resolution utilizing Promise.allSettled
  const ensChainId = options.forcedChainId || 1; // Unlocked Mainnet for ENS queries!
 // Forced Sepolia for ENS by default
  const ensRpcUrl = options.getRpc ? options.getRpc(ensChainId) : options.rpcUrl;

  const results = await Promise.allSettled([
    fetchEns(address, ensRpcUrl, ensChainId, logger, signal),
    fetchFarcaster(address, options.neynarApiKey, logger, signal),
    fetchLens(address, logger, signal)
  ]);

  const extractValue = (res) => (res.status === 'fulfilled' ? res.value : null);
  
  const ens = extractValue(results[0]);
  const fc = extractValue(results[1]);
  const lens = extractValue(results[2]);

  const rejected = results.filter(r => r.status === 'rejected');
  const hasPartialFailures = rejected.length > 0 && rejected.length < results.length;
  const isTotallyFailed = rejected.length === results.length;

  if (hasPartialFailures) {
    logger.warn('IdentityResolver', `Partial provider failures for ${address}: ${rejected.length}/3 failed`);
  }

  if (isTotallyFailed) {
    logger.error('IdentityResolver', `All identity providers failed for ${address}`);
  }

  // 3. Apply Priority Trees
  // Primary Name: ENS > Farcaster Username > Lens Handle > Shortened Address
  const name = (ens && ens.name) 
    || (fc && fc.username) 
    || (lens && lens.handle) 
    || shortenAddress(address);

  // Avatar: Farcaster > ENS > Lens > null
  const avatar = (fc && fc.avatar) 
    || (ens && ens.avatar) 
    || (lens && lens.avatar) 
    || null;

  const data = {
    address: normalized,
    name,
    avatar,
    sources: { ens, farcaster: fc, lens },
    hasPartialFailures
  };

  // Only cache if we succeeded on at least one path (or all paths resolved but found null)
  if (!isTotallyFailed) {
    CACHE.set(normalized, { timestamp: Date.now(), data });
  }

  logger.info(
    'IdentityResolver',
    `Resolved ${address} -> ${name} (ens=${!!(ens && ens.name)}, farcaster=${!!(fc && fc.username)}, lens=${!!(lens && lens.handle)})`
  );

  return data;
}
