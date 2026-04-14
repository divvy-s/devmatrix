import { createPublicClient, formatEther, http } from 'viem';
import BaseModule from '../../interfaces/BaseModule.js';
import { InvalidWatchAddressError, WatchlistNotInitializedError } from './errors.js';

const WATCH_STATUS = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  WATCHING: 'watching',
  STOPPED: 'stopped'
};

function isValidEthAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export class WatchlistModule extends BaseModule {
  constructor(options = {}) {
    super(options);
    this.watchers = new Map();
    this.clients = new Map();
    this.alertHistory = [];
    this.timer = null;
    this.isTicking = false;

    this.pollIntervalMs = Math.max(4000, Number(options.pollIntervalMs || 12000));
    this.maxBlocksPerTick = Math.max(1, Number(options.maxBlocksPerTick || 20));
    this.maxAlertHistory = Math.max(10, Number(options.maxAlertHistory || 100));
    this.notifyTransport = options.notifyTransport;
    this.notifyModuleName = options.notifyModuleName || 'NotifyModule';
    this.useRpcProxy = options.useRpcProxy !== false;
    this.rpcProxyPath = options.rpcProxyPath || '/api/castkit/rpc';

    this.lastTickError = null;
    this.tickErrorRepeatCount = 0;
  }

  get name() {
    return 'WatchlistModule';
  }

  async onInit() {
    this.core.logger.info(this.name, 'Watchlist module initialized and ready for wallet monitoring.');
  }

  async onStart() {
    this.startMonitoring();
  }

  async onDestroy() {
    this.stopMonitoring();
    this.controller.abort();
    this.watchers.clear();
    this.clients.clear();
  }

  startMonitoring() {
    if (this.timer) return;

    this.core.logger.info(this.name, `Starting wallet monitor loop at ${this.pollIntervalMs}ms interval.`);
    this.core.events.emit('watchlist:status', { status: WATCH_STATUS.WATCHING });

    this.timer = setInterval(() => {
      this.tick();
    }, this.pollIntervalMs);

    this.tick();
  }

  stopMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.core?.events?.emit('watchlist:status', { status: WATCH_STATUS.STOPPED });
  }

  setPollInterval(pollIntervalMs) {
    this.pollIntervalMs = Math.max(4000, Number(pollIntervalMs || 12000));
    if (this.timer) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  addWatch(address, options = {}) {
    this._assertInitialized();

    if (!isValidEthAddress(address)) {
      throw new InvalidWatchAddressError(address);
    }

    const normalizedAddress = address.toLowerCase();
    const chainId = Number(options.chainId || this.core.chainId);
    const key = this._watchKey(chainId, normalizedAddress);

    const existing = this.watchers.get(key);
    const watch = existing || {
      key,
      address: normalizedAddress,
      chainId,
      label: options.label || null,
      notifyTo: options.notifyTo || normalizedAddress,
      lastProcessedBlock: null,
      seenTxHashes: []
    };

    if (existing) {
      watch.label = options.label || watch.label;
      watch.notifyTo = options.notifyTo || watch.notifyTo;
    }

    this.watchers.set(key, watch);
    this.core.logger.info(this.name, `Added watch for ${normalizedAddress} on chain ${chainId}`);
    this.core.events.emit('watchlist:watch-added', this._serializeWatch(watch));

    return this._serializeWatch(watch);
  }

  removeWatch(address, options = {}) {
    this._assertInitialized();

    if (!isValidEthAddress(address)) {
      throw new InvalidWatchAddressError(address);
    }

    const normalizedAddress = address.toLowerCase();
    const chainId = Number(options.chainId || this.core.chainId);
    const key = this._watchKey(chainId, normalizedAddress);
    const existing = this.watchers.get(key);

    if (!existing) return false;

    this.watchers.delete(key);
    this.core.logger.info(this.name, `Removed watch for ${normalizedAddress} on chain ${chainId}`);
    this.core.events.emit('watchlist:watch-removed', { key, address: normalizedAddress, chainId });
    return true;
  }

  listWatches() {
    return [...this.watchers.values()].map((watch) => this._serializeWatch(watch));
  }

  clearWatches() {
    this.watchers.clear();
    this.core.events.emit('watchlist:watches-cleared');
  }

  getRecentAlerts(limit = 25) {
    return this.alertHistory.slice(0, Math.max(1, Number(limit || 25)));
  }

  async simulateAlert(address, options = {}) {
    if (!isValidEthAddress(address)) {
      throw new InvalidWatchAddressError(address);
    }

    const chainId = Number(options.chainId || this.core.chainId);
    const normalizedAddress = address.toLowerCase();
    const now = Date.now();
    const randomSuffix = Math.random().toString(16).slice(2, 10);
    const alert = {
      kind: 'simulated-native-transfer',
      isSimulated: true,
      direction: options.direction || 'incoming',
      address: normalizedAddress,
      counterparty: options.counterparty || '0x0000000000000000000000000000000000000000',
      amountEth: String(options.amountEth || '0.001'),
      txHash: `simulated_${now}_${randomSuffix}`,
      chainId,
      blockNumber: Number(options.blockNumber || 0),
      timestamp: Math.floor(now / 1000)
    };

    await this._pushAlert(alert, {
      key: this._watchKey(chainId, normalizedAddress),
      address: normalizedAddress,
      chainId,
      label: options.label || null,
      notifyTo: options.notifyTo || normalizedAddress
    });

    return alert;
  }

  async tick() {
    if (!this.core || this.isTicking) return;

    if (this.watchers.size === 0) {
      this.core.events.emit('watchlist:status', { status: WATCH_STATUS.IDLE });
      return;
    }

    this.isTicking = true;
    this.core.events.emit('watchlist:status', { status: WATCH_STATUS.SCANNING });

    try {
      const watches = [...this.watchers.values()];
      for (const watch of watches) {
        await this._scanWatch(watch);
      }

      this._clearTickErrorState();
      this.core.events.emit('watchlist:status', { status: WATCH_STATUS.WATCHING });
    } catch (error) {
      this._reportTickError(error);
    } finally {
      this.isTicking = false;
    }
  }

  async _scanWatch(watch) {
    const client = this._getClient(watch.chainId);
    const latestBlock = await client.getBlockNumber();

    if (watch.lastProcessedBlock === null) {
      watch.lastProcessedBlock = latestBlock;
      return;
    }

    if (latestBlock <= watch.lastProcessedBlock) return;

    const fromBlock = watch.lastProcessedBlock + 1n;
    const maxScanTo = fromBlock + BigInt(this.maxBlocksPerTick - 1);
    const toBlock = maxScanTo < latestBlock ? maxScanTo : latestBlock;

    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
      if (this.controller.signal.aborted) return;

      const block = await client.getBlock({
        blockNumber,
        includeTransactions: true
      });

      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;

        const from = tx.from?.toLowerCase();
        const to = tx.to?.toLowerCase();
        const txHash = tx.hash?.toLowerCase();
        const involved = from === watch.address || to === watch.address;

        if (!involved || !txHash) continue;
        if (watch.seenTxHashes.includes(txHash)) continue;

        watch.seenTxHashes.push(txHash);
        if (watch.seenTxHashes.length > 200) {
          watch.seenTxHashes.shift();
        }

        const direction = from === watch.address && to === watch.address
          ? 'self'
          : to === watch.address
            ? 'incoming'
            : 'outgoing';

        const alert = {
          kind: 'native-transfer',
          direction,
          address: watch.address,
          counterparty: direction === 'incoming' ? from : to,
          amountEth: formatEther(tx.value || 0n),
          valueWei: String(tx.value || 0n),
          txHash: tx.hash,
          chainId: watch.chainId,
          blockNumber: Number(block.number),
          timestamp: Number(block.timestamp)
        };

        await this._pushAlert(alert, watch);
      }
    }

    watch.lastProcessedBlock = toBlock;
  }

  async _pushAlert(alert, watch) {
    const payload = {
      ...alert,
      watch: {
        key: watch.key,
        address: watch.address,
        chainId: watch.chainId,
        label: watch.label,
        notifyTo: watch.notifyTo
      }
    };

    this.alertHistory.unshift(payload);
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory.pop();
    }

    this.core.events.emit('watchlist:tx-detected', payload);
    this.core.logger.info(
      this.name,
      `Watch alert ${alert.direction}: ${alert.amountEth} ETH for ${watch.address} on chain ${watch.chainId}`
    );

    await this._sendNotification(payload, watch.notifyTo);
  }

  async _sendNotification(alertPayload, notifyTo) {
    const text = this._formatNotificationText(alertPayload);

    if (typeof this.notifyTransport === 'function') {
      try {
        await this.notifyTransport({ to: notifyTo, message: text, alert: alertPayload });
        this.core.events.emit('watchlist:alert-sent', { to: notifyTo, txHash: alertPayload.txHash });
        return;
      } catch (error) {
        this.core.logger.warn(this.name, 'Custom notify transport failed', error.message || String(error));
      }
    }

    try {
      const notifyModule = this.core.getModule(this.notifyModuleName);
      if (notifyModule?.send) {
        await notifyModule.send({ to: notifyTo, message: text, payload: alertPayload });
        this.core.events.emit('watchlist:alert-sent', { to: notifyTo, txHash: alertPayload.txHash });
      }
    } catch {
      this.core.logger.info(this.name, 'NotifyModule not configured. Alert emitted via EventBus only.');
    }
  }

  _formatNotificationText(alert) {
    const directionLabel = alert.direction === 'incoming'
      ? 'received'
      : alert.direction === 'outgoing'
        ? 'sent'
        : 'moved';

    return `Watchlist alert: ${alert.watch.address} ${directionLabel} ${alert.amountEth} ETH on chain ${alert.chainId}. Tx: ${alert.txHash}`;
  }

  _getClient(chainId) {
    const key = String(chainId);
    if (this.clients.has(key)) {
      return this.clients.get(key);
    }

    const rpcUrl = this.core.getRpc(chainId);
    const isBrowser = typeof window !== 'undefined';
    const transport = isBrowser && this.useRpcProxy
      ? http(this.rpcProxyPath, {
          fetchOptions: {
            signal: this.controller.signal,
            headers: {
              'x-castkit-rpc-url': rpcUrl
            }
          }
        })
      : http(rpcUrl, { fetchOptions: { signal: this.controller.signal } });

    const client = createPublicClient({
      transport
    });

    this.clients.set(key, client);
    return client;
  }

  _watchKey(chainId, address) {
    return `${chainId}:${address.toLowerCase()}`;
  }

  _serializeWatch(watch) {
    return {
      key: watch.key,
      address: watch.address,
      chainId: watch.chainId,
      label: watch.label,
      notifyTo: watch.notifyTo,
      lastProcessedBlock: watch.lastProcessedBlock !== null ? String(watch.lastProcessedBlock) : null
    };
  }

  _assertInitialized() {
    if (!this.core) {
      throw new WatchlistNotInitializedError();
    }
  }

  _reportTickError(error) {
    const message = error?.message || String(error);

    if (this.lastTickError === message) {
      this.tickErrorRepeatCount += 1;
      if (this.tickErrorRepeatCount % 5 !== 0) {
        return;
      }
    } else {
      this.lastTickError = message;
      this.tickErrorRepeatCount = 1;
    }

    this.core.logger.warn(this.name, 'Watchlist tick failed', message);
  }

  _clearTickErrorState() {
    this.lastTickError = null;
    this.tickErrorRepeatCount = 0;
  }
}
