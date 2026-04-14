import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Score, User } from "@/lib/models";
import { getWeekKey } from "@/lib/week";

export async function POST(req: NextRequest) {
  try {
    const { fid, score, username } = await req.json();

    const parsedFid = Number(fid);
    const parsedScore = Number(score);
    const normalizedUsername = typeof username === "string" ? username.trim() : "";

    if (!Number.isInteger(parsedFid) || parsedFid <= 0 || !Number.isFinite(parsedScore) || parsedScore < 0 || !normalizedUsername) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      // DB not configured – still return success for local dev
      return NextResponse.json({ success: true, score, message: "Score recorded (no DB)" });
    }

    const week = getWeekKey(new Date());

    // Upsert user
    await User.findOneAndUpdate(
      { fid: parsedFid },
      { fid: parsedFid, username: normalizedUsername },
      { upsert: true, new: true }
    );

    // Save score
    await Score.create({ fid: parsedFid, username: normalizedUsername, score: parsedScore, week });

    return NextResponse.json({ success: true, score: parsedScore });
  } catch (err) {
    console.error("POST /api/score error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
