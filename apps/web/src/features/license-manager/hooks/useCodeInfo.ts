import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { licenseManagerAbi } from "../abi";
import { LICENSE_MANAGER_ADDRESS } from "../constants";

export function useCodeInfo(codeId: number | bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    functionName: "code",
    args: [BigInt(codeId)],
  });

  const code = useMemo(() => {
    if (!data) return null;
    const [codeHash, cipherCid, name, version, paused, exists] = data as readonly [
      string,
      string,
      string,
      string,
      boolean,
      boolean,
    ];
    return { codeHash, cipherCid, name, version, paused, exists };
  }, [data]);

  return { code, isLoading, error, refetch };
}
