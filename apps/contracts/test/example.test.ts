import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

describe("Example", function () {
  // Hardhat 3에서는 network.connect를 통해 fixture 도우미를 꺼냅니다.
  async function loadFixture<T>(fixture: () => Promise<T>) {
    const { networkHelpers } = await hre.network.connect();
    return networkHelpers.loadFixture(fixture);
  }

  // 반복되는 배포 과정을 고정하여 테스트 속도를 높입니다.
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
    const message = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "readMessage",
      args: [],
    });
    expect(message).to.equal("처음 메시지");
  });

  it("소유자가 메시지를 변경한다", async function () {
    const { contract, publicClient, deployer } = await loadFixture(
      deployExampleFixture
    );
    await deployer.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "updateMessage",
      args: ["새로운 메시지"],
    });
    const message = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "readMessage",
      args: [],
    });
    expect(message).to.equal("새로운 메시지");
  });

  it("소유자가 아닌 경우 메시지 변경을 거부한다", async function () {
    const { contract, participant } = await loadFixture(deployExampleFixture);
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

    await participant.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "deposit",
      args: [],
      value: depositValue,
    });

    const balanceAfterDeposit = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "contractBalance",
      args: [],
    });
    expect(balanceAfterDeposit).to.equal(depositValue);

    await deployer.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "withdraw",
      args: [deployer.account.address, depositValue],
    });

    const balanceAfterWithdraw = await publicClient.readContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "contractBalance",
      args: [],
    });
    expect(balanceAfterWithdraw).to.equal(0n);
  });

  it("0 ETH 입금은 거부된다", async function () {
    const { contract, participant } = await loadFixture(deployExampleFixture);
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
