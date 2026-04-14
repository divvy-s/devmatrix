import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Score } from "@/lib/models";
import { getWeekKey } from "@/lib/week";

export async function GET() {
  try {
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ leaderboard: [], message: "No DB configured" });
    }

    const week = getWeekKey(new Date());

    // Get top 50 scores for current week, best score per user
    const leaderboard = await Score.aggregate([
      { $match: { week } },
      { $sort: { score: -1 } },
      {
        $group: {
          _id: "$fid",
          username: { $first: "$username" },
          score: { $max: "$score" },
          fid: { $first: "$fid" },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          fid: 1,
          username: 1,
          score: 1,
        },
      },
    ]);

    const ranked = leaderboard.map((entry, i) => ({ ...entry, rank: i + 1 }));

    return NextResponse.json({ leaderboard: ranked, week });
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
