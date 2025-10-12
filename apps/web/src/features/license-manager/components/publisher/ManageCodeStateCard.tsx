"use client";

import { FormEvent, useState } from "react";
import { useCodeInfo } from "../../hooks/use-code-info";
import { useLicenseManagerWrite } from "../../hooks/use-license-manager-write";

export function ManageCodeStateCard() {
  const [codeId, setCodeId] = useState(0);
  const [cipherCid, setCipherCid] = useState("");
  const [codeHash, setCodeHash] = useState<`0x${string}` | "">("");

  const { code, isLoading, refetch } = useCodeInfo(codeId);
  const pause = useLicenseManagerWrite("pauseCodeExecution");
  const unpause = useLicenseManagerWrite("unpauseCodeExecution");
  const updateMetadata = useLicenseManagerWrite("updateCodeMetadata");

  const onUpdateMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updateMetadata.execute([
        BigInt(codeId),
        (codeHash || code?.codeHash ?? "0x0") as `0x${string}`,
        cipherCid || code?.cipherCid ?? "",
      ]);
      await refetch();
    } catch {
      // 에러는 훅에서 노출됨
    }
  };

  const onPause = async () => {
    try {
      await pause.execute([BigInt(codeId)]);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  const onUnpause = async () => {
    try {
      await unpause.execute([BigInt(codeId)]);
      await refetch();
    } catch {
      // handled by hook
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">코드 상태 관리</h2>
        <p className="text-sm text-slate-400">일시정지, 메타데이터 갱신을 수행합니다.</p>
      </header>

      <div className="flex flex-col gap-4">
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

        <div className="rounded border border-slate-800 bg-slate-950/60 p-4 text-sm">
          {isLoading ? (
            <p className="text-slate-400">코드 정보를 불러오는 중...</p>
          ) : code && code.exists ? (
            <ul className="space-y-1">
              <li>
                <span className="text-slate-400">해시:</span>{" "}
                <span className="font-mono text-xs">{code.codeHash}</span>
              </li>
              <li>
                <span className="text-slate-400">CID:</span> {code.cipherCid}
              </li>
              <li>
                <span className="text-slate-400">상태:</span>{" "}
                {code.paused ? "일시정지됨" : "활성"}
              </li>
            </ul>
          ) : (
            <p className="text-rose-400">코드 정보를 찾을 수 없습니다.</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onPause}
            disabled={pause.isPending || !code?.exists}
          >
            {pause.isPending ? "일시정지 중..." : "일시정지"}
          </button>
          <button
            type="button"
            className="flex-1 rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onUnpause}
            disabled={unpause.isPending || !code?.exists}
          >
            {unpause.isPending ? "재개 중..." : "재개"}
          </button>
        </div>

        <form className="flex flex-col gap-4 rounded border border-slate-800 bg-slate-950/60 p-4" onSubmit={onUpdateMetadata}>
          <h3 className="text-sm font-semibold text-slate-200">메타데이터 갱신</h3>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-300">새 코드 해시</span>
            <input
              type="text"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
              placeholder="0x..."
              value={codeHash}
              onChange={(event) => setCodeHash(event.target.value as `0x${string}` | "")}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-300">새 암호화 CID</span>
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
            className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={updateMetadata.isPending || !code?.exists}
          >
            {updateMetadata.isPending ? "갱신 중..." : "메타데이터 업데이트"}
          </button>
        </form>
      </div>
    </section>
  );
}
