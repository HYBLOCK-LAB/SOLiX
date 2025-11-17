import { useEffect, useMemo, useRef, useState } from "react";
import type { ShardRun } from "./useShardSubmissions";
import {
  combineDecryptedShares,
  decryptShardPublication,
  fetchShardPublication,
} from "../services/shards/shardDecryptor";
import type { SecretSharePayload } from "../services/shards/types";
import { findExecutionKey } from "../services/executionKeyService";

export type ShardRecoveryStatus = "pending" | "decrypting" | "ready" | "error";

export interface ShardRecoveryEntry {
  committee: `0x${string}`;
  status: ShardRecoveryStatus;
  message?: string;
}

export interface UseShardRecoveryParams {
  run: ShardRun | null;
  recipientPublicKey: `0x${string}` | null;
  runNonce?: `0x${string}` | null;
}

export interface UseShardRecoveryResult {
  shardStates: Record<string, ShardRecoveryEntry>;
  recoveredSecret: `0x${string}` | null;
  decryptedCount: number;
  error: string | null;
  isProcessing: boolean;
  executionKey: ReturnType<typeof findExecutionKey> | null;
}

export function useShardRecovery({
  run,
  recipientPublicKey,
  runNonce,
}: UseShardRecoveryParams): UseShardRecoveryResult {
  const executionKey = useMemo(() => {
    if (!recipientPublicKey) return null;
    const record = findExecutionKey(recipientPublicKey);
    if (!record) return null;
    if (runNonce && record.runNonce && record.runNonce.toLowerCase() !== runNonce.toLowerCase()) {
      return null;
    }
    return record;
  }, [recipientPublicKey, runNonce]);

  const [shardStates, setShardStates] = useState<Record<string, ShardRecoveryEntry>>({});
  const [shares, setShares] = useState<SecretSharePayload[]>([]);
  const [recoveredSecret, setRecoveredSecret] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recoveredSecretRef = useRef<`0x${string}` | null>(null);

  useEffect(() => {
    setShardStates({});
    setShares([]);
    setRecoveredSecret(null);
    setError(null);
    setIsProcessing(false);
    recoveredSecretRef.current = null;
  }, [run?.requester, run?.runNonce, executionKey?.privateKey]);

  useEffect(() => {
    if (!run || !executionKey) return;
    if (runNonce && run.runNonce.toLowerCase() !== runNonce.toLowerCase()) return;

    let cancelled = false;
    const activeRun = run;
    const SHARD_THRESHOLD = 3;

    async function processShards() {
      setIsProcessing(true);
      const tasks = activeRun.shards.map(async (shard) => {
        if (cancelled) return;
        const stateKey = shard.committee.toLowerCase();
        setShardStates((prev) => ({
          ...prev,
          [stateKey]:
            prev[stateKey]?.status === "ready"
              ? prev[stateKey]
              : { committee: shard.committee, status: "decrypting" },
        }));

        try {
          if (!executionKey) {
            throw new Error("Execution key not available for shard decryption");
          }
          const publication = await fetchShardPublication(shard.shardCid);
          console.log("[recovery] Fetched shard publication", {
            committee: shard.committee,
            byteLength: publication.byteLength,
            shareIndex: publication.shareIndex,
          });
          if (cancelled) return;
          const decrypted = await decryptShardPublication(publication, executionKey.privateKey);
          if (cancelled) return;
          console.log("[recovery] Decrypted shard", {
            committee: shard.committee,
            shareIndex: decrypted.index,
            byteLength: decrypted.byteLength,
          });

          setShares((prev) => {
            const next = [...prev.filter((item) => item.index !== decrypted.index), decrypted];
            const requiredShares = Math.min(activeRun.threshold, SHARD_THRESHOLD);
            if (next.length >= requiredShares && !recoveredSecretRef.current) {
              try {
                const secret = combineDecryptedShares(next.slice(0, requiredShares));
                recoveredSecretRef.current = secret;
                setRecoveredSecret(secret);
                console.log("[recovery] Combined secret", {
                  requiredShares,
                  bundleBytes: (secret.length - 2) / 2,
                });
              } catch (combineError) {
                setError((combineError as Error).message);
              }
            }
            return next;
          });

          setShardStates((prev) => ({
            ...prev,
            [stateKey]: { committee: shard.committee, status: "ready" },
          }));
        } catch (decryptError) {
          setShardStates((prev) => ({
            ...prev,
            [stateKey]: {
              committee: shard.committee,
              status: "error",
              message: (decryptError as Error).message,
            },
          }));
        }
      });

      await Promise.allSettled(tasks);
      if (!cancelled) {
        setIsProcessing(false);
      }
    }

    processShards().catch((processError) => {
      setError((processError as Error).message);
      setIsProcessing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [executionKey, run, runNonce]);

  return {
    shardStates,
    recoveredSecret,
    decryptedCount: shares.length,
    error,
    isProcessing,
    executionKey,
  };
}
