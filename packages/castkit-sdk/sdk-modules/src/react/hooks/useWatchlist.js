'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useWatchlist() {
  const watchlistModule = useSDKModule('WatchlistModule');
  const [status, setStatus] = useState('idle');
  const [watches, setWatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!watchlistModule) return;
    setWatches(watchlistModule.listWatches());
    setAlerts(watchlistModule.getRecentAlerts(25));
  }, [watchlistModule]);

  const addWatch = useCallback(async (address, options = {}) => {
    if (!watchlistModule) {
      const err = new Error('WatchlistModule is not configured or SDK is not ready.');
      setError(err);
      throw err;
    }

    try {
      setError(null);
      const watch = await watchlistModule.addWatch(address, options);
      refresh();
      return watch;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [watchlistModule, refresh]);

  const removeWatch = useCallback(async (address, options = {}) => {
    if (!watchlistModule) return false;

    try {
      setError(null);
      const removed = await watchlistModule.removeWatch(address, options);
      refresh();
      return removed;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [watchlistModule, refresh]);

  const startMonitoring = useCallback(() => {
    if (!watchlistModule) return;
    watchlistModule.startMonitoring();
  }, [watchlistModule]);

  const stopMonitoring = useCallback(() => {
    if (!watchlistModule) return;
    watchlistModule.stopMonitoring();
  }, [watchlistModule]);

  const simulateAlert = useCallback(async (address, options = {}) => {
    if (!watchlistModule) return null;
    const result = await watchlistModule.simulateAlert(address, options);
    refresh();
    return result;
  }, [watchlistModule, refresh]);

  useEffect(() => {
    if (!watchlistModule || !watchlistModule.core) return;

    const events = watchlistModule.core.events;

    const unsubStatus = events.on('watchlist:status', (payload) => {
      if (payload?.status) {
        setStatus(payload.status);
      }
    });

    const unsubTx = events.on('watchlist:tx-detected', (payload) => {
      setAlerts((prev) => [payload, ...prev].slice(0, 25));
    });

    const unsubAdded = events.on('watchlist:watch-added', refresh);
    const unsubRemoved = events.on('watchlist:watch-removed', refresh);
    const unsubCleared = events.on('watchlist:watches-cleared', refresh);

    return () => {
      unsubStatus();
      unsubTx();
      unsubAdded();
      unsubRemoved();
      unsubCleared();
    };
  }, [watchlistModule, refresh]);

  return {
    status,
    watches,
    alerts,
    error,
    refresh,
    addWatch,
    removeWatch,
    startMonitoring,
    stopMonitoring,
    simulateAlert,
    isReady: !!watchlistModule
  };
}
