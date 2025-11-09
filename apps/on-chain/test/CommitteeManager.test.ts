import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, stringToBytes, getAddress } from "viem";

async function expectCustomError(promise: Promise<unknown>, identifier: string) {
  await assert.rejects(promise, (error: any) => {
    const combined = `${error?.shortMessage ?? ""}${error?.message ?? ""}${String(error ?? "")}`;
    return combined.includes(identifier);
  });
}

describe("CommitteeManager", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  async function deployLicenseManager() {
    return viem.deployContract("contracts/LicenseManager.sol:LicenseManager", ["ipfs://base/{id}.json"]);
  }

  async function deployCommitteeManager(licenseManagerAddress: `0x${string}`) {
    return viem.deployContract("contracts/CommitteeManager.sol:CommitteeManager", [licenseManagerAddress]);
  }

  async function prepareCode(licenseManager: any, source: string) {
    const codeHash = keccak256(stringToBytes(source));
    const cipherCid = `ipfs://${source}`;
    const tx = await licenseManager.write.registerCode([codeHash, cipherCid]);
    await publicClient.getTransactionReceipt({ hash: tx });
    const nextId = await licenseManager.read.nextCodeId();
    return BigInt(nextId) - 1n;
  }

  it("registers runs with custom thresholds", async () => {
    const licenseManager = await deployLicenseManager();
    const committeeManager = await deployCommitteeManager(licenseManager.address);

    const codeId = await prepareCode(licenseManager, "code-v1");
    const runNonce = keccak256(stringToBytes("run-1"));

    const [admin] = await viem.getWalletClients();

    await viem.assertions.emitWithArgs(
      committeeManager.write.registerRun([codeId, runNonce, 3n], { account: admin.account }),
      committeeManager,
      "RunRegistered",
      [codeId, runNonce, 3n]
    );

    const state = await committeeManager.read.getRunState([codeId, runNonce]);
    assert.equal(state[0], 3n); // threshold
    assert.equal(state[1], 0n); // approvals
    assert.equal(state[2], false); // approved
    assert.equal(state[3], true); // exists

    await expectCustomError(
      committeeManager.write.registerRun([codeId, runNonce, 2n], { account: admin.account }),
      "RunAlreadyRegistered"
    );
  });

  it("counts unique shard submissions and emits approval at threshold", async () => {
    const licenseManager = await deployLicenseManager();
    const committeeManager = await deployCommitteeManager(licenseManager.address);

    const codeId = await prepareCode(licenseManager, "code-v2");
    const runNonce = keccak256(stringToBytes("run-2"));

    const wallets = await viem.getWalletClients();
    const admin = wallets[0];
    const committeeOne = wallets[1];
    const committeeTwo = wallets[2];

    await committeeManager.write.addCommittee([committeeOne.account.address], { account: admin.account });
    await committeeManager.write.addCommittee([committeeTwo.account.address], { account: admin.account });

    const committeeOneAddress = getAddress(committeeOne.account.address);
    const committeeTwoAddress = getAddress(committeeTwo.account.address);

    await viem.assertions.emitWithArgs(
      committeeManager.write.submitShard([codeId, runNonce, "ipfs://shard-1"], { account: committeeOne.account }),
      committeeManager,
      "ShardSubmitted",
      [codeId, runNonce, committeeOneAddress, "ipfs://shard-1", 1n, 2n]
    );

    await expectCustomError(
      committeeManager.write.submitShard([codeId, runNonce, "ipfs://duplicate"], { account: committeeOne.account }),
      "DuplicateShard"
    );

    await viem.assertions.emitWithArgs(
      committeeManager.write.submitShard([codeId, runNonce, "ipfs://shard-2"], { account: committeeTwo.account }),
      committeeManager,
      "ExecutionApproved",
      [codeId, runNonce, 2n, 2n]
    );

    const state = await committeeManager.read.getRunState([codeId, runNonce]);
    assert.equal(state[1], 2n);
    assert.equal(state[2], true);
  });
});
