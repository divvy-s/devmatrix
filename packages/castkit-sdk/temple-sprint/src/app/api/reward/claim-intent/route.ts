import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { encodePacked, hashMessage, isAddress, keccak256, toHex } from "viem";
import { connectDB } from "@/lib/db";
import { Score, User } from "@/lib/models";
import { getWeekKey } from "@/lib/week";
import { getRewardTier, getRewardTierLabel } from "@/lib/rewards";

const RAW_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
const CHAIN_ID = Number.isFinite(RAW_CHAIN_ID) && RAW_CHAIN_ID > 0 ? RAW_CHAIN_ID : 11155111;
const REWARD_CONTRACT = process.env.NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined;
const SIGNER_PK = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;

function normalizePrivateKey(input: string | undefined): `0x${string}` | null {
  if (!input) return null;
  return (input.startsWith("0x") ? input : `0x${input}`) as `0x${string}`;
}

export async function POST(req: NextRequest) {
  try {
    const { fid: fidRaw, wallet_address: walletAddressRaw, requested_tier: requestedTierRaw } = await req.json();

    const fid = Number(fidRaw);
    const walletAddress = typeof walletAddressRaw === "string" ? walletAddressRaw.trim() : "";

    if (!Number.isInteger(fid) || fid <= 0 || !walletAddress) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!REWARD_CONTRACT) {
      return NextResponse.json({ error: "NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS is not configured" }, { status: 500 });
    }

    const signerPrivateKey = normalizePrivateKey(SIGNER_PK);
    if (!signerPrivateKey) {
      return NextResponse.json({ error: "REWARD_SIGNER_PRIVATE_KEY is not configured" }, { status: 500 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const week = getWeekKey(new Date());
    const bestRun = await Score.findOne({ fid, week }).sort({ score: -1 }).lean();
    const bestScore = bestRun?.score ?? 0;
    const highestEligibleTier = getRewardTier(bestScore);

    if (highestEligibleTier === 0) {
      return NextResponse.json({
        eligible: false,
        tier: highestEligibleTier,
        tierLabel: getRewardTierLabel(highestEligibleTier),
        bestScore,
        week,
        error: "Score not eligible for reward",
      }, { status: 403 });
    }

    const requestedTier = Number(requestedTierRaw);
    const hasRequestedTier = Number.isInteger(requestedTier) && requestedTier >= 1 && requestedTier <= 3;

    if (hasRequestedTier && requestedTier > highestEligibleTier) {
      return NextResponse.json({
        eligible: false,
        tier: highestEligibleTier,
        tierLabel: getRewardTierLabel(highestEligibleTier),
        bestScore,
        week,
        error: "Requested tier is above current weekly eligibility",
      }, { status: 403 });
    }

    const tier = (hasRequestedTier ? requestedTier : highestEligibleTier) as 1 | 2 | 3;

    const claimKey = `${week}:${tier}`;

    const user = await User.findOne({ fid }).lean();
    const alreadyClaimed = Array.isArray(user?.reward_claim_keys) && user.reward_claim_keys.includes(claimKey);

    if (alreadyClaimed) {
      return NextResponse.json({
        eligible: true,
        alreadyClaimed: true,
        tier,
        tierLabel: getRewardTierLabel(tier),
        bestScore,
        week,
        walletAddress: user?.wallet_address ?? null,
      });
    }

    const claimId = keccak256(
      encodePacked(
        ["uint256", "address", "string", "uint8"],
        [BigInt(fid), walletAddress as `0x${string}`, week, tier]
      )
    );

    const payloadHash = keccak256(
      encodePacked(
        ["address", "uint256", "address", "uint8", "string", "bytes32"],
        [REWARD_CONTRACT, BigInt(CHAIN_ID), walletAddress as `0x${string}`, tier, week, claimId]
      )
    );

    const account = privateKeyToAccount(signerPrivateKey);
    const signature = await account.signMessage({ message: { raw: payloadHash } });

    return NextResponse.json({
      eligible: true,
      alreadyClaimed: false,
      tier,
      tierLabel: getRewardTierLabel(tier),
      bestScore,
      week,
      claimId,
      signature,
      chainId: CHAIN_ID,
      contractAddress: REWARD_CONTRACT,
      signer: account.address,
      claimKey,
      payloadHash,
      messageHash: hashMessage({ raw: payloadHash }),
      issuedAt: toHex(Date.now()),
    });
  } catch (err) {
    console.error("POST /api/reward/claim-intent error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
