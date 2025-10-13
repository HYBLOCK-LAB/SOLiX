import hre from "hardhat";

async function main() {
  // 지갑과 RPC 클라이언트를 Hardhat에서 가져옵니다.
  const { viem } = await hre.network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("배포 지갑:", deployer.account.address);

  // 초기 메시지를 설정하면서 컨트랙트를 배포합니다.
  const contract = await viem.deployContract(
    "Example",
    ["Hardhat과 Sepolia에서 만나요!"],
    {
      account: deployer.account,
    },
  );

  console.log("Example 배포 완료:", contract.address);

  // 배포 직후 읽기 함수가 정상 동작하는지 확인합니다.
  const currentMessage = await publicClient.readContract({
    abi: contract.abi,
    address: contract.address,
    functionName: "readMessage",
    args: [],
  });

  console.log("초기 메시지:", currentMessage);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
