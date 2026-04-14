export const templeSprintBadgeAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "claimBadge",
    inputs: [{ name: "week", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "hasClaimedWeek",
    inputs: [
      { name: "user", type: "address" },
      { name: "week", type: "string" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
