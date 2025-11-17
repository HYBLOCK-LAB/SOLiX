export const committeeAbi = [
  {
    type: "event",
    name: "RunRequested",
    inputs: [
      { name: "codeId", type: "uint256", indexed: true },
      { name: "runId", type: "bytes32", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "runNonce", type: "bytes32", indexed: false },
      { name: "threshold", type: "uint256", indexed: false },
      { name: "recipientPubKey", type: "bytes", indexed: false },
    ],
  },
  {
    type: "function",
    name: "submitShard",
    stateMutability: "nonpayable",
    inputs: [
      { name: "codeId", type: "uint256" },
      { name: "requester", type: "address" },
      { name: "runNonce", type: "bytes32" },
      { name: "shardCid", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "committeeThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "COMMITTEE_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "addCommittee",
    stateMutability: "nonpayable",
    inputs: [{ name: "newCommittee", type: "address" }],
    outputs: [],
  },
] as const;

export type CommitteeAbi = typeof committeeAbi;
