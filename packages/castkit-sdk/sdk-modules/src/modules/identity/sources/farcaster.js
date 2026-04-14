export async function fetchFarcaster(address, apiKey, logger, signal) {
  const start = Date.now();
  if (!apiKey) {
    logger.info('Identity.Farcaster', 'Neynar API key missing. Skipping Farcaster source.');
    return null;
  }
  
  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        api_key: apiKey
      },
      signal
    });

    if (!res.ok) throw new Error(`Neynar API Error: ${res.statusText}`);
    
    const data = await res.json();
    const user = data[address.toLowerCase()]?.[0];

    logger.info('Identity.Farcaster', `Lookup finished in ${Date.now() - start}ms`);

    if (user) {
      return {
        username: user.username,
        avatar: user.pfp_url
      };
    }
    return null;
  } catch (error) {
    logger.warn('Identity.Farcaster', `Lookup failed in ${Date.now() - start}ms`, error.message);
    throw error;
  }
}
