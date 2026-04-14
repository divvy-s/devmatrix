'use client';

import { useState, useCallback } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useIdentityBatch() {
  const identityModule = useSDKModule('IdentityModule');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'resolved' | 'partial' | 'error'
  const [identities, setIdentities] = useState({}); // Record<string, IdentityResult>
  const [error, setError] = useState(null);

  const resolveBatch = useCallback(async (addresses = []) => {
    if (!identityModule) return;
    if (!addresses.length) return;

    try {
      setStatus('loading');
      setError(null);
      
      const results = await identityModule.resolveMany(addresses);
      
      const map = {};
      let hasErrors = false;
      let hasPartial = false;

      results.forEach(res => {
         // res is either standard data OR {address, error} based on mapping fallback
         if (res.error) {
             hasErrors = true;
         } else {
             map[res.address] = res; // It's normalized internally
             if (res.hasPartialFailures) hasPartial = true;
         }
      });

      setIdentities(prev => ({ ...prev, ...map }));
      
      if (hasErrors) {
         setStatus('error');
      } else if (hasPartial) {
         setStatus('partial');
      } else {
         setStatus('resolved');
      }

      return map;
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [identityModule]);

  return { identities, status, error, resolveBatch };
}
