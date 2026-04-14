const VALID_NETWORKS = new Set(['ipfs', 'arweave']);
const PROFILE_FIELDS = new Set(['username', 'handle', 'avatar', 'avatarUrl', 'bio', 'displayName', 'profile']);
const NFT_HINT_FIELDS = new Set(['name', 'description', 'image', 'attributes', 'external_url', 'animation_url']);

function isBlobLike(data) {
  return typeof Blob !== 'undefined' && data instanceof Blob;
}

function isPlainObject(data) {
  return !!data && typeof data === 'object' && !Array.isArray(data) && !isBlobLike(data);
}

function looksLikeProfilePayload(data) {
  if (!isPlainObject(data)) return false;
  return [...PROFILE_FIELDS].some((field) => field in data);
}

function looksLikeNftMetadata(data) {
  if (!isPlainObject(data)) return false;

  const hasNftHints = [...NFT_HINT_FIELDS].some((field) => field in data);
  if (!hasNftHints) return false;

  const hasAttributes = Array.isArray(data.attributes);
  const hasNameAndImage = typeof data.name === 'string' && typeof data.image === 'string';

  return hasAttributes || hasNameAndImage;
}

function normalizeForcedNetwork(forceNetwork) {
  if (!forceNetwork) return null;
  const normalized = String(forceNetwork).toLowerCase().trim();
  return VALID_NETWORKS.has(normalized) ? normalized : null;
}

export function explainStorageStrategy(data, options = {}) {
  const forced = normalizeForcedNetwork(options.forceNetwork);
  if (forced) {
    return { network: forced, reason: 'Forced by options.forceNetwork' };
  }

  if (options.isCritical || options.intent === 'critical' || options.permanence === 'high') {
    return { network: 'arweave', reason: 'Critical permanence requested' };
  }

  if (isBlobLike(data)) {
    return { network: 'ipfs', reason: 'Blob/File payload defaults to IPFS for fast media access' };
  }

  if (isPlainObject(data)) {
    if (data.isCritical || data.permanent === true || data.storageClass === 'permanent') {
      return { network: 'arweave', reason: 'Object marked as permanent/critical' };
    }

    if (looksLikeNftMetadata(data)) {
      return { network: 'arweave', reason: 'Detected NFT metadata shape' };
    }

    if (looksLikeProfilePayload(data)) {
      return { network: 'ipfs', reason: 'Detected profile/app payload shape' };
    }

    return { network: 'ipfs', reason: 'Generic JSON payload defaults to IPFS' };
  }

  return { network: 'ipfs', reason: 'Fallback default to IPFS' };
}

export function decideStorageStrategy(data, options = {}) {
  return explainStorageStrategy(data, options).network;
}
