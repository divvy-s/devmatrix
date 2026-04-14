import EventBus from './EventBus.js';
import Logger from './Logger.js';
import PluginRegistry from './PluginRegistry.js';
import { UnsupportedChainError } from './errors.js';

export default class SDKCore {
  constructor(config = {}) {
    this.config = config;
    this.isInitialized = false;
    this.isStarted = false;

    // Distinguish Server vs Client environment
    this.isServer = typeof window === 'undefined';

    // Networks Mapping: e.g. { "84532": { rpcUrl: "..." }, "11155111": { rpcUrl: "..." } }
    this.networks = config.networks || {};
    
    // Agnostic Chain Resolution logic
    this.chainId = config.defaultChainId;
    if (!this.chainId && Object.keys(this.networks).length > 0) {
       this.chainId = Number(Object.keys(this.networks)[0]);
    }

    // Shared services
    this.logger = new Logger(config.logLevel || 'info', this.isServer);
    this.logger.debug('Core', `SDK configured with dynamic chain-independent router.`);
    if (this.chainId) {
        this.logger.info('Core', `Default Chain ID set to: ${this.chainId}`);
    }

    this.events = new EventBus();
    this.registry = new PluginRegistry(this);
  }

  // Chain Controller Handlers
  switchChain(chainId) {
    const stringId = String(chainId);
    if (!this.networks[stringId]) {
      throw new UnsupportedChainError(chainId);
    }
    this.chainId = chainId;
    this.events.emit('core:chain-switched', { chainId });
    this.logger.info('Core', `Switched active chain dynamically to: ${chainId}`);
  }

  getRpc(targetChainId) {
    const id = targetChainId || this.chainId;
    const stringId = String(id);
    
    const networkConfig = this.networks[stringId];
    if (!networkConfig) {
      throw new UnsupportedChainError(id);
    }

    return networkConfig.rpcUrl;
  }

  /**
   * Intended to be called once to load plugins.
   * @param {Array} modules - Array of BaseModule instances
   */
  async init(modules = []) {
    if (this.isInitialized) return;
    this.logger.info('Core', `Initializing SDK on the ${this.isServer ? 'Server' : 'Client'}`);
    
    for (const plugin of modules) {
      await this.registry.register(plugin);
    }
    
    this.isInitialized = true;
    this.events.emit('core:initialized', { isServer: this.isServer });
    return this; 
  }

  async start() {
    if (!this.isInitialized) throw new Error('SDK must be initialized before starting.');
    if (this.isStarted) return;
    
    this.logger.info('Core', 'Starting SDK engines');
    await this.registry.startAll();
    this.isStarted = true;
    this.events.emit('core:started');
  }

  async destroy() {
    this.logger.info('Core', 'Destroying SDK');
    await this.registry.destroyAll();
    this.events.clear();
    this.isInitialized = false;
    this.isStarted = false;
  }

  getModule(name) {
    return this.registry.get(name);
  }
}
