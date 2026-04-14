import BaseModule from '../../interfaces/BaseModule.js';
import { explainStorageStrategy } from './strategy.js';
import { validateMetadata, MissingMetadataFieldError } from './validate.js';
import { uploadToIPFS } from './ipfs.js';

const VALID_NETWORKS = new Set(['ipfs', 'arweave']);

export class StorageModule extends BaseModule {
  get name() {
    return 'StorageModule';
  }

  async onInit() {
    this.core.logger.info(this.name, 'Storage Module initialized constraints and strategies.');
  }

  /**
   * Main abstraction for generic auto-routed uploads
   */
  async upload(data, options = {}) {
    this.core.logger.debug(this.name, 'Processing upload request', {
      dataType: this._getPayloadType(data),
      estimatedSizeBytes: this._estimatePayloadSize(data)
    });
    this.core.events.emit('storage:upload-started', { data });

    try {
      // 1. Structural Validation heuristics safely applied
      if (this._looksLikeMetadata(data)) {
        try {
          const metadataValidation = validateMetadata(data, {
            strict: options.strictMetadata === true
          });

          if (!metadataValidation.isValid) {
            this.core.logger.warn(
              this.name,
              `Metadata validation warning: missing ${metadataValidation.missingFields.join(', ')}`
            );
          }
        } catch (e) {
          if (e instanceof MissingMetadataFieldError) {
            this.core.logger.warn(this.name, e.message);
          } else {
             throw e;
          }
        }
      }

      // 2. Decide storage strategy logic
      const forcedNetwork = this._normalizeForceNetwork(options.forceNetwork);
      const strategy = forcedNetwork
        ? { network: forcedNetwork, reason: 'Forced by options.forceNetwork' }
        : explainStorageStrategy(data, options);

      const requestedNetwork = strategy.network;
      const effectiveNetwork = 'ipfs';

      this.core.logger.info(this.name, `Selected storage network: ${requestedNetwork.toUpperCase()} (${strategy.reason})`);
      if (requestedNetwork !== 'ipfs') {
        this.core.logger.warn(
          this.name,
          `Pinata-only mode is enabled. Using IPFS instead of requested ${requestedNetwork.toUpperCase()}.`
        );
      }

      // 3. Delegation dispatch (Pinata/IPFS only)
      const uploadReceipt = await uploadToIPFS(data, this.core.logger, this.controller.signal);

      const formattedReceipt = {
        ...uploadReceipt,
        network: effectiveNetwork,
        requestedNetwork,
        strategyReason: strategy.reason
      };

      this.core.logger.info(this.name, 'Upload totally successful!', formattedReceipt);
      this.core.events.emit('storage:upload-success', formattedReceipt);
      
      return formattedReceipt;

    } catch (error) {
      this.core.logger.error(this.name, 'Upload failed during processing pipeline', error);
      this.core.events.emit('storage:upload-failed', error);
      throw error;
    }
  }

  // Type guard utility
  _looksLikeMetadata(data) {
    return !!data
      && typeof data === 'object'
      && !data.size
      && ('name' in data || 'description' in data || 'image' in data);
  }

  _normalizeForceNetwork(forceNetwork) {
    if (!forceNetwork) return null;

    const normalized = String(forceNetwork).toLowerCase().trim();
    if (!VALID_NETWORKS.has(normalized)) {
      throw new Error(`Invalid forceNetwork value: ${forceNetwork}. Use "ipfs" or "arweave".`);
    }

    return normalized;
  }

  _getPayloadType(data) {
    if (typeof Blob !== 'undefined' && data instanceof Blob) return 'blob';
    if (data && typeof data === 'object' && !Array.isArray(data)) return 'object';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }

  _estimatePayloadSize(data) {
    try {
      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        return data.size;
      }

      const text = JSON.stringify(data);
      return typeof text === 'string' ? text.length : 0;
    } catch {
      return 0;
    }
  }
}
