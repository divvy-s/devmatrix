export async function recordTip(relayUrl, tipData, logger, signal) {
  if (!relayUrl) return; // Silent fallback if no relay mapped in layout configs
  
  logger.debug('TipModule', 'Recording tip telemetry to db-relay...');
  try {
    const res = await fetch(`${relayUrl}/tip`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(tipData),
       signal
    });
    if (!res.ok) throw new Error(`Relay recording failed: ${res.statusText}`);
  } catch (err) {
    logger.warn('TipModule', 'Failed to seamlessly record tip across db-relay', err.message);
  }
}

export async function getTipHistory(relayUrl, address, logger, signal) {
  if (!relayUrl) return [];
  try {
    const res = await fetch(`${relayUrl}/tip/history?address=${address}`, { signal });
    return (await res.json())?.data || [];
  } catch (err) {
    logger.warn('TipModule', 'Failed to seamlessly fetch history across db-relay', err.message);
    return [];
  }
}

export async function getCreatorLeaderboard(relayUrl, logger, signal) {
  if (!relayUrl) return [];
  try {
    const res = await fetch(`${relayUrl}/tip/leaderboard`, { signal });
    return (await res.json())?.data || [];
  } catch (err) {
    logger.warn('TipModule', 'Failed to seamlessly fetch leaderboards across db-relay', err.message);
    return [];
  }
}
