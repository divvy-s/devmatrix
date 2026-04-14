import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Fully Chain-Independent ENS Resolution
export async function fetchEns(address, rpcUrl, chainId, logger, signal) {
  const start = Date.now();
  try {
    if (!rpcUrl) {
      throw new Error(`Missing rpcUrl for ENS lookup on chain ${chainId}`);
    }

    // ENS queries require chain metadata. Use canonical mainnet config for chain 1.
    const resolvedChain = Number(chainId) === 1
      ? mainnet
      : {
          id: Number(chainId),
          name: `Dynamic-Chain-${chainId}`,
          network: `custom-${chainId}`,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } }
        };

    const client = createPublicClient({
      chain: resolvedChain,
      transport: http(rpcUrl, { fetchOptions: { signal } })
    });
    
    // Reverse resolution executed dynamically over instantiated custom boundary
    const name = await client.getEnsName({ address });
    let avatar = null;
    
    if (name) {
      // Automatically routed conditionally safely 
      avatar = await client.getEnsAvatar({ name });
    }
    
    logger.info('Identity.ENS', `Lookup finished on chain ${chainId} in ${Date.now() - start}ms`);
    return { name, avatar };
    
  } catch (error) {
    logger.warn('Identity.ENS', `Lookup failed on chain ${chainId} in ${Date.now() - start}ms`, error.message);
    throw error;
  }
}
