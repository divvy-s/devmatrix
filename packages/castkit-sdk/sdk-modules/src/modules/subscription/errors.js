export class SubscriptionTestnetOnlyError extends Error {
  constructor(chainId) {
    super(`Subscription module is testnet-only. Chain ${chainId} is not allowed.`);
    this.name = 'SubscriptionTestnetOnlyError';
  }
}

export class SubscriptionConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SubscriptionConfigError';
  }
}

export class SubscriptionInvalidAddressError extends Error {
  constructor(address) {
    super(`Invalid subscription wallet address: ${address}`);
    this.name = 'SubscriptionInvalidAddressError';
  }
}
