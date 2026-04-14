import { Schema, model, models } from "mongoose";

// ── User Model ──────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    fid: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true },
    wallet_address: { type: String, default: null },
    last_reward_tx_hash: { type: String, default: null },
    badge_claimed: { type: Boolean, default: false },
    badge_claimed_weeks: { type: [String], default: [] },
    reward_claim_keys: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = models.User || model("User", UserSchema);

// ── Score Model ──────────────────────────────────────────────────
const ScoreSchema = new Schema(
  {
    fid: { type: Number, required: true, index: true },
    username: { type: String, required: true },
    score: { type: Number, required: true },
    week: { type: String, required: true }, // "2025-W15" format
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index: one best score per user per week
ScoreSchema.index({ fid: 1, week: 1 }, { unique: false });

export const Score = models.Score || model("Score", ScoreSchema);
