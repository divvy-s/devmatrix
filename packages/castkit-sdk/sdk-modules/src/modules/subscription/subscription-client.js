function toMessage(payload, fallback) {
  if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
    return payload.error;
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallback;
}

export async function fetchSubscriptionStatus(options = {}) {
  const {
    endpoint = '/api/castkit/subscription/status',
    subscriber,
    planId,
    signal
  } = options;

  if (!subscriber) {
    throw new Error('fetchSubscriptionStatus requires a subscriber address.');
  }

  const params = new URLSearchParams();
  params.set('subscriber', String(subscriber));
  if (planId) params.set('planId', String(planId));

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
    throw new Error(toMessage(payload, `Subscription status request failed with status ${response.status}.`));
  }

  return payload;
}

export async function triggerSubscriptionCollect(options = {}) {
  const {
    endpoint = '/api/castkit/subscription/collect',
    subscriber,
    planId,
    keeperSecret,
    signal
  } = options;

  if (!subscriber) {
    throw new Error('triggerSubscriptionCollect requires a subscriber address.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    cache: 'no-store',
    signal,
    headers: {
      'content-type': 'application/json',
      ...(keeperSecret ? { 'x-castkit-keeper-secret': keeperSecret } : {})
    },
    body: JSON.stringify({
      subscriber,
      planId: planId || null
    })
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(toMessage(payload, `Subscription collect request failed with status ${response.status}.`));
  }

  return payload;
}
