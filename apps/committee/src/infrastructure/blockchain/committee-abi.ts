export const committeeAbi = [
  {
    type: "event",
    name: "RunRequested",
    inputs: [
      { name: "codeId", type: "uint256", indexed: true },
      { name: "runId", type: "bytes32", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "shardNonce", type: "bytes32", indexed: false },
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
] as const;

export type CommitteeAbi = typeof committeeAbi;
