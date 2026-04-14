export const subscriptionContractAbi = [
  {
    type: 'function',
    name: 'subscribe',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'planId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'cancel',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'planId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'collect',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'collected', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'isSubscriptionActive',
    stateMutability: 'view',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'active', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'nextChargeAt',
    stateMutability: 'view',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'timestamp', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastPaidAt',
    stateMutability: 'view',
    inputs: [
      { name: 'planId', type: 'bytes32' },
      { name: 'subscriber', type: 'address' }
    ],
    outputs: [{ name: 'timestamp', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'getPlan',
    stateMutability: 'view',
    inputs: [{ name: 'planId', type: 'bytes32' }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'intervalSeconds', type: 'uint256' },
      { name: 'treasury', type: 'address' },
      { name: 'enabled', type: 'bool' }
    ]
  }
];
