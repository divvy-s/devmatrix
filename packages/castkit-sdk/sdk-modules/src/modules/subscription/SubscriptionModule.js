import {
  encodeFunctionData,
  getAddress,
  isAddress,
  isHex,
  padHex,
  parseUnits,
  stringToHex
} from 'viem';
import BaseModule from '../../interfaces/BaseModule.js';
import { subscriptionContractAbi } from './abi.js';
import {
  SubscriptionConfigError,
  SubscriptionInvalidAddressError,
  SubscriptionTestnetOnlyError
} from './errors.js';
import {
  fetchSubscriptionStatus,
  triggerSubscriptionCollect
} from './subscription-client.js';

const BASE_SEPOLIA_CHAIN_ID = 84532;
const DEFAULT_PLAN_ID = 'castkit-demo-monthly';
const DEFAULT_STATUS_ENDPOINT = '/api/castkit/subscription/status';
const DEFAULT_COLLECT_ENDPOINT = '/api/castkit/subscription/collect';

const erc20ApproveAbi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  }
];

function normalizePlanId(planId) {
  const raw = String(planId || DEFAULT_PLAN_ID).trim();

  if (isHex(raw, { strict: true })) {
    if (raw.length !== 66) {
      throw new SubscriptionConfigError('planId hex must be exactly 32 bytes (66 chars with 0x).');
    }
    return raw;
  }

  const encoded = stringToHex(raw);
  if (encoded.length > 66) {
    throw new SubscriptionConfigError('planId string is too long. Keep it at 32 bytes or less.');
  }

  return padHex(encoded, { size: 32 });
}

function normalizeAmountToBaseUnits(amount, decimals) {
  try {
    return parseUnits(String(amount), decimals);
  } catch {
    throw new SubscriptionConfigError(`Invalid token amount: ${amount}`);
  }
}

export class SubscriptionModule extends BaseModule {
  get name() {
    return 'SubscriptionModule';
  }

  async onInit() {
    const chainId = Number(this.options.chainId || BASE_SEPOLIA_CHAIN_ID);
    this._assertTestnet(chainId);

    this.chainId = chainId;
    this.statusEndpoint = this.options.statusEndpoint || DEFAULT_STATUS_ENDPOINT;
    this.collectEndpoint = this.options.collectEndpoint || DEFAULT_COLLECT_ENDPOINT;

    this.core.logger.info(
      this.name,
      `Subscription module initialized in strict testnet mode on chain ${this.chainId}.`
    );
  }

  _assertTestnet(chainId) {
    const numeric = Number(chainId);
    if (numeric !== BASE_SEPOLIA_CHAIN_ID) {
      throw new SubscriptionTestnetOnlyError(chainId);
    }
  }

  _resolvePlanId(planId) {
    return normalizePlanId(planId || this.options.planId || process.env.NEXT_PUBLIC_CASTKIT_SUBSCRIPTION_PLAN_ID || DEFAULT_PLAN_ID);
  }

  _resolveContractAddress() {
    const raw = this.options.contractAddress || process.env.NEXT_PUBLIC_CASTKIT_SUBSCRIPTION_CONTRACT_ADDRESS;
    if (!raw || !isAddress(raw)) {
      throw new SubscriptionConfigError(
        'Subscription contract address is missing or invalid. Set NEXT_PUBLIC_CASTKIT_SUBSCRIPTION_CONTRACT_ADDRESS.'
      );
    }

    return getAddress(raw);
  }

  _resolveUsdcAddress() {
    const raw = this.options.usdcAddress || process.env.NEXT_PUBLIC_CASTKIT_SUBSCRIPTION_USDC_ADDRESS;
    if (!raw || !isAddress(raw)) {
      throw new SubscriptionConfigError(
        'Testnet USDC token address is missing or invalid. Set NEXT_PUBLIC_CASTKIT_SUBSCRIPTION_USDC_ADDRESS.'
      );
    }

    return getAddress(raw);
  }

  async getStatus({ subscriber, planId, chainId } = {}) {
    this._assertTestnet(chainId || this.chainId || this.core.chainId);

    if (!isAddress(subscriber || '')) {
      throw new SubscriptionInvalidAddressError(subscriber);
    }

    const normalizedSubscriber = getAddress(subscriber);
    const resolvedPlanId = this._resolvePlanId(planId);

    this.core.events.emit('subscription:status-started', {
      subscriber: normalizedSubscriber,
      planId: resolvedPlanId
    });

    try {
      const payload = await fetchSubscriptionStatus({
        endpoint: this.statusEndpoint,
        subscriber: normalizedSubscriber,
        planId: resolvedPlanId,
        signal: this.controller.signal
      });

      this.core.events.emit('subscription:status-success', payload);
      return payload;
    } catch (error) {
      this.core.events.emit('subscription:status-failed', error);
      throw error;
    }
  }

  async hasAccess({ subscriber, planId, chainId } = {}) {
    const status = await this.getStatus({ subscriber, planId, chainId });
    return Boolean(status?.active);
  }

  async collectDue({ subscriber, planId, keeperSecret, chainId } = {}) {
    this._assertTestnet(chainId || this.chainId || this.core.chainId);

    if (!isAddress(subscriber || '')) {
      throw new SubscriptionInvalidAddressError(subscriber);
    }

    const normalizedSubscriber = getAddress(subscriber);
    const resolvedPlanId = this._resolvePlanId(planId);

    this.core.events.emit('subscription:collect-started', {
      subscriber: normalizedSubscriber,
      planId: resolvedPlanId
    });

    try {
      const payload = await triggerSubscriptionCollect({
        endpoint: this.collectEndpoint,
        subscriber: normalizedSubscriber,
        planId: resolvedPlanId,
        keeperSecret,
        signal: this.controller.signal
      });

      this.core.events.emit('subscription:collect-success', payload);
      return payload;
    } catch (error) {
      this.core.events.emit('subscription:collect-failed', error);
      throw error;
    }
  }

  buildSubscribeTx({ planId, chainId } = {}) {
    this._assertTestnet(chainId || this.chainId || this.core.chainId);

    const address = this._resolveContractAddress();
    const planIdHex = this._resolvePlanId(planId);

    return {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      to: address,
      value: '0x0',
      data: encodeFunctionData({
        abi: subscriptionContractAbi,
        functionName: 'subscribe',
        args: [planIdHex]
      }),
      functionName: 'subscribe',
      args: [planIdHex]
    };
  }

  buildCancelTx({ planId, chainId } = {}) {
    this._assertTestnet(chainId || this.chainId || this.core.chainId);

    const address = this._resolveContractAddress();
    const planIdHex = this._resolvePlanId(planId);

    return {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      to: address,
      value: '0x0',
      data: encodeFunctionData({
        abi: subscriptionContractAbi,
        functionName: 'cancel',
        args: [planIdHex]
      }),
      functionName: 'cancel',
      args: [planIdHex]
    };
  }

  buildCollectTx({ subscriber, planId, chainId } = {}) {
    this._assertTestnet(chainId || this.chainId || this.core.chainId);

    if (!isAddress(subscriber || '')) {
      throw new SubscriptionInvalidAddressError(subscriber);
    }

    const address = this._resolveContractAddress();
    const normalizedSubscriber = getAddress(subscriber);
    const planIdHex = this._resolvePlanId(planId);

    return {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      to: address,
      value: '0x0',
      data: encodeFunctionData({
        abi: subscriptionContractAbi,
        functionName: 'collect',
        args: [planIdHex, normalizedSubscriber]
      }),
      functionName: 'collect',
      args: [planIdHex, normalizedSubscriber]
    };
  }

  buildApproveTx({ amount, decimals = 6, spender, chainId } = {}) {
    this._assertTestnet(chainId || this.chainId || this.core.chainId);

    const usdcAddress = this._resolveUsdcAddress();
    const spenderAddress = spender && isAddress(spender)
      ? getAddress(spender)
      : this._resolveContractAddress();

    const parsedAmount = normalizeAmountToBaseUnits(amount || '0', Number(decimals));

    return {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      to: usdcAddress,
      value: '0x0',
      data: encodeFunctionData({
        abi: erc20ApproveAbi,
        functionName: 'approve',
        args: [spenderAddress, parsedAmount]
      }),
      functionName: 'approve',
      args: [spenderAddress, parsedAmount.toString()]
    };
  }
}
