import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  isHex,
  padHex,
  stringToHex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

export const runtime = 'nodejs';

const BASE_SEPOLIA_CHAIN_ID = 84532;
const DEFAULT_PLAN_ID = 'castkit-demo-monthly';

const subscriptionAbi = [
  {
    type: 'function',
    name: 'collect',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'collected', type: 'bool' }]
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

function resolveKeeperKey() {
  const raw = (process.env.CASTKIT_SUBSCRIPTION_KEEPER_PRIVATE_KEY || '').trim();
  if (!raw) {
    throw new Error('CASTKIT_SUBSCRIPTION_KEEPER_PRIVATE_KEY is required for collect route.');
  }

  const prefixed = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!isHex(prefixed, { strict: true }) || prefixed.length !== 66) {
    throw new Error('CASTKIT_SUBSCRIPTION_KEEPER_PRIVATE_KEY must be a 32-byte hex key.');
  }

  return prefixed as `0x${string}`;
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

function isAuthorized(request: NextRequest) {
  const secret = process.env.CASTKIT_SUBSCRIPTION_KEEPER_SECRET;
  if (!secret) return true;

  const provided = request.headers.get('x-castkit-keeper-secret') || '';
  return provided === secret;
}

export async function POST(request: NextRequest) {
  try {
    ensureTestnetOnly();

    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized keeper request.' },
        { status: 401 }
      );
    }

    let body: { subscriber?: string; planId?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!isAddress(body.subscriber || '')) {
      return NextResponse.json(
        { error: 'subscriber is required and must be a valid EVM address.' },
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
    const planId = normalizePlanId(body.planId || null);
    const subscriber = getAddress(body.subscriber || '0x');

    const keeperAccount = privateKeyToAccount(resolveKeeperKey());

    const walletClient = createWalletClient({
      chain: baseSepolia,
      account: keeperAccount,
      transport: http(rpcUrl)
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl)
    });

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: subscriptionAbi,
      functionName: 'collect',
      args: [planId, subscriber]
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json(
      {
        ok: receipt.status === 'success',
        chainId: BASE_SEPOLIA_CHAIN_ID,
        testnetOnly: true,
        planId,
        subscriber,
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        status: receipt.status
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown subscription collect error.'
      },
      { status: 500 }
    );
  }
}
