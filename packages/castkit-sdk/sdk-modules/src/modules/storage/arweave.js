import { uploadViaStorageApi } from './upload-client.js';

export async function uploadToArweave(data, logger, signal) {
  logger.warn('StorageModule', 'Arweave backend disabled in pinata-only mode. Falling back to IPFS.');
  return uploadViaStorageApi('ipfs', data, logger, signal);
}
