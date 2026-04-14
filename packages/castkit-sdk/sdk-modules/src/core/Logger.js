/**
 * Shared Logger service.
 */
export default class Logger {
  constructor(level = 'info', isServer = false) {
    this.level = level;
    this.levels = { debug: 1, info: 2, warn: 3, error: 4 };
    this.isServer = isServer;
  }

  setLevel(level) {
    if (this.levels[level]) {
      this.level = level;
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  _log(level, namespace, message, args) {
    if (!this.shouldLog(level)) return;

    const prefixMatch = `[SDK] [TESTNET MODE ACTIVE] [${namespace}]`;
    
    if (this.isServer) {
      console[level](prefixMatch, message, ...args);
    } else {
      // Client-side styled logs
      const colors = {
        debug: 'color: #888888; font-weight: bold;',
        info: 'color: #0070f3; font-weight: bold;',
        warn: 'color: #f5a623; font-weight: bold;',
        error: 'color: #ee0000; font-weight: bold;'
      };
      console[level](`%c${prefixMatch}`, colors[level], message, ...args);
    }
  }

  debug(namespace, message, ...args) {
    this._log('debug', namespace, message, args);
  }

  info(namespace, message, ...args) {
    this._log('info', namespace, message, args);
  }

  warn(namespace, message, ...args) {
    this._log('warn', namespace, message, args);
  }

  error(namespace, message, ...args) {
    this._log('error', namespace, message, args);
  }
}
