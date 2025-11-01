"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLicenseManagerWrite } from "../../hooks/use-license-manager-write";
import { useRegisteredCodes } from "../../hooks/use-registered-codes";

export function ExecutionRequestCard() {
  const [codeId, setCodeId] = useState(0);
  const [recipientPubKey, setRecipientPubKey] = useState<`0x${string}` | "">("");
  const [status, setStatus] = useState<string | null>(null);

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
    if (!recipientPubKey) {
      setStatus("수신자 공개키를 입력해주세요.");
      return;
    }

    try {
      setStatus(null);
      await execute([BigInt(codeId), recipientPubKey]);
    } catch (err) {
      setStatus(`트랜잭션 실패: ${(err as Error).message}`);
    }
  };

  return (
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">
          실행 요청
        </h2>
        <p className="text-sm text-text-light-50 dark:text-text-dark-50">
          라이선스를 소모하여 실행을 요청합니다. 공개키는 실행 조각을 복호화할 키입니다.
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

        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">
            수신자 공개키 (hex)
          </span>
          <input
            type="text"
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 font-mono text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            placeholder="0x..."
            value={recipientPubKey}
            onChange={(event) => setRecipientPubKey(event.target.value as `0x${string}` | "")}
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-accent-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-accent-75 disabled:cursor-not-allowed disabled:bg-accent-50 disabled:text-text-dark-75"
          disabled={isPending}
        >
          {isPending ? "요청 전송 중..." : "실행 요청"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-text-light-50 dark:text-text-dark-50">{status}</p>}
        {isSuccess && transactionHash && (
          <p className="text-secondary-100">요청 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
