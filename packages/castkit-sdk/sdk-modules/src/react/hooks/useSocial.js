'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useSocial(options = {}) {
  const socialModule = useSDKModule('SocialModule');
  const [status, setStatus] = useState('idle');
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState(null);

  const loadFeed = useCallback(async (requestOptions = {}) => {
    if (!socialModule) {
      const missingError = new Error('SocialModule is not configured or SDK is not ready.');
      setError(missingError);
      setStatus('error');
      throw missingError;
    }

    try {
      setStatus('loading');
      setError(null);

      const result = await socialModule.getFeed({
        limit: requestOptions.limit || options.initialLimit || 20,
        enrichWithIdentity: requestOptions.enrichWithIdentity ?? options.enrichWithIdentity ?? true,
        cursorFarcaster: requestOptions.cursorFarcaster,
        cursorLens: requestOptions.cursorLens,
        identityChainId: requestOptions.identityChainId
      });

      setFeed(result);
      setStatus('ready');
      return result;
    } catch (requestError) {
      setError(requestError);
      setStatus('error');
      throw requestError;
    }
  }, [socialModule, options.initialLimit, options.enrichWithIdentity]);

  useEffect(() => {
    if (!socialModule || options.autoLoad === false) return;

    loadFeed().catch(() => {
      // Error state is handled by hook state.
    });
  }, [socialModule, options.autoLoad, loadFeed]);

  return {
    status,
    feed,
    posts: feed?.items || [],
    error,
    refresh: loadFeed,
    isReady: !!socialModule
  };
}
