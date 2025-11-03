"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLicenseManagerWrite } from "../../hooks/useLicenseManagerWrite";
import { useRegisteredCodes } from "../../hooks/useRegisteredCodes";
import {
  createExecutionKeyPair,
  removeExecutionKey,
  storeExecutionKeyPair,
  type ExecutionKeyPair,
} from "../../services/executionKeyService";

function truncateKey(value: `0x${string}`): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function ExecutionRequestCard() {
  const [codeId, setCodeId] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [latestPublicKey, setLatestPublicKey] = useState<`0x${string}` | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const { execute, isPending, isSuccess, transactionHash, error } =
    useLicenseManagerWrite("requestCodeExecution");
  const { codes: registeredCodes, isLoading: isCodesLoading } = useRegisteredCodes();

  const hasRegisteredCodes = registeredCodes.length > 0;
  const codeSelectValue = useMemo(() => (codeId > 0 ? String(codeId) : ""), [codeId]);

  useEffect(() => {
    if (!codeId && registeredCodes.length > 0) {
      setCodeId(registeredCodes[0].codeId);
    }
  }, [codeId, registeredCodes]);

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

    try {
      keyPair = await createExecutionKeyPair();
      storeExecutionKeyPair(keyPair);
      await execute([BigInt(codeId), keyPair.publicKey]);
      setLatestPublicKey(keyPair.publicKey);
      setStatus("임시 키 쌍이 생성되어 로컬에 저장되었습니다.");
    } catch (err) {
      if (keyPair) {
        removeExecutionKey(keyPair.publicKey);
      }
      setStatus(`트랜잭션 실패: ${(err as Error).message}`);
    } finally {
      setIsPreparing(false);
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
            disabled={isCodesLoading || !hasRegisteredCodes}
          >
            <option value="">
              {isCodesLoading ? "코드 목록을 불러오는 중..." : "코드를 선택하세요"}
            </option>
            {registeredCodes.map((code) => (
              <option key={code.codeId} value={code.codeId}>
                #{code.codeId} · {code.cipherCid}
              </option>
            ))}
          </select>
          {!isCodesLoading && !hasRegisteredCodes && (
            <span className="text-xs text-text-light-50 dark:text-text-dark-50">
              등록된 코드가 없습니다. 먼저 코드를 등록하세요.
            </span>
          )}
        </label>

        <button
          type="submit"
          className="rounded-lg bg-accent-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-accent-75 disabled:cursor-not-allowed disabled:bg-accent-50 disabled:text-text-dark-75"
          disabled={isPending || isPreparing}
        >
          {isPending || isPreparing ? "요청 전송 중..." : "실행 요청"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-text-light-50 dark:text-text-dark-50">{status}</p>}
        {latestPublicKey && (
          <p className="font-mono text-xs text-secondary-100">
            공개키: {truncateKey(latestPublicKey)} (로컬 저장됨)
          </p>
        )}
        {isSuccess && transactionHash && (
          <p className="text-secondary-100">요청 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
