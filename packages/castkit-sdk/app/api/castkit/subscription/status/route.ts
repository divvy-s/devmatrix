import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHex,
  padHex,
  stringToHex
} from 'viem';
import { baseSepolia } from 'viem/chains';

export const runtime = 'nodejs';

const BASE_SEPOLIA_CHAIN_ID = 84532;
const DEFAULT_PLAN_ID = 'castkit-demo-monthly';

const subscriptionAbi = [
  {
    type: 'function',
    name: 'isSubscriptionActive',
    stateMutability: 'view',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'active', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'nextChargeAt',
    stateMutability: 'view',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'timestamp', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastPaidAt',
    stateMutability: 'view',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'timestamp', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'getPlan',
    stateMutability: 'view',
    inputs: [{ name: 'planId', type: 'bytes32' }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'intervalSeconds', type: 'uint256' },
      { name: 'treasury', type: 'address' },
      { name: 'enabled', type: 'bool' }
    ]
  }
] as const;

function ensureTestnetOnly() {
  const configured = Number(process.env.CASTKIT_SUBSCRIPTION_CHAIN_ID || BASE_SEPOLIA_CHAIN_ID);
  if (configured !== BASE_SEPOLIA_CHAIN_ID) {
    throw new Error('Subscription routes are locked to Base Sepolia (84532).');
  }
}

function resolveRpcUrl() {
  return (
    process.env.CASTKIT_SUBSCRIPTION_RPC_URL ||
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
    ''
  ).trim();
}

function resolveContractAddress() {
  const raw = (process.env.CASTKIT_SUBSCRIPTION_CONTRACT_ADDRESS || '').trim();
  if (!isAddress(raw)) {
    throw new Error('CASTKIT_SUBSCRIPTION_CONTRACT_ADDRESS is missing or invalid.');
  }

  return getAddress(raw);
}

function normalizePlanId(rawPlanId: string | null) {
  const source =
    rawPlanId?.trim() ||
    process.env.CASTKIT_SUBSCRIPTION_PLAN_ID?.trim() ||
    process.env.NEXT_PUBLIC_CASTKIT_SUBSCRIPTION_PLAN_ID?.trim() ||
    DEFAULT_PLAN_ID;

  if (isHex(source, { strict: true })) {
    if (source.length !== 66) {
      throw new Error('planId hex must be exactly 32 bytes.');
    }
    return source as `0x${string}`;
  }

  const encoded = stringToHex(source);
  if (encoded.length > 66) {
    throw new Error('planId string is too long. Keep plan ids to 32 bytes or less.');
  }

  return padHex(encoded, { size: 32 }) as `0x${string}`;
}

async function readOrNull<T>(reader: () => Promise<T>): Promise<T | null> {
  try {
    return await reader();
  } catch {
    return null;
  }
}

function bigintToNumberOrNull(value: bigint | null) {
  if (value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function secondsToIsoOrNull(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    ensureTestnetOnly();

    const subscriberRaw = request.nextUrl.searchParams.get('subscriber');
    if (!isAddress(subscriberRaw || '')) {
      return NextResponse.json(
        { error: 'subscriber query param must be a valid EVM address.' },
        { status: 400 }
      );
    }

    const rpcUrl = resolveRpcUrl();
    if (!rpcUrl) {
      return NextResponse.json(
        { error: 'Missing Base Sepolia RPC URL. Set CASTKIT_SUBSCRIPTION_RPC_URL.' },
        { status: 500 }
      );
    }

    const contractAddress = resolveContractAddress();
    const subscriber = getAddress(subscriberRaw || '0x');
    const planId = normalizePlanId(request.nextUrl.searchParams.get('planId'));

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl)
    });

    const active = await readOrNull(() =>
      client.readContract({
        address: contractAddress,
        abi: subscriptionAbi,
        functionName: 'isSubscriptionActive',
        args: [planId, subscriber]
      })
    );

    if (active === null) {
      return NextResponse.json(
        {
          error:
            'Unable to read subscription status from contract. Verify ABI compatibility and contract address.'
        },
        { status: 502 }
      );
    }

    const [nextChargeAtRaw, lastPaidAtRaw, planRaw] = await Promise.all([
      readOrNull(() =>
        client.readContract({
          address: contractAddress,
          abi: subscriptionAbi,
          functionName: 'nextChargeAt',
          args: [planId, subscriber]
        })
      ),
      readOrNull(() =>
        client.readContract({
          address: contractAddress,
          abi: subscriptionAbi,
          functionName: 'lastPaidAt',
          args: [planId, subscriber]
        })
      ),
      readOrNull(() =>
        client.readContract({
          address: contractAddress,
          abi: subscriptionAbi,
          functionName: 'getPlan',
          args: [planId]
        })
      )
    ]);

    const nextChargeAt = bigintToNumberOrNull(nextChargeAtRaw as bigint | null);
    const lastPaidAt = bigintToNumberOrNull(lastPaidAtRaw as bigint | null);

    const plan = Array.isArray(planRaw)
      ? {
          token: String(planRaw[0] || ''),
          amount: String(planRaw[1] || '0'),
          intervalSeconds: Number(planRaw[2] || 0),
          treasury: String(planRaw[3] || ''),
          enabled: Boolean(planRaw[4])
        }
      : null;

    return NextResponse.json(
      {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        testnetOnly: true,
        planId,
        contractAddress,
        subscriber,
        active,
        timestamps: {
          lastPaidAt,
          lastPaidAtIso: secondsToIsoOrNull(lastPaidAt),
          nextChargeAt,
          nextChargeAtIso: secondsToIsoOrNull(nextChargeAt)
        },
        plan
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown subscription status error.'
      },
      { status: 500 }
    );
  }
}
