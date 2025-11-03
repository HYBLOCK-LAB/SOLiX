import type { Address, PublicClient } from "viem";
import { LICENSE_MANAGER_ADDRESS } from "../constants";
import { licenseManagerAbi } from "../abi";
import type { UserLicenseSummary } from "../types";

interface CollectIdsParams {
  client: PublicClient;
  account: Address;
}

const BALANCE_BATCH_SIZE = 50;

export async function collectUserLicenseIds({
  client,
  account,
}: CollectIdsParams): Promise<number[]> {
  const nextCodeIdRaw = await client.readContract({
    address: LICENSE_MANAGER_ADDRESS,
    abi: licenseManagerAbi,
    functionName: "nextCodeId",
  });

  const nextCodeId = Number(nextCodeIdRaw);
  if (nextCodeId <= 1) {
    return [];
  }

  const discoveredIds: number[] = [];
  for (let start = 1; start < nextCodeId; start += BALANCE_BATCH_SIZE) {
    const chunkIds = Array.from(
      { length: Math.min(BALANCE_BATCH_SIZE, nextCodeId - start) },
      (_, idx) => start + idx,
    );

    const balances = (await client.readContract({
      address: LICENSE_MANAGER_ADDRESS,
      abi: licenseManagerAbi,
      functionName: "balanceOfBatch",
      args: [
        chunkIds.map(() => account),
        chunkIds.map((id) => BigInt(id)),
      ],
    })) as readonly bigint[];

    chunkIds.forEach((id, index) => {
      if (balances[index] > 0n) {
        discoveredIds.push(id);
      }
    });
  }

  return discoveredIds.sort((a, b) => a - b);
}

interface LoadSummaryParams {
  client: PublicClient;
  account: Address;
  codeId: number;
}

export async function loadLicenseSummary({
  client,
  account,
  codeId,
}: LoadSummaryParams): Promise<UserLicenseSummary | null> {
  const [balanceRaw, expiryRaw, codeInfo] = await Promise.all([
    client.readContract({
      address: LICENSE_MANAGER_ADDRESS,
      abi: licenseManagerAbi,
      functionName: "balanceOf",
      args: [account, BigInt(codeId)],
    }),
    client.readContract({
      address: LICENSE_MANAGER_ADDRESS,
      abi: licenseManagerAbi,
      functionName: "licenseExpiry",
      args: [account, BigInt(codeId)],
    }),
    client.readContract({
      address: LICENSE_MANAGER_ADDRESS,
      abi: licenseManagerAbi,
      functionName: "code",
      args: [BigInt(codeId)],
    }),
  ]);

  const balance = Number(balanceRaw);
  const expiry = Number(expiryRaw);
  const [codeHash, cipherCid, name, version, paused, exists] = codeInfo as readonly [
    `0x${string}`,
    string,
    string,
    string,
    boolean,
    boolean,
  ];

  if (!exists || balance === 0) {
    return null;
  }

  return {
    codeId,
    balance,
    expiry,
    codeHash: (codeHash ?? "0x0") as `0x${string}`,
    cipherCid: cipherCid ?? "",
    name: name ?? "",
    version: version ?? "",
    paused,
  };
}

type GenericEventArgs = {
  from?: Address;
  to?: Address;
  id?: bigint;
  ids?: readonly bigint[];
};

type LogLike<TArgs extends GenericEventArgs> = {
  args?: TArgs;
};

export function pickCodeIdsFromTransferSingleLogs<
  TArgs extends GenericEventArgs,
>(account: Address, logs: Array<LogLike<TArgs>>): number[] {
  const codeIds = new Set<number>();

  logs.forEach((log) => {
    const args = log.args;
    if (!args) return;

    const { from, to, id } = args;
    if (typeof id === "bigint" && id > 0n && (from === account || to === account)) {
      codeIds.add(Number(id));
    }
  });

  return Array.from(codeIds);
}

export function pickCodeIdsFromTransferBatchLogs<
  TArgs extends GenericEventArgs,
>(account: Address, logs: Array<LogLike<TArgs>>): number[] {
  const codeIds = new Set<number>();

  logs.forEach((log) => {
    const args = log.args;
    if (!args) return;

    const { from, to, ids } = args;
    if (!ids || (from !== account && to !== account)) {
      return;
    }

    ids.forEach((id) => {
      if (id > 0n) {
        codeIds.add(Number(id));
      }
    });
  });

  return Array.from(codeIds);
}
