'use client';

import { useState, useCallback } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useStorage() {
  const storageModule = useSDKModule('StorageModule');
  
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'pinning' | 'confirmed' | 'failed'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const upload = useCallback(async (data, options = {}) => {
    if (!storageModule) {
      const err = new Error('StorageModule is not configured or SDK is missing completely.');
      setError(err);
      setStatus('failed');
      throw err;
    }

    try {
      setStatus('uploading');
      setError(null);
      
      // Could theoretically bind 'storage:pinning' inside a listener if bridging to websockets,
      // but synchronously await relay execution status directly:
      const receipt = await storageModule.upload(data, options);
      
      setResult(receipt);
      setStatus('confirmed');
      
      return receipt;
    } catch (err) {
      setError(err);
      setStatus('failed');
      throw err;
    }
  }, [storageModule]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    upload,
    status,
    result,
    error,
    reset,
    isReady: !!storageModule // Hook readiness based on context fetch logic
  };
}
