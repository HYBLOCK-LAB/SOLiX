"use client";

import { FormEvent, useState } from "react";
import { useLicenseManagerWrite } from "../../hooks/use-license-manager-write";

export function IssueLicenseCard() {
  const [codeId, setCodeId] = useState(0);
  const [recipient, setRecipient] = useState<`0x${string}` | "">("");
  const [runs, setRuns] = useState(1);
  const [expiry, setExpiry] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const { execute, isPending, isSuccess, transactionHash, error } = useLicenseManagerWrite("issueLicense");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient) {
      setStatus("수령자 주소를 입력해주세요.");
      return;
    }

    const expiryTimestamp = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : 0;

    try {
      setStatus(null);
      await execute([BigInt(codeId), recipient, BigInt(runs), BigInt(expiryTimestamp)]);
    } catch (err) {
      setStatus(`트랜잭션 실패: ${(err as Error).message}`);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">라이선스 발급</h2>
        <p className="text-sm text-slate-400">소유한 코드에 대해 실행권을 발급합니다.</p>
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
          <span className="text-sm text-slate-300">수령자 주소</span>
          <input
            type="text"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
            placeholder="0x..."
            value={recipient}
            onChange={(event) => setRecipient(event.target.value as `0x${string}` | "")}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">실행 가능 횟수</span>
          <input
            type="number"
            min={1}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={runs}
            onChange={(event) => setRuns(Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">만료일 (옵션)</span>
          <input
            type="datetime-local"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "트랜잭션 전송 중..." : "라이선스 발급"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-slate-400">{status}</p>}
        {isSuccess && transactionHash && (
          <p className="text-emerald-400">발급 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
