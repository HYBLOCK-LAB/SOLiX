import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";
dotenv.config();

function getVar(name: string, opts?: { optional?: boolean }) {
  const v = process.env[name];
  if (!v && !opts?.optional) {
    throw new Error(`Missing required config variable: ${name}`);
  }
  return v;
}

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.30",
      },
      production: {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: getVar("SEPOLIA_RPC_URL")!,
      accounts: [getVar("SEPOLIA_PRIVATE_KEY")!],
    },
  },
};

export default config;
