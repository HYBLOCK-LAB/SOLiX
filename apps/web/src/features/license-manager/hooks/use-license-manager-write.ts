"use client";

import { useMemo } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { licenseManagerAbi } from "../abi";
import { LICENSE_MANAGER_ADDRESS } from "../constants";

export function useLicenseManagerWrite(functionName: (typeof licenseManagerAbi)[number]["name"]) {
  const {
    data: hash,
    writeContractAsync,
    isPending,
    error: writeError,
  } = useWriteContract();

  const wait = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });

  const execute = useMemo(
    () =>
      async (args: readonly unknown[]) =>
        writeContractAsync({
          address: LICENSE_MANAGER_ADDRESS,
          abi: licenseManagerAbi,
          functionName,
          args,
        }),
    [functionName, writeContractAsync]
  );

  return {
    execute,
    isPending: isPending || wait.isLoading,
    isSuccess: wait.isSuccess,
    transactionHash: hash,
    error: writeError ?? wait.error,
  };
}
