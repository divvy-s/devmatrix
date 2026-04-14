const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidEthAddress(value) {
  return typeof value === 'string' && ETH_ADDRESS_REGEX.test(value);
}

export function shortenAddress(address) {
  if (typeof address !== 'string' || address.length < 10) {
    return 'Unknown';
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function toUnixTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 10_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  return Math.floor(Date.now() / 1000);
}

export function normalizeIpfsUrl(url, gatewayBase = 'https://ipfs.io/ipfs/') {
  if (typeof url !== 'string' || !url.trim()) return null;

  const trimmed = url.trim();
  if (trimmed.startsWith('ipfs://')) {
    const cidAndPath = trimmed.replace('ipfs://', '');
    return `${gatewayBase}${cidAndPath}`;
  }

  return trimmed;
}

export function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function pickFirstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

export function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
