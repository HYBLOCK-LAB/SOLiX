import * as dotenv from "dotenv";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import type { HardhatUserConfig } from "hardhat/config";

dotenv.config();

function getVar(name: string, opts?: { optional?: boolean }) {
  const v = process.env[name];
  if (!v && !opts?.optional) {
    throw new Error(`Missing required config variable: ${name}`);
  }
  return v;
}

const networks: NonNullable<HardhatUserConfig["networks"]> = {
  hardhatMainnet: {
    type: "edr-simulated",
    chainType: "l1",
  },
  hardhatOp: {
    type: "edr-simulated",
    chainType: "op",
  },
};

if (process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_PRIVATE_KEY) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: getVar("SEPOLIA_RPC_URL")!,
    accounts: [getVar("SEPOLIA_PRIVATE_KEY")!],
  };
}

const verify = process.env.ETHERSCAN_API_KEY
  ? {
      etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
      },
    }
  : undefined;

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViem, hardhatVerify, hardhatIgnition],
  chainDescriptors: {
    11155111: {
      name: "Sepolia",
      chainType: "l1",
      blockExplorers: {
        etherscan: {
          url: "https://sepolia.etherscan.io",
          apiUrl: "https://api.etherscan.io/v2/api",
        },
      },
    },
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.30",
      },
      production: {
        version: "0.8.30",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks,
  ...(verify ? { verify } : {}),
};

export default config;
