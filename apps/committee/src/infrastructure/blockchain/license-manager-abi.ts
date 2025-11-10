export const licenseManagerAbi = [
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
] as const;

export type LicenseManagerAbi = typeof licenseManagerAbi;
