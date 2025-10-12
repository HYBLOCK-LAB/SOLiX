"use client";

import { FormEvent, useState } from "react";
import { useLicenseManagerWrite } from "../../hooks/use-license-manager-write";

export function ExecutionRequestCard() {
  const [codeId, setCodeId] = useState(0);
  const [recipientPubKey, setRecipientPubKey] = useState<`0x${string}` | "">("");
  const [status, setStatus] = useState<string | null>(null);

  const { execute, isPending, isSuccess, transactionHash, error } = useLicenseManagerWrite("requestCodeExecution");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">실행 요청</h2>
        <p className="text-sm text-slate-400">
          라이선스를 소모하여 실행을 요청합니다. 공개키는 실행 조각을 복호화할 키입니다.
        </p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">코드 ID</span>
          <input
            type="number"
            min={0}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={codeId}
            onChange={(event) => setCodeId(Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">수신자 공개키 (hex)</span>
          <input
            type="text"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
            placeholder="0x..."
            value={recipientPubKey}
            onChange={(event) => setRecipientPubKey(event.target.value as `0x${string}` | "")}
          />
        </label>

        <button
          type="submit"
          className="rounded bg-purple-500 px-4 py-2 text-sm font-semibold text-purple-950 transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "요청 전송 중..." : "실행 요청"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-slate-400">{status}</p>}
        {isSuccess && transactionHash && (
          <p className="text-emerald-400">요청 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
