"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCodeInfo } from "../../hooks/useCodeInfo";
import { useLicenseManagerWrite } from "../../hooks/useLicenseManagerWrite";
import { useOwnedCodes } from "../../hooks/useOwnedCodes";

export function ManageCodeStateCard() {
  const [codeId, setCodeId] = useState(0);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [cipherCid, setCipherCid] = useState("");
  const [codeHash, setCodeHash] = useState<`0x${string}` | "">("");

  const { code, isLoading, refetch } = useCodeInfo(codeId);
  const pause = useLicenseManagerWrite("pauseCodeExecution");
  const unpause = useLicenseManagerWrite("unpauseCodeExecution");
  const updateName = useLicenseManagerWrite("updateCodeMetadata");
  const updateCodeMutation = useLicenseManagerWrite("updateCode");
  const { codes: ownedCodes, isLoading: isCodesLoading } = useOwnedCodes();

  const hasOwnedCodes = ownedCodes.length > 0;
  const codeSelectValue = useMemo(() => (codeId > 0 ? String(codeId) : ""), [codeId]);

  useEffect(() => {
    if (!codeId && ownedCodes.length > 0) {
      setCodeId(ownedCodes[0].codeId);
    }
  }, [codeId, ownedCodes]);

  useEffect(() => {
    if (!code) return;
    setName(code.name ?? "");
    setVersion(code.version ?? "");
    setCipherCid(code.cipherCid ?? "");
    setCodeHash((code.codeHash ?? "") as `0x${string}` | "");
  }, [code]);

  const onUpdateName: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    try {
      await updateName.execute([BigInt(codeId), name]);
      await refetch();
    } catch {
      // 에러는 훅에서 노출됨
    }
  };

  const onUpdateCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updateCodeMutation.execute([
        BigInt(codeId),
        ((codeHash || code?.codeHash) ?? "0x0") as `0x${string}`,
        (cipherCid || code?.cipherCid) ?? "",
        version || code?.version || "",
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
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">
          코드 상태 관리
        </h2>
        <p className="text-sm text-text-light-50 dark:text-text-dark-50">
          일시정지, 메타데이터 갱신을 수행합니다.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">코드 ID</span>
          <select
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            value={codeSelectValue}
            onChange={(event) => {
              const value = event.target.value;
              setCodeId(value ? Number(value) : 0);
            }}
            disabled={isCodesLoading || !hasOwnedCodes}
          >
            <option value="">
              {isCodesLoading ? "코드 목록을 불러오는 중..." : "코드를 선택하세요"}
            </option>
            {ownedCodes.map((ownedCode) => (
              <option key={ownedCode.codeId} value={ownedCode.codeId}>
                #{ownedCode.codeId} · {ownedCode.cipherCid}
              </option>
            ))}
          </select>
          {!isCodesLoading && !hasOwnedCodes && (
            <span className="text-xs text-text-light-50 dark:text-text-dark-50">
              등록된 코드가 없습니다. 먼저 코드를 등록하세요.
            </span>
          )}
        </label>

        <div className="rounded border border-primary-25 bg-background-light-50 p-4 text-sm shadow-sm dark:border-primary-50 dark:bg-background-dark-75">
          {isLoading ? (
            <p className="text-text-light-50 dark:text-text-dark-50">코드 정보를 불러오는 중...</p>
          ) : code && code.exists ? (
            <ul className="space-y-1">
              <li>
                <span className="text-text-light-50 dark:text-text-dark-50">해시:</span>{" "}
                <span className="font-mono text-xs text-text-light-100 dark:text-text-dark-100">
                  {code.codeHash}
                </span>
              </li>
              <li>
                <span className="text-text-light-50 dark:text-text-dark-50">CID:</span>{" "}
                <span className="text-text-light-100 dark:text-text-dark-100">
                  {code.cipherCid}
                </span>
              </li>
              <li>
                <span className="text-text-light-50 dark:text-text-dark-50">이름:</span>{" "}
                <span className="text-text-light-100 dark:text-text-dark-100">
                  {code.name || "-"}
                </span>
              </li>
              <li>
                <span className="text-text-light-50 dark:text-text-dark-50">버전:</span>{" "}
                <span className="text-text-light-100 dark:text-text-dark-100">
                  {code.version || "-"}
                </span>
              </li>
              <li>
                <span className="text-text-light-50 dark:text-text-dark-50">상태:</span>{" "}
                <span className="text-text-light-100 dark:text-text-dark-100">
                  {code.paused ? "일시정지됨" : "활성"}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-accent-100">코드 정보를 찾을 수 없습니다.</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg bg-accent-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-accent-75 disabled:cursor-not-allowed disabled:bg-accent-50 disabled:text-text-dark-50"
            onClick={onPause}
            disabled={pause.isPending || !code?.exists}
          >
            {pause.isPending ? "일시정지 중..." : "일시정지"}
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-secondary-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-secondary-75 disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-text-dark-50"
            onClick={onUnpause}
            disabled={unpause.isPending || !code?.exists}
          >
            {unpause.isPending ? "재개 중..." : "재개"}
          </button>
        </div>

        <form
          className="flex flex-col gap-4 rounded border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-primary-50 dark:bg-background-dark-75"
          onSubmit={onUpdateName}
        >
          <h3 className="text-sm font-semibold text-primary-100 dark:text-text-dark-100">
            이름 갱신
          </h3>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-text-light-75 dark:text-text-dark-75">새 이름</span>
            <input
              type="text"
              className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
              placeholder="코드 이름"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-primary-75 disabled:cursor-not-allowed disabled:bg-primary-50 disabled:text-text-dark-75"
            disabled={updateName.isPending || !code?.exists}
          >
            {updateName.isPending ? "갱신 중..." : "이름 업데이트"}
          </button>
        </form>

        <form
          className="flex flex-col gap-4 rounded border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-primary-50 dark:bg-background-dark-75"
          onSubmit={onUpdateCode}
        >
          <h3 className="text-sm font-semibold text-primary-100 dark:text-text-dark-100">
            코드 및 버전 갱신
          </h3>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-text-light-75 dark:text-text-dark-75">새 코드 해시</span>
            <input
              type="text"
              className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 font-mono text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
              placeholder="0x..."
              value={codeHash}
              onChange={(event) => setCodeHash(event.target.value as `0x${string}` | "")}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-text-light-75 dark:text-text-dark-75">새 암호화 CID</span>
            <input
              type="text"
              className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
              placeholder="bafy..."
              value={cipherCid}
              onChange={(event) => setCipherCid(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-text-light-75 dark:text-text-dark-75">새 버전</span>
            <input
              type="text"
              className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
              placeholder="예: 1.0.1"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-primary-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-primary-75 disabled:cursor-not-allowed disabled:bg-primary-50 disabled:text-text-dark-75"
            disabled={updateCodeMutation.isPending || !code?.exists}
          >
            {updateCodeMutation.isPending ? "갱신 중..." : "코드 업데이트"}
          </button>
        </form>
      </div>
    </section>
  );
}
