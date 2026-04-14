import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { templeSprintTierRewardsAbi } from "@/lib/abi/templeSprintTierRewards";

const REWARD_CONTRACT = process.env.NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined;
const RPC_URL = process.env.REWARD_RPC_URL || process.env.SEPOLIA_RPC_URL || sepolia.rpcUrls.default.http[0];

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

function isHex32(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isHexTxHash(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const { fid: fidRaw, wallet_address: walletAddressRaw, week, tier, tx_hash, claim_id } = await req.json();

    const fid = Number(fidRaw);
    const walletAddress = typeof walletAddressRaw === "string" ? walletAddressRaw.trim() : "";
    const normalizedWeek = typeof week === "string" ? week.trim() : "";
    const normalizedTier = Number(tier);
    const txHash = typeof tx_hash === "string" ? tx_hash.trim() : "";
    const claimId = typeof claim_id === "string" ? claim_id.trim() : "";

    if (!Number.isInteger(fid) || fid <= 0 || !walletAddress || !normalizedWeek || !Number.isInteger(normalizedTier) || normalizedTier < 1 || normalizedTier > 3) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!isHexTxHash(txHash)) {
      return NextResponse.json({ error: "Invalid transaction hash" }, { status: 400 });
    }

    if (!isHex32(claimId)) {
      return NextResponse.json({ error: "Invalid claim id" }, { status: 400 });
    }

    if (!REWARD_CONTRACT || !isAddress(REWARD_CONTRACT)) {
      return NextResponse.json({ error: "Reward contract is not configured" }, { status: 500 });
    }

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Reward transaction failed on-chain" }, { status: 400 });
    }

    const receiptTo = receipt.to?.toLowerCase();
    if (!receiptTo || receiptTo !== REWARD_CONTRACT.toLowerCase()) {
      return NextResponse.json({ error: "Transaction was not sent to reward contract" }, { status: 400 });
    }

    const rewardEvent = receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: templeSprintTierRewardsAbi,
            data: log.data,
            topics: log.topics,
            strict: false,
          });
        } catch {
          return null;
        }
      })
      .find((event) => event?.eventName === "RewardClaimed");

    if (!rewardEvent) {
      return NextResponse.json({ error: "Reward event not found in transaction" }, { status: 400 });
    }

    const eventArgs = rewardEvent.args as {
      player?: `0x${string}`;
      tier?: number;
      week?: string;
      claimId?: `0x${string}`;
    };

    const eventPlayer = eventArgs.player?.toLowerCase();
    const eventTier = Number(eventArgs.tier);
    const eventWeek = String(eventArgs.week ?? "");
    const eventClaimId = String(eventArgs.claimId ?? "").toLowerCase();

    if (eventPlayer !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: "Wallet address does not match transaction event" }, { status: 400 });
    }

    if (eventTier !== normalizedTier || eventWeek !== normalizedWeek || eventClaimId !== claimId.toLowerCase()) {
      return NextResponse.json({ error: "Claim details do not match on-chain event" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const claimKey = `${normalizedWeek}:${normalizedTier}`;

    const updatedUser = await User.findOneAndUpdate(
      { fid },
      {
        $set: {
          fid,
          wallet_address: walletAddress,
          badge_claimed: true,
          last_reward_tx_hash: txHash,
        },
        $setOnInsert: { username: `fid:${fid}` },
        $addToSet: {
          badge_claimed_weeks: normalizedWeek,
          reward_claim_keys: claimKey,
        },
      },
      { returnDocument: "after", upsert: true }
    );

    return NextResponse.json({ success: true, claimKey, user: updatedUser });
  } catch (err) {
    console.error("POST /api/reward/confirm error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
