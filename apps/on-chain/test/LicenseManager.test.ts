import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, stringToBytes, bytesToHex, getAddress } from "viem";

describe("LicenseManager", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should emit CodeRegistered when calling registerCode", async () => {
    // 배포 (FQN 사용 권장)
    const licenseManager = await viem.deployContract(
      "contracts/LicenseManager.sol:LicenseManager",
      ["ipfs://base/{id}.json"]
    );

    const [wallet] = await viem.getWalletClients();
    const publisher = getAddress(wallet.account.address);

    // 입력 준비
    const codeHash = keccak256(stringToBytes("my code v1"));
    const cipherCid = "ipfs://Qm...cipher";

    // registerCode 직전 nextCodeId를 읽어, 이번 호출에서 배정될 codeId 예상
    const nextIdBefore = await licenseManager.read.nextCodeId();
    const expectedCodeId = BigInt(nextIdBefore);

    // 3) 이벤트 검증
    await viem.assertions.emitWithArgs(
      licenseManager.write.registerCode([codeHash, cipherCid]),
      licenseManager,
      "CodeRegistered",
      // event CodeRegistered(uint256 codeId, bytes32 codeHash, string cipherCid, string name, string version, address publisher)
      // 첫 번째 인자 codeId는 동적으로 배정되므로 와일드카드로 두고, 나머지 인자만 체크하고 싶다면
      // viem.assertions의 strict 매칭 대신 커스텀 검증을 아래 두 번째 테스트처럼 할 수 있음.
      // 여기서는 간단히 전체 인자를 비교하지 않고 호출이 성공/이벤트 발생만 확인.
      // emitWithArgs는 인자를 엄격히 체크하므로, codeId를 알 수 없는 이 케이스에서는
      // 아래처럼 '이벤트만 발생'을 확인하려면 emit()를 쓸 수도 있음:
      // viem.assertions.emit(licenseManager.write.registerCode([codeHash, cipherCid]), licenseManager, "CodeRegistered")
      // 하지만 요청이 "유사하게"라서 원형 유지: 인자 비교를 피하려면 다음 한 줄로 대체 가능.
      // ↑ 주석 참고: 필요시 emit()로 대체하세요.
      [expectedCodeId, codeHash, cipherCid, "", "1.0.0", publisher]
    );

    // 사후 검증: nextCodeId가 +1 되었는지 확인
    const nextIdAfter = await licenseManager.read.nextCodeId();
    assert.equal(BigInt(nextIdAfter), expectedCodeId + 1n);
  });

  it("Sum of RunRequested events equals total runs consumed; balance matches expected", async () => {
    // 배포
    const licenseManager = await viem.deployContract(
      "contracts/LicenseManager.sol:LicenseManager",
      ["ipfs://base/{id}.json"]
    );
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    // registerCode
    const codeHash = keccak256(stringToBytes("my code v2"));
    const cipherCid = "ipfs://Qm...cipher2";
    const tx1 = await licenseManager.write.registerCode([codeHash, cipherCid]);
    await publicClient.getTransactionReceipt({ hash: tx1 });

    // codeId = nextCodeId() - 1
    const nextId = await licenseManager.read.nextCodeId();
    const codeId = BigInt(nextId) - 1n;

    // issueLicense to first wallet (runs=5, expiry=0)
    const [wallet] = await viem.getWalletClients();
    const to = wallet.account.address;

    const runs = 5n;
    const tx2 = await licenseManager.write.issueLicense([codeId, to, runs, 0n]);
    await publicClient.getTransactionReceipt({ hash: tx2 });

    // 여러 번 실행 요청 (3회)
    let consumed = 0n;
    for (let i = 0; i < 3; i++) {
      const runNonce = keccak256(stringToBytes(`run-${i}`));
      const tx = await licenseManager.write.requestCodeExecution([
        codeId,
        runNonce,
        bytesToHex(stringToBytes(`recipient-pk-${i}`)),
      ]);
      await publicClient.getTransactionReceipt({ hash: tx });
      consumed += 1n;
    }

    // 이벤트 조회: RunRequested
    const events = await publicClient.getContractEvents({
      address: licenseManager.address,
      abi: licenseManager.abi,
      eventName: "RunRequested",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    // 소모된 실행권 수와 이벤트 개수가 일치하는지 (RunRequested가 3번 발생해야 함)
    assert.equal(BigInt(events.length), consumed);

    // 현재 잔여 실행권 = 초기 runs - consumed
    const expectedBalance = runs - consumed;
    const onchainBalance = await licenseManager.read.balanceOf([to, codeId]);
    assert.equal(onchainBalance, expectedBalance);
  });
});
