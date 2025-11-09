export const committeeManagerAbi = [
  {
    type: "event",
    name: "ShardSubmitted",
    inputs: [
      { name: "codeId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "committee", type: "address", indexed: true },
      { name: "shardCid", type: "string", indexed: false },
      { name: "approvals", type: "uint256", indexed: false },
      { name: "threshold", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExecutionApproved",
    inputs: [
      { name: "codeId", type: "uint256", indexed: true },
      { name: "requester", type: "address", indexed: true },
      { name: "threshold", type: "uint256", indexed: false },
      { name: "approvals", type: "uint256", indexed: false },
    ],
  },
] as const;

export type CommitteeManagerAbi = typeof committeeManagerAbi;
