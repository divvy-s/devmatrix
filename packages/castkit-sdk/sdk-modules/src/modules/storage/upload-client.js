function isBlobLike(data) {
  return typeof Blob !== 'undefined' && data instanceof Blob;
}

function isFileLike(data) {
  return typeof File !== 'undefined' && data instanceof File;
}

function isUint8ArrayLike(data) {
  return data instanceof Uint8Array;
}

function toErrorMessage(value, fallback) {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (value && typeof value === 'object' && typeof value.message === 'string') return value.message;
  return fallback;
}

async function parseUploadResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const fallback = `Storage upload failed with status ${response.status}.`;
    throw new Error(toErrorMessage(payload, fallback));
  }

  return payload;
}

function buildFileUploadPayload(network, data) {
  const formData = new FormData();
  formData.append('network', network);

  if (isUint8ArrayLike(data)) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    formData.append('file', blob, 'upload.bin');
    return formData;
  }

  const fileName = isFileLike(data) && data.name ? data.name : 'upload.bin';
  formData.append('file', data, fileName);
  return formData;
}

export async function uploadViaStorageApi(network, data, logger, signal) {
  const endpoint = '/api/castkit/storage/upload';

  logger.debug('StorageModule', `Uploading via server route (${network.toUpperCase()})`);

  let response;
  if (isBlobLike(data) || isUint8ArrayLike(data)) {
    response = await fetch(endpoint, {
      method: 'POST',
      body: buildFileUploadPayload(network, data),
      signal,
      cache: 'no-store'
    });
  } else {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network, data }),
      signal,
      cache: 'no-store'
    });
  }

  return parseUploadResponse(response);
}
