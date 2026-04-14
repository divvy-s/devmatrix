import { uploadViaStorageApi } from './upload-client.js';

export async function uploadToIPFS(data, logger, signal) {
  return uploadViaStorageApi('ipfs', data, logger, signal);
}
