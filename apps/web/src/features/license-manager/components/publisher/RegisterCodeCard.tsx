"use client";

import { FormEvent, useState } from "react";
import { hashFile } from "../../utils/hash-file";
import { useLicenseManagerWrite } from "../../hooks/use-license-manager-write";

export function RegisterCodeCard() {
  const [codeHash, setCodeHash] = useState<`0x${string}` | "">("");
  const [cipherCid, setCipherCid] = useState("");
  const [isHashing, setIsHashing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const { execute, isPending, isSuccess, transactionHash, error } = useLicenseManagerWrite("registerCode");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!codeHash || !cipherCid) {
      setStatus("codeHash와 cipherCid를 입력해주세요.");
      return;
    }

    try {
      setStatus(null);
      await execute([codeHash, cipherCid]);
    } catch (err) {
      setStatus(`트랜잭션 실패: ${(err as Error).message}`);
    }
  };

  const onFileSelected = async (file: File | null) => {
    if (!file) return;
    setIsHashing(true);
    try {
      const hash = await hashFile(file);
      setCodeHash(hash);
      setStatus(`코드 해시 생성 완료: ${hash}`);
    } catch (err) {
      setStatus(`파일 해시 생성 실패: ${(err as Error).message}`);
    } finally {
      setIsHashing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">코드 등록</h2>
        <p className="text-sm text-slate-400">코드를 해시하여 온체인에 등록하세요.</p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">코드 파일</span>
          <input
            type="file"
            accept=".wasm,.zip,.js,.ts"
            onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <span className="text-xs text-slate-500">
            해시는 로컬에서 계산되며, 파일은 업로드되지 않습니다.
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">코드 해시 (keccak256)</span>
          <input
            type="text"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
            placeholder="0x..."
            value={codeHash}
            onChange={(event) => setCodeHash(event.target.value as `0x${string}` | "")}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-slate-300">암호화 파일 CID</span>
          <input
            type="text"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="bafy..."
            value={cipherCid}
            onChange={(event) => setCipherCid(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || isHashing}
        >
          {isHashing ? "파일 해싱 중..." : isPending ? "트랜잭션 전송 중..." : "코드 등록"}
        </button>
      </form>

      <footer className="mt-4 space-y-2 text-sm">
        {status && <p className="text-slate-400">{status}</p>}
        {isSuccess && transactionHash && (
          <p className="text-emerald-400">등록 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
