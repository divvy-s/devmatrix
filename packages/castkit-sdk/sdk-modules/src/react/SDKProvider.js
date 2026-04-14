'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import SDKCore from '../core/SDKCore.js';

const SDKContext = createContext(null);

export function SDKProvider({ children, config = {}, modules = [] }) {
  const [isReady, setIsReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);
  const sdkRef = useRef(null);

  useEffect(() => {
    let active = true;
    let unsubscribeErrorSink = null;

    async function initSDK() {
      if (!sdkRef.current) {
        // 1. Initialize Core
        const sdk = new SDKCore(config);
        sdkRef.current = sdk;

        // 2. Setup Global Error Catching
        unsubscribeErrorSink = sdk.events.on('global:error', (payload) => {
          if (active) {
            setSdkError({
              module: payload.module,
              message: payload.error?.message || String(payload.error)
            });
          }
        });

        // 3. Register plugins smoothly through indigenous Core pipeline
        await sdk.init(modules);
        if (!active) return;

        // 4. Start all engines!
        await sdk.start();
        
        if (active) {
          setIsReady(true);
        }
      }
    }

    initSDK().catch(err => {
      if (active) setSdkError({ module: 'SDKCore', message: err.message || String(err) });
      console.error('[SDKProvider] Initialization failed:', err);
    });

    // Cleanup & Kill AbortControllers on unmount
    return () => {
      active = false;
      if (unsubscribeErrorSink) unsubscribeErrorSink();
      if (sdkRef.current) {
        sdkRef.current.destroy().catch(console.error);
        sdkRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  return React.createElement(
    SDKContext.Provider,
    { value: { core: sdkRef.current, isReady, sdkError } },
    children
  );
}

export function useSDK() {
  const context = useContext(SDKContext);
  if (!context) throw new Error('useSDK must be used within an SDKProvider');
  return context;
}

export function useSDKModule(moduleName) {
  const { core, isReady } = useSDK();

  // 🛡️ THE SHIELD: Safe-guards against infinite React loops!
  if (!isReady || !core) return null;

  try {
    return core.getModule(moduleName);
  } catch (err) {
    console.error(`[SDK] Module Access Error:`, err);
    return null;
  }
}
