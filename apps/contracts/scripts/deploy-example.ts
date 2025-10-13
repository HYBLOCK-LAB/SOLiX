import hre from "hardhat";

async function main() {
  // 지갑과 RPC 클라이언트를 Hardhat에서 가져옵니다.
  const { viem } = await hre.network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("배포 지갑:", deployer.account.address);

  // 초기 메시지를 포함해 Example 컨트랙트를 배포합니다.
  const contract = await viem.deployContract(
    "Example",
    ["Hardhat과 Sepolia에서 만나요!"],
    {
      account: deployer.account,
    },
  );

  console.log("Example 배포 완료:", contract.address);

  // 배포 직후 읽기 함수 호출로 상태가 정상 저장되었는지 확인합니다.
  const currentMessage = await publicClient.readContract({
    abi: contract.abi,
    address: contract.address,
    functionName: "readMessage",
    args: [],
  });

  console.log("초기 메시지:", currentMessage);
}

main().catch((error) => {
  // Hardhat이 예외를 캐치할 수 있도록 종료 코드를 설정합니다.
  console.error(error);
  process.exitCode = 1;
});
