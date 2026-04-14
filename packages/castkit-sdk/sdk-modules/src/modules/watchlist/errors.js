export class InvalidWatchAddressError extends Error {
  constructor(address) {
    super(`Invalid wallet address for watchlist: ${address}`);
    this.name = 'InvalidWatchAddressError';
  }
}

export class WatchlistNotInitializedError extends Error {
  constructor() {
    super('WatchlistModule has not been initialized with SDKCore yet.');
    this.name = 'WatchlistNotInitializedError';
  }
}
