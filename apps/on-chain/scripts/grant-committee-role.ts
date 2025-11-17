import { network } from "hardhat";

const committeeAbi = [
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

const committeeManager = process.env.COMMITTEE_MANAGER_ADDRESS?.trim();
const addressList = process.env.COMMITTEE_ROLE_ADDRESSES;
if (!committeeManager || committeeManager.length !== 42) {
  throw new Error("Missing COMMITTEE_MANAGER_ADDRESS (expected 0x-address)");
}
if (!addressList) {
  throw new Error("Missing COMMITTEE_ROLE_ADDRESSES (comma-separated 0x-addresses)");
}
const committeeAddresses = addressList
  .split(",")
  .map((address) => address.trim())
  .filter((address) => address.length > 0);

if (committeeAddresses.length === 0) {
  throw new Error("No committee addresses provided");
}

const targetNetwork = process.env.COMMITTEE_ROLE_NETWORK ?? "sepolia";
console.log(`Connecting to Hardhat network "${targetNetwork}"…`);
const { viem } = await network.connect({
  network: targetNetwork,
});

const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();
if (!walletClient) {
  throw new Error("Unable to create wallet client. Check Hardhat network config.");
}
const sender = walletClient.account.address;
console.log("Using sender:", sender);

const committeeRole = (await publicClient.readContract({
  address: committeeManager as `0x${string}`,
  abi: committeeAbi,
  functionName: "COMMITTEE_ROLE",
})) as `0x${string}`;

for (const committeeAddress of committeeAddresses) {
  const checksummed = committeeAddress as `0x${string}`;
  const hasRole = await publicClient.readContract({
    address: committeeManager as `0x${string}`,
    abi: committeeAbi,
    functionName: "hasRole",
    args: [committeeRole, checksummed],
  });

  if (hasRole) {
    console.log(`- ${checksummed} already has COMMITTEE_ROLE. Skipping.`);
    continue;
  }

  console.log(`- Granting COMMITTEE_ROLE to ${checksummed}`);
  const hash = await walletClient.writeContract({
    address: committeeManager as `0x${string}`,
    abi: committeeAbi,
    functionName: "addCommittee",
    args: [checksummed],
    account: walletClient.account,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Tx confirmed: ${receipt.transactionHash}`);
}

console.log("Done.");
