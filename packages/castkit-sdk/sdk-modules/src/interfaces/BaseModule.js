/**
 * BaseModule defines the contract for all SDK Modules.
 * Any new module must extend this class to be registered in the SDK.
 */
export default class BaseModule {
  constructor(options = {}) {
    this.options = options;
    this.core = null; // Will be injected when registered
    this.controller = new AbortController();
  }

  get name() {
    throw new Error('Module must implement a getter for name');
  }

  // Fetches chain context bounds routing to SDKCore
  getChainConfig(targetChainId) {
    if (!this.core) throw new Error('Module uninitialized: SDKCore is null.');
    return { 
      chainId: targetChainId || this.core.chainId,
      rpcUrl: this.core.getRpc(targetChainId) 
    };
  }

  async init(core) {
    this.core = core;
    if (this.onInit) {
      await this.onInit();
    }
  }

  async start() {
    if (this.onStart) {
      await this.onStart();
    }
  }

  async destroy() {
    if (this.onDestroy) {
      await this.onDestroy();
    }
    this.core = null;
  }
}
