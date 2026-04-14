'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useIdentity(addressToResolve) {
  const identityModule = useSDKModule('IdentityModule');
  
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'resolved' | 'partial' | 'error'
  const [identity, setIdentity] = useState(null);
  const [error, setError] = useState(null);

  const resolve = useCallback(async (address) => {
    if (!identityModule) return;
    if (!address) return;

    try {
      setStatus('loading');
      setError(null);
      
      const res = await identityModule.resolve(address);
      setIdentity(res);
      setStatus(res.hasPartialFailures ? 'partial' : 'resolved');
      
      return res;
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [identityModule]);

  // Optionally auto-resolve when address changes
  useEffect(() => {
    if (addressToResolve) {
       resolve(addressToResolve);
    }
  }, [addressToResolve, resolve]);

  const refresh = useCallback(() => {
    if (addressToResolve) {
       return resolve(addressToResolve);
    }
  }, [resolve, addressToResolve]);

  return { identity, status, error, refresh };
}
