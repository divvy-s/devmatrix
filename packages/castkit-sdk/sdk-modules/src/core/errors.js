export class UnsupportedChainError extends Error {
  constructor(chainId) {
    super(`Unsupported Chain Error: Chain ID ${chainId} is not configured in the active networks.`);
    this.name = 'UnsupportedChainError';
  }
}
