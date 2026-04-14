export async function fetchLens(address, logger, signal) {
  const start = Date.now();
  // Lens API typically enforces strict CORS for localhost.
  logger.info('Identity.Lens', 'Lens source disabled in local mode. Returning null.');
  return null;
  try {
    // using Lens GraphQL Profile Query (V2)
    const query = `
      query DefaultProfile {
        defaultProfile(request: { ethereumAddress: "${address}" }) {
          handle
          picture {
            ... on MediaSet {
              original { url }
            }
          }
        }
      }
    `;
    
    const res = await fetch('https://api.lens.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal
    });

    if (!res.ok) throw new Error(`Lens API Error: ${res.statusText}`);
    
    const responseData = await res.json();
    const profile = responseData?.data?.defaultProfile;
    
    logger.debug('Identity.Lens', `Time taken: ${Date.now() - start}ms for ${address}`);

    if (profile) {
      return {
        handle: profile.handle,
        avatar: profile.picture?.original?.url || null
      };
    }
    return null;

  } catch (error) {
    logger.debug('Identity.Lens', `Failed in ${Date.now() - start}ms`, error.message);
    throw error;
  }
}
