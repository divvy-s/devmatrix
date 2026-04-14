'use client';

import { useState, useCallback } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useTip(senderAddress) {
  const tipModule = useSDKModule('TipModule');
  
  // Transitions: idle -> resolving -> sending -> notifying -> recording -> confirmed -> failed
  const [status, setStatus] = useState('idle'); 
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  const tip = useCallback(async ({ to, amount, token, message, chainId }) => {
    if (!tipModule) {
      const err = new Error('TipModule is natively disabled in the SDK Provider mapping.');
      setError(err);
      setStatus('failed');
      throw err;
    }

    // Subscribe to internal transition signals explicitly
    const onStatusChange = (payload) => {
       setStatus(payload.status);
    };
    
    // Safely mapping unsubscription constraints native
    const unsubscribe = tipModule.core.events.on('tip:status', onStatusChange);

    try {
      setStatus('resolving');
      setError(null);
      
      const res = await tipModule.tip({ 
         to, 
         amount, 
         token, 
         message, 
         sender: senderAddress,
         chainId 
      });
      
      setReceipt(res);
      // Status naturally correctly binds to 'confirmed' natively handled directly by Event Bus triggers mapping bindings smoothly
      return res;
    } catch (err) {
      setError(err);
      // Status dynamically bound gracefully internally handled properly securely
      throw err;
    } finally {
      unsubscribe(); // Strict binding unsubscription executing native wipes
    }
  }, [tipModule, senderAddress]);

  const reset = useCallback(() => {
    setStatus('idle');
    setReceipt(null);
    setError(null);
  }, []);

  const fetchHistory = useCallback(async (address) => {
    if (!tipModule) return [];
    return tipModule.getHistory(address);
  }, [tipModule]);

  const fetchLeaderboard = useCallback(async () => {
    if (!tipModule) return [];
    return tipModule.getLeaderboard();
  }, [tipModule]);

  return {
    tip,
    status,
    receipt,
    error,
    reset,
    fetchHistory,
    fetchLeaderboard,
    isReady: !!tipModule
  };
}
