/**
 * Manages the lifecycle and resolution of modules/plugins.
 */
export default class PluginRegistry {
  constructor(core) {
    this.core = core;
    this.modules = new Map();
  }

  async register(moduleInstance) {
    if (this.modules.has(moduleInstance.name)) {
      this.core.logger.warn('Registry', `Module ${moduleInstance.name} is already registered. Overwriting.`);
    }
    
    // Inject core into module via initialization
    await moduleInstance.init(this.core);
    this.modules.set(moduleInstance.name, moduleInstance);
    
    this.core.logger.debug('Registry', `Registered module: ${moduleInstance.name}`);
  }

  get(moduleName) {
    const moduleInstance = this.modules.get(moduleName);
    if (!moduleInstance) {
      throw new Error(`Module ${moduleName} is not registered.`);
    }
    return moduleInstance;
  }

  async startAll() {
    const startPromises = [];
    for (const [name, module] of this.modules.entries()) {
      if (typeof module.start === 'function') {
        startPromises.push(
          (async () => {
            try {
              await module.start();
              this.core.logger.debug('Registry', `Started module: ${name}`);
            } catch (e) {
              this.core.logger.error('Registry', `Failed to start module: ${name}`, e);
              this.core.events.emit('global:error', { module: name, error: e });
            }
          })()
        );
      }
    }
    await Promise.all(startPromises);
  }

  async destroyAll() {
    const destroyPromises = [];
    for (const [name, module] of this.modules.entries()) {
      if (typeof module.destroy === 'function') {
        destroyPromises.push(
          (async () => {
            try {
              await module.destroy();
              this.core.logger.debug('Registry', `Destroyed module: ${name}`);
            } catch (e) {
              this.core.logger.error('Registry', `Failed to destroy module: ${name}`, e);
            }
          })()
        );
      }
    }
    await Promise.all(destroyPromises);
    this.modules.clear();
  }
}
