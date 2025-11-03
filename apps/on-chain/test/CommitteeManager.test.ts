import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, stringToBytes, encodePacked, bytesToHex, Hex } from "viem";

describe("CommitteeManager (node:test + viem)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("should require existing codeId; non-committee reverts; threshold triggers ExecutionApproved", async () => {
    // LicenseManager 배포 + 코드 등록
    const licenseManager = await viem.deployContract(
      "contracts/LicenseManager.sol:LicenseManager",
      ["ipfs://base/{id}.json"]
    );

    const codeHash = keccak256(stringToBytes("sample code v1"));
    const cipherCid = "ipfs://Qm...cipher";
    const tx1 = await licenseManager.write.registerCode([codeHash, cipherCid]);
    await publicClient.getTransactionReceipt({ hash: tx1 });

    const nextId = await licenseManager.read.nextCodeId();
    const codeId = BigInt(nextId) - 1n;

    // CommitteeManager 배포 (licenseManager 주소 주입)
    const committeeManager = await viem.deployContract(
      "contracts/CommitteeManager.sol:CommitteeManager",
      [licenseManager.address]
    );

    // 지갑 준비: admin(=배포자), committee1, committee2, outsider
    const [admin, committee1, committee2, outsider] =
      await viem.getWalletClients();

    // 위원이 아니면 submitShard 리버트 확인
    await assert.rejects(
      committeeManager.write.submitShard(
        [codeId, keccak256(stringToBytes("rn-0")), "ipfs://shard/x"],
        {
          account: outsider.account, // 위원 아님
        }
      ),
      (err: unknown) =>
        String(err).includes("AccessControlUnauthorizedAccount(")
    );

    // 관리자 권한으로 위원 2명 등록 + 임계치 2 설정
    await publicClient.getTransactionReceipt({
      hash: await committeeManager.write.addCommittee([
        committee1.account.address,
      ]),
    });
    await publicClient.getTransactionReceipt({
      hash: await committeeManager.write.addCommittee([
        committee2.account.address,
      ]),
    });
    // 명시적으로 Threshold를 2로 한 번 더 설정
    await publicClient.getTransactionReceipt({
      hash: await committeeManager.write.setCommitteeThreshold([2n]),
    });

    // 존재하지 않는 codeId로 submitShard 시 revert
    await assert.rejects(
      committeeManager.write.submitShard(
        [999999n, keccak256(stringToBytes("rn-bad")), "ipfs://shard/bad"],
        {
          account: committee1.account,
        }
      ),
      (err: unknown) => String(err).includes("code !exist")
    );

    // 정상 시나리오
    // 같은 (codeId, runNonce)에 위원 두 명이 제출 → ExecutionApproved 발생
    const runNonce: Hex = keccak256(stringToBytes("rn-1")); // bytes32
    const deploymentBlock = await publicClient.getBlockNumber();

    // 첫 번째 제출: 아직 승인 이벤트 없음
    const txA = await committeeManager.write.submitShard(
      [codeId, runNonce, "ipfs://shard/a"],
      {
        account: committee1.account,
      }
    );
    await publicClient.getTransactionReceipt({ hash: txA });

    // 두 번째 제출: ExecutionApproved 이벤트 발생 기대
    await viem.assertions.emit(
      committeeManager.write.submitShard([codeId, runNonce, "ipfs://shard/b"], {
        account: committee2.account,
      }),
      committeeManager,
      "ExecutionApproved"
    );

    // shardCountForRun(runKey) == 2 확인
    const runKey = keccak256(
      encodePacked(["uint256", "bytes32"], [codeId, runNonce])
    );
    const count = await committeeManager.read.shardCountForRun([runKey]);
    assert.equal(count, 2n);

    // 이벤트 로그 내용 확인: ShardSubmitted 2번 + ExecutionApproved 1번
    const logs = await publicClient.getContractEvents({
      address: committeeManager.address,
      abi: committeeManager.abi,
      fromBlock: deploymentBlock,
      strict: true,
    });
    const shardEvents = logs.filter((l) => l.eventName === "ShardSubmitted");
    const approveEvents = logs.filter(
      (l) => l.eventName === "ExecutionApproved"
    );
    assert.equal(shardEvents.length, 2);
    assert.equal(approveEvents.length, 1);
    // ExecutionApproved 인자 간단 체크
    assert.equal(approveEvents[0].args.codeId, codeId);
    assert.equal(approveEvents[0].args.runNonce, runNonce);
    assert.equal(approveEvents[0].args.threshold, 2n);
    assert.equal(approveEvents[0].args.count, 2n);
  });
});
