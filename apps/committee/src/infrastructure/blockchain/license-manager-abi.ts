export const licenseManagerAbi = [
  {
    type: "event",
    name: "RunRequested",
    inputs: [
      { name: "codeId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "runNonce", type: "bytes32", indexed: true },
      { name: "recipientPubKey", type: "bytes", indexed: false },
      { name: "blockTimestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export type LicenseManagerAbi = typeof licenseManagerAbi;
