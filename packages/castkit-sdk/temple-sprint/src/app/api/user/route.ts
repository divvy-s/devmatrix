import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Score } from "@/lib/models";
import { getWeekKey } from "@/lib/week";

// GET user status (score, rank, and badge claim status)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");
    const week = searchParams.get("week") || getWeekKey(new Date());

    if (!fid) {
      return NextResponse.json({ error: "Missing FID" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const parsedFid = parseInt(fid, 10);
    if (Number.isNaN(parsedFid) || parsedFid <= 0) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    // Find the user
    const user = await User.findOne({ fid: parsedFid }).lean();
    
    // Find their best score for the given week if week is provided
    const userScore = await Score.findOne({ fid: parsedFid, week }).sort({ score: -1 }).lean();

    const claimedWeeks = Array.isArray(user?.badge_claimed_weeks) ? user.badge_claimed_weeks : [];
    const claimedForWeek = claimedWeeks.includes(week);

    if (!user) {
      return NextResponse.json({ 
          exists: false,
          badge_claimed: false,
          wallet_address: null,
          highest_score: userScore?.score || 0,
          week,
      });
    }

    return NextResponse.json({
        exists: true,
        badge_claimed: claimedForWeek,
        wallet_address: user.wallet_address,
        highest_score: userScore?.score || 0,
        week,
    });
  } catch (err) {
    console.error("GET /api/user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST to update wallet address and badge claim status
export async function POST(req: NextRequest) {
    try {
      const { fid, wallet_address, mark_claimed, week } = await req.json();
      
      if (!fid || !wallet_address) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const parsedFid = Number(fid);
      const normalizedWallet = typeof wallet_address === "string" ? wallet_address.trim() : "";
      const claimWeek = typeof week === "string" ? week.trim() : "";

      if (!Number.isInteger(parsedFid) || parsedFid <= 0 || !normalizedWallet) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      if (mark_claimed && !claimWeek) {
        return NextResponse.json({ error: "Week is required when marking badge as claimed" }, { status: 400 });
      }
  
      const db = await connectDB();
      if (!db) {
        return NextResponse.json({ error: "Database not configured" }, { status: 503 });
      }

      const updateData: {
        $set: { wallet_address: string; badge_claimed?: boolean };
        $setOnInsert: { fid: number; username: string };
        $addToSet?: { badge_claimed_weeks: string };
      } = {
        $set: { wallet_address: normalizedWallet },
        $setOnInsert: { fid: parsedFid, username: `fid:${parsedFid}` },
      };

      if (mark_claimed) {
        updateData.$set.badge_claimed = true;
        updateData.$addToSet = { badge_claimed_weeks: claimWeek };
      }

      const updatedUser = await User.findOneAndUpdate(
        { fid: parsedFid },
        updateData,
        { new: true, upsert: true }
      );
  
      return NextResponse.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("POST /api/user error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
