import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

// Example 컨트랙트의 기본 동작을 Hardhat 환경에서 검증합니다.
describe("Example", function () {
  // Hardhat 3에서는 network.connect()를 통해 fixture 도우미를 획득합니다.
  async function loadFixture<T>(fixture: () => Promise<T>) {
    const { networkHelpers } = await hre.network.connect();
    return networkHelpers.loadFixture(fixture);
  }

  // 반복되는 배포 절차를 고정해 테스트 간 독립성과 속도를 확보합니다.
  async function deployExampleFixture() {
    const { viem } = await hre.network.connect();
    const [deployer, participant] = await viem.getWalletClients();
    const contract = await viem.deployContract("Example", ["처음 메시지"], {
      account: deployer.account,
    });
    const publicClient = await viem.getPublicClient();
    return { contract, deployer, participant, publicClient };
  }

  it("초기 메시지를 저장한다", async function () {
    const { contract, publicClient } = await loadFixture(deployExampleFixture);
    // 배포 직후 readMessage가 제공한 초기값을 그대로 반환하는지 확인합니다.
    const message = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "readMessage",
      args: [],
    });
    assert.strictEqual(message, "처음 메시지");
  });

  it("소유자가 메시지를 변경한다", async function () {
    const { contract, publicClient, deployer } = await loadFixture(
      deployExampleFixture
    );
    // 소유자 지갑으로 메시지를 갱신합니다.
    await deployer.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "updateMessage",
      args: ["새로운 메시지"],
    });
    // 변경된 메시지가 즉시 조회되는지 확인합니다.
    const message = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "readMessage",
      args: [],
    });
    assert.strictEqual(message, "새로운 메시지");
  });

  it("소유자가 아닌 경우 메시지 변경을 거부한다", async function () {
    const { contract, participant } = await loadFixture(deployExampleFixture);
    // participant 계정은 소유자가 아니므로 revert가 발생해야 합니다.
    await assert.rejects(
      participant.writeContract({
        abi: contract.abi,
        address: contract.address,
        functionName: "updateMessage",
        args: ["권한 없음"],
      }),
      /ONLY_OWNER/
    );
  });

  it("입금과 출금 흐름을 처리한다", async function () {
    const { contract, publicClient, participant, deployer } = await loadFixture(
      deployExampleFixture
    );
    const depositValue = 1_000_000_000_000_000n;

    // 임의 참가자가 0.001 ETH를 입금합니다.
    await participant.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "deposit",
      args: [],
      value: depositValue,
    });

    // 입금 이후 잔액이 정확히 늘어났는지 확인합니다.
    const balanceAfterDeposit = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "contractBalance",
      args: [],
    });
    assert.strictEqual(balanceAfterDeposit, depositValue);

    // 소유자가 동일 금액을 출금합니다.
    await deployer.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "withdraw",
      args: [deployer.account.address, depositValue],
    });

    // 출금 이후 잔액이 0으로 돌아왔는지 확인합니다.
    const balanceAfterWithdraw = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "contractBalance",
      args: [],
    });
    assert.strictEqual(balanceAfterWithdraw, 0n);
  });

  it("0 ETH 입금은 거부된다", async function () {
    const { contract, participant } = await loadFixture(deployExampleFixture);
    // 값이 0인 입금 시 require가 revert를 발생시키는지 검증합니다.
    await assert.rejects(
      participant.writeContract({
        abi: contract.abi,
        address: contract.address,
        functionName: "deposit",
        args: [],
        value: 0n,
      }),
      /VALUE_MUST_BE_POSITIVE/
    );
  });
});
