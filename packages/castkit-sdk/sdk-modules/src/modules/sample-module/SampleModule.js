import BaseModule from '../../interfaces/BaseModule.js';

export default class SampleModule extends BaseModule {
  constructor(options) {
    super(options);
    // Custom state for module
    this.count = 0;
  }
  
  get name() {
    return 'SampleModule'; // Has to be unique
  }

  // Lifecycle hook from BaseModule
  onInit() {
    this.core.logger.debug(this.name, 'SampleModule has been initialized!');
    
    // Subscribe to events from other components
    this.core.events.on('core:started', () => {
      this.core.logger.debug(this.name, 'I observed the SDK start event.');
    });
  }

  // Lifecycle hook from BaseModule
  onStart() {
    this.core.logger.debug(this.name, 'SampleModule is running!');
  }
  
  onDestroy() {
    this.core.logger.debug(this.name, 'SampleModule is shutting down!');
  }

  // Custom module-specific API
  increment() {
    this.count++;
    this.core.events.emit('sample:incremented', { count: this.count });
    return this.count;
  }
  
  getCount() {
    return this.count;
  }
}
