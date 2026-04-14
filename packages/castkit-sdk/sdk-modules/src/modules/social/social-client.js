function toMessage(payload, fallback) {
  if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
    return payload.error;
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallback;
}

export async function fetchSocialFeedPayload(options = {}) {
  const {
    endpoint = '/api/castkit/social/feed',
    limit = 20,
    cursorFarcaster,
    cursorLens,
    signal
  } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursorFarcaster) params.set('cursorFarcaster', String(cursorFarcaster));
  if (cursorLens) params.set('cursorLens', String(cursorLens));

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(toMessage(payload, `Social feed request failed with status ${response.status}.`));
  }

  return payload;
}
