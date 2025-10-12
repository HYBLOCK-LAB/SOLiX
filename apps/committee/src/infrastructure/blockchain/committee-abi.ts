export const committeeAbi = [
  {
    type: "event",
    name: "RunRequested",
    inputs: [
      { name: "codeId", type: "uint256", indexed: true },
      { name: "runId", type: "bytes32", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "shardNonce", type: "uint256", indexed: false },
      { name: "threshold", type: "uint64", indexed: false },
    ],
  },
  {
    type: "function",
    name: "getThreshold",
    stateMutability: "view",
    inputs: [{ name: "codeId", type: "uint256" }],
    outputs: [{ name: "threshold", type: "uint256" }],
  },
  {
    type: "function",
    name: "approveExecution",
    stateMutability: "nonpayable",
    inputs: [
      { name: "runId", type: "bytes32" },
      { name: "codeId", type: "uint256" },
      { name: "encryptedPieceCids", type: "string[]" },
    ],
    outputs: [],
  },
] as const;

export type CommitteeAbi = typeof committeeAbi;
