export type RewardTier = 0 | 1 | 2 | 3;

export const REWARD_THRESHOLDS = {
  bronze: 2000,
  silver: 5000,
  gold: 10000,
} as const;

export function getRewardTier(score: number): RewardTier {
  if (score >= REWARD_THRESHOLDS.gold) return 3;
  if (score >= REWARD_THRESHOLDS.silver) return 2;
  if (score >= REWARD_THRESHOLDS.bronze) return 1;
  return 0;
}

export function getRewardTierLabel(tier: RewardTier): string {
  if (tier === 3) return "Gold Relic";
  if (tier === 2) return "Silver Relic";
  if (tier === 1) return "Bronze Relic";
  return "No Reward";
}

export function getRewardTierColor(tier: RewardTier): string {
  if (tier === 3) return "#f8d26a";
  if (tier === 2) return "#c7d3df";
  if (tier === 1) return "#d38f59";
  return "#7a8795";
}
