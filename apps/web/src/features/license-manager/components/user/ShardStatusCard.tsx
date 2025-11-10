"use client";

import { useEffect, useMemo, useState } from "react";
import { useShardSubmissions } from "../../hooks/useShardSubmissions";
import { fetchShardPublication, decryptShardPublication, combineDecryptedShares } from "../../services/shards/shardDecryptor";
import type { SecretSharePayload } from "../../services/shards/types";
import { findExecutionKey } from "../../services/executionKeyService";

interface ShardStatusCardProps {
  codeId: number;
  recipientPublicKey: `0x${string}` | null;
  runNonce: `0x${string}` | null;
}

interface ShardState {
  committee: `0x${string}`;
  status: "pending" | "decrypting" | "ready" | "error";
  message?: string;
}

export function ShardStatusCard({ codeId, recipientPublicKey, runNonce }: ShardStatusCardProps) {
  const { latestRun, isLoading } = useShardSubmissions(codeId, runNonce);
  const [shardStates, setShardStates] = useState<Record<string, ShardState>>({});
  const [shares, setShares] = useState<SecretSharePayload[]>([]);
  const [recoveredSecret, setRecoveredSecret] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const keyRecord = useMemo(() => {
    if (!recipientPublicKey) return null;
    const record = findExecutionKey(recipientPublicKey);
    if (!record) return null;
    if (runNonce && record.runNonce && record.runNonce.toLowerCase() !== runNonce.toLowerCase()) {
      return null;
    }
    return record;
  }, [recipientPublicKey, runNonce]);

  useEffect(() => {
    setShardStates({});
    setShares([]);
    setRecoveredSecret(null);
    setError(null);
  }, [latestRun?.requester, latestRun?.runNonce, recipientPublicKey, runNonce]);

  useEffect(() => {
    if (!latestRun || !recipientPublicKey || !keyRecord) {
      return;
    }
    if (runNonce && latestRun.runNonce.toLowerCase() !== runNonce.toLowerCase()) {
      return;
    }

    let cancelled = false;

    async function processShards() {
      for (const shard of latestRun.shards) {
        if (cancelled) break;
        const key = shard.committee.toLowerCase();
        setShardStates((prev) => {
          const current = prev[key];
          if (current?.status === "ready") {
            return prev;
          }
          return {
            ...prev,
            [key]: { committee: shard.committee, status: "decrypting" },
          };
        });

        try {
          const publication = await fetchShardPublication(shard.shardCid);
          const decrypted = await decryptShardPublication(publication, keyRecord.privateKey);
          if (cancelled) return;
          setShares((prev) => {
            const next = [...prev.filter((item) => item.index !== decrypted.index), decrypted];
            if (next.length >= latestRun.threshold) {
              try {
                const secret = combineDecryptedShares(next.slice(0, latestRun.threshold));
                setRecoveredSecret((existing) => existing ?? secret);
              } catch (combineError) {
                setError((combineError as Error).message);
              }
            }
            return next;
          });

          setShardStates((prev) => ({
            ...prev,
            [key]: { committee: shard.committee, status: "ready" },
          }));
        } catch (decryptError) {
          setShardStates((prev) => ({
            ...prev,
            [key]: {
              committee: shard.committee,
              status: "error",
              message: (decryptError as Error).message,
            },
          }));
        }
      }
    }

    processShards();
    return () => {
      cancelled = true;
    };
  }, [latestRun, recipientPublicKey, keyRecord]);

  if (!recipientPublicKey || !runNonce) {
    return (
      <section className="mt-6 rounded-2xl border border-primary-25 bg-background-light-50 p-4 text-sm dark:border-primary-75 dark:bg-background-dark-75">
        <p className="text-text-light-50 dark:text-text-dark-50">실행 요청을 먼저 보내 임시 공개키를 생성하세요.</p>
      </section>
    );
  }

  if (!latestRun) {
    return (
      <section className="mt-6 rounded-2xl border border-primary-25 bg-background-light-50 p-4 text-sm dark:border-primary-75 dark:bg-background-dark-75">
        <p className="text-text-light-50 dark:text-text-dark-50">
          제출된 shard 정보가 없습니다. 위원회 응답을 기다리는 중입니다.
        </p>
      </section>
    );
  }

  const decryptingStates = latestRun.shards.map((shard) => {
    const key = shard.committee.toLowerCase();
    return shardStates[key] ?? { committee: shard.committee, status: "pending" };
  });

  return (
    <section className="mt-6 rounded-2xl border border-primary-25 bg-background-light-50 p-4 text-sm shadow-lg dark:border-primary-75 dark:bg-background-dark-75">
      <h3 className="text-base font-semibold text-primary-100 dark:text-text-dark-100">Shard 상태</h3>
      <p className="mt-1 text-xs text-text-light-50 dark:text-text-dark-50">
        요청자 {shortenAddress(latestRun.requester)} · 임계값 {latestRun.threshold} · RunNonce {shortenAddress(latestRun.runNonce)}
      </p>

      <ul className="mt-4 space-y-3 text-xs">
        {decryptingStates.map((entry) => (
          <li key={entry.committee} className="rounded border border-primary-25 p-3 dark:border-primary-75">
            <p className="font-mono text-text-light-75 dark:text-text-dark-75">{entry.committee}</p>
            <p className="mt-1 text-text-light-50 dark:text-text-dark-50">상태: {renderShardState(entry.status)}</p>
            {entry.message && (
              <p className="text-rose-500">{entry.message}</p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-text-light-50 dark:text-text-dark-50">
        복호화된 조각: {shares.length} / {latestRun.threshold}
      </p>

      {recoveredSecret && (
        <div className="mt-4 rounded border border-secondary-50 bg-secondary-10 p-3 text-xs text-secondary-100 dark:border-secondary-75 dark:bg-secondary-25">
          <p className="font-semibold">복원된 키</p>
          <p className="break-all font-mono">{recoveredSecret}</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-500">복원 중 오류: {error}</p>
      )}

      {isLoading && <p className="mt-2 text-xs text-text-light-50 dark:text-text-dark-50">이벤트 동기화 중...</p>}
    </section>
  );
}

function renderShardState(state: ShardState["status"]): string {
  switch (state) {
    case "decrypting":
      return "복호화 중";
    case "ready":
      return "완료";
    case "error":
      return "오류";
    default:
      return "대기 중";
  }
}

function shortenAddress(value: `0x${string}` | null | undefined) {
  if (!value) return "";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
