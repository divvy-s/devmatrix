'use client';

import { useCallback, useState } from 'react';
import { useSDKModule } from '../SDKProvider.js';

export function useSubscription(options = {}) {
  const subscriptionModule = useSDKModule('SubscriptionModule');
  const [status, setStatus] = useState('idle');
  const [subscription, setSubscription] = useState(null);
  const [collectReceipt, setCollectReceipt] = useState(null);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async ({ subscriber, planId } = {}) => {
    if (!subscriptionModule) {
      const err = new Error('SubscriptionModule is not configured or SDK is not ready.');
      setError(err);
      setStatus('error');
      throw err;
    }

    try {
      setStatus('loading');
      setError(null);

      const result = await subscriptionModule.getStatus({
        subscriber,
        planId: planId || options.planId
      });

      setSubscription(result);
      setStatus('ready');
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [subscriptionModule, options.planId]);

  const collectDue = useCallback(async ({ subscriber, planId, keeperSecret } = {}) => {
    if (!subscriptionModule) {
      const err = new Error('SubscriptionModule is not configured or SDK is not ready.');
      setError(err);
      setStatus('error');
      throw err;
    }

    try {
      setStatus('collecting');
      setError(null);

      const receipt = await subscriptionModule.collectDue({
        subscriber,
        planId: planId || options.planId,
        keeperSecret
      });

      setCollectReceipt(receipt);
      setStatus('collected');
      return receipt;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [subscriptionModule, options.planId]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSubscription(null);
    setCollectReceipt(null);
    setError(null);
  }, []);

  return {
    status,
    subscription,
    collectReceipt,
    error,
    checkStatus,
    collectDue,
    buildSubscribeTx: (args) => subscriptionModule?.buildSubscribeTx(args),
    buildCancelTx: (args) => subscriptionModule?.buildCancelTx(args),
    buildApproveTx: (args) => subscriptionModule?.buildApproveTx(args),
    buildCollectTx: (args) => subscriptionModule?.buildCollectTx(args),
    reset,
    isReady: !!subscriptionModule
  };
}
