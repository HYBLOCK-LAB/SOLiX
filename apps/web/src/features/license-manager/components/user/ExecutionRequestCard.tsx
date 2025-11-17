"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useLicenseManagerWrite } from "../../hooks/useLicenseManagerWrite";
import { useUserLicenses } from "../../hooks/useUserLicenses";
import {
  createExecutionKeyPair,
  removeExecutionKey,
  storeExecutionKeyPair,
  type ExecutionKeyPair,
} from "../../services/executionKeyService";
import { ShardStatusCard } from "./ShardStatusCard";

function truncateKey(value: `0x${string}`): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function generateRunNonce(): `0x${string}` {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    const fallback = Array.from({ length: 32 }, (_, index) =>
      ((Date.now() + index) % 256).toString(16).padStart(2, "0"),
    ).join("");
    return `0x${fallback}` as `0x${string}`;
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `0x${hex}` as `0x${string}`;
}

export function ExecutionRequestCard() {
  const [codeId, setCodeId] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [latestPublicKey, setLatestPublicKey] = useState<`0x${string}` | null>(null);
  const [latestRunNonce, setLatestRunNonce] = useState<`0x${string}` | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const { execute, isPending, isSuccess, transactionHash, error } =
    useLicenseManagerWrite("requestCodeExecution");
  const { licenses: ownedLicenses, isLoading: isLicensesLoading } = useUserLicenses();
  const { address } = useAccount();

  const hasAvailableCodes = ownedLicenses.length > 0;
  const selectedCode = useMemo(
    () => ownedLicenses.find((code) => code.codeId === codeId) ?? null,
    [ownedLicenses, codeId],
  );
  const codeSelectValue = useMemo(() => (codeId > 0 ? String(codeId) : ""), [codeId]);

  useEffect(() => {
    if (!codeId && ownedLicenses.length > 0) {
      setCodeId(ownedLicenses[0].codeId);
    }
  }, [codeId, ownedLicenses]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!codeId) {
      setStatus("실행을 요청할 코드를 선택해주세요.");
      return;
    }

    let keyPair: ExecutionKeyPair | null = null;
    setIsPreparing(true);
    setStatus("임시 공개키를 생성하고 있습니다…");
    setLatestPublicKey(null);
    setLatestRunNonce(null);

    try {
      keyPair = await createExecutionKeyPair();
      const runNonce = generateRunNonce();
      storeExecutionKeyPair(keyPair, { runNonce, codeId });
      setStatus("임시 키가 준비되었습니다. 트랜잭션을 전송합니다…");
      await execute([BigInt(codeId), runNonce, keyPair.publicKey]);
      setLatestPublicKey(keyPair.publicKey);
      setLatestRunNonce(runNonce);
      setStatus("임시 키 쌍이 생성되어 로컬에 저장되었습니다.");
    } catch (err) {
      if (keyPair) {
        removeExecutionKey(keyPair.publicKey);
      }
      setStatus((err as Error).message);
    } finally {
      setIsPreparing(false);
    }
  };

  const dispatchToCommittee = async () => {
    if (!codeId || !address || !latestRunNonce || !latestPublicKey) {
      setDispatchStatus("실행 요청이 완료된 뒤에 다시 시도해주세요.");
      return;
    }
    setIsDispatching(true);
    setDispatchStatus("위원회로 요청을 전달하고 있습니다...");
    try {
      type CommitteeDispatchResponse = {
        success?: boolean;
        queuedCount?: number;
        totalCommittees?: number;
        responses?: Array<{ url: string; queued: boolean; reason?: string }>;
        errors?: string[];
      };
      const response = await fetch("/api/committee/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeId,
          requester: address,
          runNonce: latestRunNonce,
          recipientPubKey: latestPublicKey,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as CommitteeDispatchResponse;
      if (!response.ok) {
        throw new Error(body?.errors?.[0] ?? "위원회 요청에 실패했습니다.");
      }
      const totalCommittees = body.totalCommittees ?? body.responses?.length ?? 0;
      const queuedCount =
        body.queuedCount ?? body.responses?.filter((result) => result.queued).length ?? 0;
      const baseMessage =
        typeof totalCommittees === "number"
          ? `위원회 ${queuedCount ?? 0}/${totalCommittees} 노드에 전달되었습니다.`
          : "위원회 응답을 수신했습니다.";
      const failedReasons =
        body.responses
          ?.filter((result) => !result.queued && result.reason)
          .map((result) => `${new URL(result.url).host}: ${result.reason}`)
          .filter(Boolean) ?? [];
      const errorMessage = body.errors?.[0] ?? failedReasons[0];
      setDispatchStatus(errorMessage ? `${baseMessage} (${errorMessage})` : baseMessage);
    } catch (err) {
      setDispatchStatus((err as Error).message);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4 space-y-2">
        <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">
          실행 요청
        </h2>
        <p className="text-sm text-text-light-50 dark:text-text-dark-50">
          버튼을 누르면 임시 secp256k1 키 쌍이 자동으로 생성되어 로컬에 저장되고, 해당 공개키로 실행
          요청이 제출됩니다.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">코드 ID</span>
          <select
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            value={codeSelectValue}
            onChange={(event) => {
              const value = event.target.value;
              setCodeId(value ? Number(value) : 0);
            }}
            disabled={isLicensesLoading || !hasAvailableCodes}
          >
            <option value="">
              {isLicensesLoading ? "코드 목록을 불러오는 중..." : "코드를 선택하세요"}
            </option>
            {ownedLicenses.map((code) => (
              <option key={code.codeId} value={code.codeId}>
                #{code.codeId} · {code.name || code.cipherCid}
              </option>
            ))}
          </select>
          {!isLicensesLoading && !hasAvailableCodes && (
            <span className="text-xs text-text-light-50 dark:text-text-dark-50">
              보유한 라이선스가 없습니다. 먼저 라이선스를 발급받으세요.
            </span>
          )}
        </label>

        <button
          type="submit"
          className="rounded-lg bg-accent-100 px-4 py-[10px] text-sm font-bold uppercase tracking-wide text-text-dark-100 hover:bg-accent-75 disabled:bg-accent-25 disabled:text-text-dark-50"
          disabled={isPending || isPreparing}
        >
          {isPreparing ? "잠시만 기다려주세요..." : isPending ? "트랜잭션 전송 중..." : "실행 요청"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-secondary-50 px-4 py-[10px] text-sm font-semibold text-secondary-100 transition hover:bg-secondary-10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isSuccess || !latestRunNonce || !latestPublicKey || isDispatching}
          onClick={dispatchToCommittee}
        >
          {isDispatching ? "위원회로 전달 중..." : "위원회에 실행 정보 전달"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-text-light-50 dark:text-text-dark-50">{status}</p>}
        {latestPublicKey && (
          <p className="font-mono text-xs text-secondary-100">
            공개키: {truncateKey(latestPublicKey)} (로컬 저장됨)
          </p>
        )}
        {latestRunNonce && (
          <p className="font-mono text-xs text-secondary-100">
            Run Nonce: {truncateKey(latestRunNonce)}
          </p>
        )}
        {isSuccess && transactionHash && (
          <p className="text-secondary-100">요청 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && (
          <p className="max-h-[4.5rem] overflow-hidden text-rose-500 line-clamp-3">
            오류: {error.message}
          </p>
        )}
        {dispatchStatus && (
          <p className="text-xs text-text-light-50 dark:text-text-dark-50">{dispatchStatus}</p>
        )}
      </footer>

      {codeId > 0 && (
        <ShardStatusCard
          codeId={codeId}
          recipientPublicKey={latestPublicKey}
          runNonce={latestRunNonce}
          cipherCid={selectedCode?.cipherCid}
          codeHash={selectedCode?.codeHash}
          codeName={selectedCode?.name || selectedCode?.cipherCid}
        />
      )}
    </section>
  );
}
