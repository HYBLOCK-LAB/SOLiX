export const licenseManagerAbi = [
  {
    type: "function",
    name: "registerCode",
    stateMutability: "nonpayable",
    inputs: [
      { name: "codeHash", type: "bytes32" },
      { name: "cipherCid", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "updateCodeMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "codeId", type: "uint256" },
      { name: "newCodeHash", type: "bytes32" },
      { name: "newCipherCid", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "issueLicense",
    stateMutability: "nonpayable",
    inputs: [
      { name: "codeId", type: "uint256" },
      { name: "to", type: "address" },
      { name: "runs", type: "uint256" },
      { name: "expiryTimestamp", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pauseCodeExecution",
    stateMutability: "nonpayable",
    inputs: [{ name: "codeId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unpauseCodeExecution",
    stateMutability: "nonpayable",
    inputs: [{ name: "codeId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeUserLicense",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "codeId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "requestCodeExecution",
    stateMutability: "nonpayable",
    inputs: [
      { name: "codeId", type: "uint256" },
      { name: "recipientPubKey", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "code",
    stateMutability: "view",
    inputs: [{ name: "codeId", type: "uint256" }],
    outputs: [
      { type: "bytes32" },
      { type: "string" },
      { type: "bool" },
      { type: "bool" },
    ],
  },
  {
    type: "function",
    name: "licenseExpiry",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "codeId", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nextCodeId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type LicenseManagerAbi = typeof licenseManagerAbi;
