export class InvalidAddressError extends Error {
  constructor(address) {
    super(`Invalid Ethereum Address: ${address}`);
    this.name = 'InvalidAddressError';
  }
}
