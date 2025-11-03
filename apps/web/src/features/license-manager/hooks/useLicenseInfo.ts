import { useAccount, useReadContracts } from "wagmi";
import { licenseManagerAbi } from "../abi";
import { LICENSE_MANAGER_ADDRESS } from "../constants";

export function useLicenseInfo(codeId: number | bigint, addressOverride?: `0x${string}`) {
  const account = useAccount();
  const address = addressOverride ?? account.address;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: address
      ? [
          {
            address: LICENSE_MANAGER_ADDRESS,
            abi: licenseManagerAbi,
            functionName: "balanceOf",
            args: [address, BigInt(codeId)],
          },
          {
            address: LICENSE_MANAGER_ADDRESS,
            abi: licenseManagerAbi,
            functionName: "licenseExpiry",
            args: [address, BigInt(codeId)],
          },
        ]
      : [],
  });

  const balance = address && data?.[0]?.result ? Number(data[0].result) : 0;
  const expiry = address && data?.[1]?.result ? Number(data[1].result) : 0;

  return {
    license: address ? { balance, expiry } : null,
    isLoading,
    error: address ? error : null,
    refetch,
  };
}
