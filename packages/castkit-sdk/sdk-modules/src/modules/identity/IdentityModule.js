import BaseModule from '../../interfaces/BaseModule.js';
import { resolveIdentity } from './resolver.js';

export class IdentityModule extends BaseModule {
  get name() {
    return 'IdentityModule';
  }

  async onInit() {
    this.core.logger.info(this.name, 'Identity Module seamlessly initialized bridging natively.');
  }

  async resolve(address, queryOptions = {}) {
    // Determine the executing contextual chain config mapping independently
    const chainConfig = this.getChainConfig(queryOptions.chainId);
    
    // Inject the payload properties 
    const executionOptions = {
       ...this.options,
       rpcUrl: chainConfig.rpcUrl,
       chainId: chainConfig.chainId,
       getRpc: (id) => this.core.getRpc(id),
       forcedChainId: queryOptions.forcedChainId
    };

    this.core.events.emit('identity:resolve-started', { address, chainId: executionOptions.chainId });
    try {
      const result = await resolveIdentity(address, executionOptions, this.core.logger, this.controller.signal);
      this.core.events.emit('identity:resolve-success', { address, result });
      return result;
    } catch (error) {
      this.core.events.emit('identity:resolve-failed', { address, error });
      throw error;
    }
  }

  async resolveMany(addresses, queryOptions = {}) {
    const uniqueAddresses = [...new Set(addresses)];
    return Promise.all(
      uniqueAddresses.map(addr => 
        this.resolve(addr, queryOptions).catch(e => ({ address: addr, error: e }))
      )
    );
  }
}
