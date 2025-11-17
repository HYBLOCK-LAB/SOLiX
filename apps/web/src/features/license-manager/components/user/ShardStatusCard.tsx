"use client";

import { useEffect, useMemo, useState } from "react";
import { useShardSubmissions } from "../../hooks/useShardSubmissions";
import { useShardRecovery, type ShardRecoveryEntry } from "../../hooks/useShardRecovery";
import { downloadAndDecryptArtifact } from "../../services/artifact/downloadEncryptedArtifact";
import {
  type EncryptionBundle,
  unpackEncryptionBundle,
} from "../../services/encryption/bundle";

interface ShardStatusCardProps {
  codeId: number;
  recipientPublicKey: `0x${string}` | null;
  runNonce: `0x${string}` | null;
  cipherCid?: string;
  codeHash?: `0x${string}`;
  codeName?: string;
}

export function ShardStatusCard({
  codeId,
  recipientPublicKey,
  runNonce,
  cipherCid,
  codeHash,
  codeName,
}: ShardStatusCardProps) {
  const { latestRun, isLoading } = useShardSubmissions(codeId, runNonce);
  const { shardStates, recoveredSecret, decryptedCount, error, isProcessing } = useShardRecovery({
    run: latestRun ?? null,
    recipientPublicKey,
    runNonce,
  });
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [encryptionBundle, setEncryptionBundle] = useState<EncryptionBundle | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [legacyKeyHex, setLegacyKeyHex] = useState<`0x${string}` | null>(null);
  const [legacyIvInput, setLegacyIvInput] = useState("");

  const normalizedLegacyIv = useMemo(() => {
    if (!legacyKeyHex) return null;
    return normalizeHexInput(legacyIvInput);
  }, [legacyKeyHex, legacyIvInput]);

  const activeBundle = encryptionBundle ?? (legacyKeyHex && normalizedLegacyIv
    ? { keyHex: legacyKeyHex, ivHex: normalizedLegacyIv }
    : null);

  useEffect(() => {
    if (!recoveredSecret) {
      setEncryptionBundle(null);
      setLegacyKeyHex(null);
      setLegacyIvInput("");
      setBundleError(null);
      return;
    }
    try {
      setEncryptionBundle(unpackEncryptionBundle(recoveredSecret));
      setLegacyKeyHex(null);
      setLegacyIvInput("");
      setBundleError(null);
    } catch (bundleParseError) {
      const bytes = recoveredSecret.length > 2 ? (recoveredSecret.length - 2) / 2 : 0;
      const isLegacyLength = bytes === 32;
      if (isLegacyLength) {
        setLegacyKeyHex(recoveredSecret);
        setEncryptionBundle(null);
        setBundleError("이전에 생성된 키입니다. IV를 직접 입력하세요.");
      } else {
        console.error("[shard] Failed to parse encryption bundle", bundleParseError);
        setEncryptionBundle(null);
        setLegacyKeyHex(null);
        setBundleError((bundleParseError as Error).message);
      }
    }
  }, [recoveredSecret]);

  const canDownload =
    Boolean(activeBundle) &&
    Boolean(cipherCid) &&
    Boolean(codeHash) &&
    decryptedCount > 0;

  if (!recipientPublicKey || !runNonce) {
    return (
      <section className="mt-6 rounded-2xl border border-primary-25 bg-background-light-50 p-4 text-sm dark:border-primary-75 dark:bg-background-dark-75">
        <p className="text-text-light-50 dark:text-text-dark-50">
          실행 요청을 먼저 보내 임시 공개키를 생성하세요.
        </p>
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
    return shardStates[key] ?? { committee: shard.committee, status: "pending" as const };
  });

  return (
    <section className="mt-6 rounded-2xl border border-primary-25 bg-background-light-50 p-4 text-sm shadow-lg dark:border-primary-75 dark:bg-background-dark-75">
      <h3 className="text-base font-semibold text-primary-100 dark:text-text-dark-100">
        Shard 상태
      </h3>
      <p className="mt-1 text-xs text-text-light-50 dark:text-text-dark-50">
        요청자 {shortenAddress(latestRun.requester)} · 임계값 {latestRun.threshold} · RunNonce{" "}
        {shortenAddress(latestRun.runNonce)}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {decryptingStates.map((entry) => (
          <div
            key={entry.committee}
            className="rounded border border-primary-25 p-3 shadow-sm dark:border-primary-75"
          >
            <p className="break-all font-mono text-text-light-75 dark:text-text-dark-75">
              {entry.committee}
            </p>
            <p
              className={`t-1 text-text-light-50 dark:text-text-dark-50 ${renderShardState(entry.status) === "오류" ? "text-rose-500" : renderShardState(entry.status) === "완료" ? "text-green-500" : ""}`}
            >
              상태: {renderShardState(entry.status)}
            </p>
            {entry.message && <p className="mt-1 text-rose-500">{entry.message}</p>}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-text-light-50 dark:text-text-dark-50">
        복호화된 조각: {decryptedCount} / {latestRun.threshold}
      </p>
      {cipherCid && (
        <p className="mt-1 break-all text-[11px] text-text-light-50 dark:text-text-dark-50">
          cipherCid: {cipherCid}
        </p>
      )}
      {codeHash && (
        <p className="break-all text-[11px] text-text-light-50 dark:text-text-dark-50">
          codeHash: {codeHash}
        </p>
      )}

      {encryptionBundle && (
        <div className="mt-4 rounded border border-secondary-50 bg-secondary-10 p-3 text-xs text-secondary-100 dark:border-secondary-75 dark:bg-secondary-25">
          <p className="font-semibold">복원된 키</p>
          <p className="break-all font-mono">Key: {encryptionBundle.keyHex}</p>
          <p className="break-all font-mono">IV: {encryptionBundle.ivHex}</p>
        </div>
      )}
      {legacyKeyHex && (
        <section className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">복원된 키 (이전 형식)</p>
          <p className="break-all font-mono">Key: {legacyKeyHex}</p>
          <p className="mt-2 text-[11px]">
            이 키는 최초 배포 시 IV가 번들되지 않았습니다. 업로드 당시 기록한 IV를 입력해주세요.
          </p>
          <input
            type="text"
            className="mt-2 w-full rounded border border-amber-300 px-2 py-1 font-mono text-[11px] text-amber-900 dark:border-amber-500 dark:bg-transparent dark:text-amber-100"
            placeholder="0x로 시작하는 IV"
            value={legacyIvInput}
            onChange={(event) => setLegacyIvInput(event.target.value)}
          />
          {legacyIvInput && !normalizedLegacyIv && (
            <p className="mt-1 text-[11px] text-rose-500">올바른 0x-hex IV를 입력하세요.</p>
          )}
        </section>
      )}
      {bundleError && (
        <p className="mt-2 text-xs text-rose-500">키/IV 구문 분석 오류: {bundleError}</p>
      )}

      {error && <p className="mt-2 text-xs text-rose-500">복원 중 오류: {error}</p>}

      {isProcessing && (
        <p className="mt-2 text-xs text-text-light-50 dark:text-text-dark-50">
          shard 데이터를 동기화하는 중입니다...
        </p>
      )}

      {isLoading && (
        <p className="mt-2 text-xs text-text-light-50 dark:text-text-dark-50">
          이벤트 동기화 중...
        </p>
      )}

      <section className="mt-4 space-y-2 rounded border border-primary-25 p-3 text-xs dark:border-primary-75">
        <p className="font-semibold text-primary-100 dark:text-text-dark-100">원본 파일 복호화</p>
        <p className="text-text-light-50 dark:text-text-dark-50">
          복구된 키와 IV를 사용해 IPFS에서 암호화된 코드를 내려받고, AES-GCM으로 복호화한 뒤 해시를
          검증합니다.
        </p>
        <button
          type="button"
          className="w-full rounded bg-accent-100 px-3 py-2 text-xs font-semibold text-text-dark-100 transition hover:bg-accent-75 disabled:cursor-not-allowed disabled:bg-accent-25 disabled:text-text-dark-50"
          disabled={!canDownload || isDownloading}
          onClick={async () => {
            if (!cipherCid || !codeHash || !activeBundle) return;
            setDownloadStatus("IPFS에서 암호화된 파일을 가져오는 중입니다…");
            setDownloadError(null);
            setIsDownloading(true);
            try {
              const result = await downloadAndDecryptArtifact({
                cipherCid,
                encryptionKeyHex: activeBundle.keyHex,
                initializationVectorHex: activeBundle.ivHex,
                expectedHash: codeHash,
                fileName: codeName ? `${codeName}.zip` : `code-${codeId}.bin`,
              });
              setDownloadStatus(
                `다운로드 완료! 해시 검증 성공 (${result.verifiedHash.slice(0, 10)}…)`,
              );
            } catch (downloadErr) {
              setDownloadError((downloadErr as Error).message);
              setDownloadStatus(null);
            } finally {
              setIsDownloading(false);
            }
          }}
        >
          {isDownloading ? "원본 복호화 중..." : "원본 파일 받기"}
        </button>
        {!cipherCid && (
          <p className="text-[11px] text-rose-500">cipherCid 정보를 확인할 수 없습니다.</p>
        )}
        {!codeHash && (
          <p className="text-[11px] text-rose-500">codeHash 정보를 확인할 수 없습니다.</p>
        )}
        {downloadStatus && <p className="text-[11px] text-secondary-100">{downloadStatus}</p>}
        {downloadError && <p className="text-[11px] text-rose-500">{downloadError}</p>}
      </section>
    </section>
  );
}

function renderShardState(state: ShardRecoveryEntry["status"]): string {
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

function normalizeHexInput(value: string): `0x${string}` | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  const hexBody = normalized.slice(2);
  if (hexBody.length === 0 || hexBody.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hexBody)) return null;
  return normalized as `0x${string}`;
}
