export const templeSprintTierRewardsAbi = [
  {
    type: "event",
    anonymous: false,
    name: "RewardClaimed",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "tier", type: "uint8", indexed: true },
      { name: "week", type: "string", indexed: false },
      { name: "claimId", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "claimReward",
    inputs: [
      { name: "tier", type: "uint8" },
      { name: "week", type: "string" },
      { name: "claimId", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "hasClaimed",
    inputs: [{ name: "claimId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
