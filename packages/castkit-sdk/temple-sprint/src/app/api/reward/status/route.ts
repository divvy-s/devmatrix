import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Score, User } from "@/lib/models";
import { getWeekKey } from "@/lib/week";
import { getRewardTier, getRewardTierLabel } from "@/lib/rewards";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidRaw = searchParams.get("fid");

    if (!fidRaw) {
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    const fid = Number(fidRaw);
    if (!Number.isInteger(fid) || fid <= 0) {
      return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const week = getWeekKey(new Date());

    const bestRun = await Score.findOne({ fid, week }).sort({ score: -1 }).lean();
    const bestScore = bestRun?.score ?? 0;
    const tier = getRewardTier(bestScore);

    const user = await User.findOne({ fid }).lean();
    const claimKey = tier > 0 ? `${week}:${tier}` : null;
    const alreadyClaimed = claimKey
      ? Array.isArray(user?.reward_claim_keys) && user.reward_claim_keys.includes(claimKey)
      : false;

    return NextResponse.json({
      week,
      fid,
      bestScore,
      tier,
      tierLabel: getRewardTierLabel(tier),
      eligible: tier > 0,
      alreadyClaimed,
      walletAddress: user?.wallet_address ?? null,
    });
  } catch (err) {
    console.error("GET /api/reward/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
