import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, stringToBytes, getAddress, bytesToHex } from "viem";

async function expectCustomError(
  promise: Promise<unknown>,
  identifier: string
) {
  await assert.rejects(promise, (error: any) => {
    const combined = `${error?.shortMessage ?? ""}${
      error?.message ?? ""
    }${String(error ?? "")}`;
    return combined.includes(identifier);
  });
}

describe("CommitteeManager", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  async function deployLicenseManager() {
    return viem.deployContract("contracts/LicenseManager.sol:LicenseManager", [
      "ipfs://base/{id}.json",
    ]);
  }

  async function deployCommitteeManager(licenseManagerAddress: `0x${string}`) {
    return viem.deployContract(
      "contracts/CommitteeManager.sol:CommitteeManager",
      [licenseManagerAddress]
    );
  }

  async function prepareCode(licenseManager: any, source: string) {
    const codeHash = keccak256(stringToBytes(source));
    const cipherCid = `ipfs://${source}`;
    const tx = await licenseManager.write.registerCode([codeHash, cipherCid]);
    await publicClient.getTransactionReceipt({ hash: tx });
    const nextId = await licenseManager.read.nextCodeId();
    return BigInt(nextId) - 1n;
  }

  async function issueAndRequestRun(
    licenseManager: any,
    codeId: bigint,
    requester: any,
    admin: any,
    runNonce: `0x${string}`
  ) {
    const requesterAddress = getAddress(requester.account.address);
    await licenseManager.write.issueLicense(
      [codeId, requesterAddress, 3n, 0n],
      { account: admin.account }
    );
    await licenseManager.write.requestCodeExecution(
      [codeId, runNonce, bytesToHex(stringToBytes("pubkey"))],
      { account: requester.account }
    );
  }

  it("allows admin to update committee threshold", async () => {
    const licenseManager = await deployLicenseManager();
    const committeeManager = await deployCommitteeManager(
      licenseManager.address
    );

    const wallets = await viem.getWalletClients();
    const admin = wallets[0];
    const requester = wallets[1];

    await committeeManager.write.setCommitteeThreshold([5n], {
      account: admin.account,
    });
    const updated = await committeeManager.read.committeeThreshold();
    assert.equal(updated, 5n);

    await expectCustomError(
      committeeManager.write.setCommitteeThreshold([0n], {
        account: requester.account,
      }),
      "AccessControlUnauthorizedAccount"
    );
  });

  it("counts unique shard submissions and emits approval at threshold", async () => {
    const licenseManager = await deployLicenseManager();
    const committeeManager = await deployCommitteeManager(
      licenseManager.address
    );

    const codeId = await prepareCode(licenseManager, "code-v2");

    const wallets = await viem.getWalletClients();
    const admin = wallets[0];
    const committeeOne = wallets[1];
    const committeeTwo = wallets[2];
    const committeeThree = wallets[3];
    const requester = wallets[4];

    await committeeManager.write.setCommitteeThreshold([3n], {
      account: admin.account,
    });
    await committeeManager.write.addCommittee([committeeOne.account.address], {
      account: admin.account,
    });
    await committeeManager.write.addCommittee([committeeTwo.account.address], {
      account: admin.account,
    });
    await committeeManager.write.addCommittee(
      [committeeThree.account.address],
      { account: admin.account }
    );

    const committeeOneAddress = getAddress(committeeOne.account.address);
    const committeeTwoAddress = getAddress(committeeTwo.account.address);
    const committeeThreeAddress = getAddress(committeeThree.account.address);
    const requesterAddress = getAddress(requester.account.address);
    const runNonce = keccak256(stringToBytes("run-1"));

    await issueAndRequestRun(
      licenseManager,
      codeId,
      requester,
      admin,
      runNonce
    );

    await viem.assertions.emitWithArgs(
      committeeManager.write.submitShard(
        [codeId, requesterAddress, runNonce, "ipfs://shard-1"],
        { account: committeeOne.account }
      ),
      committeeManager,
      "ShardSubmitted",
      [
        codeId,
        requesterAddress,
        runNonce,
        committeeOneAddress,
        "ipfs://shard-1",
        1n,
        3n,
      ]
    );

    await expectCustomError(
      committeeManager.write.submitShard(
        [codeId, requesterAddress, runNonce, "ipfs://duplicate"],
        { account: committeeOne.account }
      ),
      "DuplicateShard"
    );

    await viem.assertions.emitWithArgs(
      committeeManager.write.submitShard(
        [codeId, requesterAddress, runNonce, "ipfs://shard-2"],
        { account: committeeTwo.account }
      ),
      committeeManager,
      "ShardSubmitted",
      [
        codeId,
        requesterAddress,
        runNonce,
        committeeTwoAddress,
        "ipfs://shard-2",
        2n,
        3n,
      ]
    );

    await viem.assertions.emitWithArgs(
      committeeManager.write.submitShard(
        [codeId, requesterAddress, runNonce, "ipfs://shard-3"],
        { account: committeeThree.account }
      ),
      committeeManager,
      "ExecutionApproved",
      [codeId, requesterAddress, runNonce, 3n, 3n]
    );
  });

  it("requires a valid run request and allows admin reset", async () => {
    const licenseManager = await deployLicenseManager();
    const committeeManager = await deployCommitteeManager(
      licenseManager.address
    );

    const codeId = await prepareCode(licenseManager, "code-v3");

    const wallets = await viem.getWalletClients();
    const admin = wallets[0];
    const committee = wallets[1];
    const requester = wallets[2];
    const requesterAddress = getAddress(requester.account.address);
    const runNonce = keccak256(stringToBytes("run-reset"));

    await committeeManager.write.addCommittee([committee.account.address], {
      account: admin.account,
    });

    await expectCustomError(
      committeeManager.write.submitShard(
        [codeId, requesterAddress, runNonce, "ipfs://shard-reset"],
        { account: committee.account }
      ),
      "run not requested"
    );

    await issueAndRequestRun(
      licenseManager,
      codeId,
      requester,
      admin,
      runNonce
    );

    await committeeManager.write.submitShard(
      [codeId, requesterAddress, runNonce, "ipfs://shard-original"],
      { account: committee.account }
    );

    await expectCustomError(
      committeeManager.write.submitShard(
        [codeId, requesterAddress, runNonce, "ipfs://shard-duplicate"],
        { account: committee.account }
      ),
      "DuplicateShard"
    );

    await committeeManager.write.resetRunState(
      [codeId, requesterAddress, runNonce],
      { account: admin.account }
    );

    await committeeManager.write.submitShard(
      [codeId, requesterAddress, runNonce, "ipfs://shard-after-reset"],
      { account: committee.account }
    );
  });
});
