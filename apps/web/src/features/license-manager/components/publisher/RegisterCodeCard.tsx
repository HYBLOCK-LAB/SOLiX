"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useLicenseManagerWrite } from "../../hooks/useLicenseManagerWrite";
import { createEncryptedArtifact, uploadEncryptedArtifact } from "../../services/artifact";
import { storageMode } from "../../../../lib/storageConfig";
import { LICENSE_MANAGER_ADDRESS } from "../../constants";
import { licenseManagerAbi } from "../../abi";
import { getCommitteeMembers } from "../../../../lib/env";
import { registerShards } from "../../services/shards/registerShards";
import { splitSecret } from "../../services/shards/shamirSplit";

const MAX_FILE_SIZE_BYTES = 256 * 1024 * 1024;
const DEFAULT_SHARD_EXPIRY_SECONDS = 60 * 60; // 1 hour
const DEFAULT_THRESHOLD = 3;

type ShardStatusState = {
  state: "idle" | "pending" | "success" | "error";
  message?: string | null;
};

export function RegisterCodeCard() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const committeeMembers = useMemo(() => getCommitteeMembers(), []);
  const threshold = Math.min(DEFAULT_THRESHOLD, committeeMembers.length || DEFAULT_THRESHOLD);

  const [codeHash, setCodeHash] = useState<`0x${string}` | "">("");
  const [cipherCid, setCipherCid] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [shardStatus, setShardStatus] = useState<ShardStatusState>({ state: "idle" });
  const [encryptionDetails, setEncryptionDetails] = useState<{
    keyHex: string;
    ivHex: string;
    algorithm: string;
    size: number;
  } | null>(null);

  const { execute, isPending, isSuccess, transactionHash, error } =
    useLicenseManagerWrite("registerCode");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!codeHash || !cipherCid) {
      setStatus("codeHash와 cipherCid를 입력해주세요.");
      return;
    }

    if (!publicClient) {
      setStatus("네트워크 연결을 초기화하는 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }

    if (!encryptionDetails) {
      setStatus("파일을 업로드해 암호화 정보를 생성해주세요.");
      return;
    }

    if (committeeMembers.length === 0) {
      setShardStatus({ state: "error", message: "위원회 주소가 구성되어 있지 않습니다." });
      return;
    }

    if (!address) {
      setStatus("지갑을 연결해야 합니다.");
      return;
    }

    try {
      setStatus(null);
      setShardStatus({ state: "idle" });

      const nextCodeId = (await publicClient.readContract({
        address: LICENSE_MANAGER_ADDRESS,
        abi: licenseManagerAbi,
        functionName: "nextCodeId",
      })) as bigint;

      const txHash = await execute([codeHash, cipherCid]);
      setStatus("트랜잭션 확인 중입니다...");
      if (txHash) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      const shares = splitSecret(encryptionDetails.keyHex as `0x${string}`, committeeMembers.length, threshold);
      if (shares.length !== committeeMembers.length) {
        throw new Error("Shard 생성에 실패했습니다.");
      }
      const expiresAt = new Date(Date.now() + DEFAULT_SHARD_EXPIRY_SECONDS * 1000).toISOString();

      setShardStatus({ state: "pending", message: "위원회 shard 등록 중..." });
      const shardNonce = `code-${nextCodeId.toString()}`;
      const shardPayloads = committeeMembers.map((committee, index) => {
        const share = shares[index];
        if (!share) {
          throw new Error("모든 위원에게 shard를 매핑할 수 없습니다.");
        }
        return {
          committee,
          shardNonce,
          shareIndex: share.index,
          shareValue: share.value,
          byteLength: share.byteLength,
          expiresAt,
        };
      });

      await registerShards({
        codeId: nextCodeId.toString(),
        wallet: address,
        shards: shardPayloads,
      });
      setShardStatus({ state: "success", message: "위원회 shard 등록이 완료되었습니다." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setStatus(message);
      setShardStatus({ state: "error", message });
    }
  };

  const onFileSelected = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus("256MB 이하의 파일만 등록할 수 있습니다.");
      setCodeHash("");
      setCipherCid("");
      setEncryptionDetails(null);
      return;
    }

    setIsProcessingFile(true);
    try {
      setStatus("파일 암호화 및 업로드를 시작합니다...");
      const encryptedArtifact = await createEncryptedArtifact(file);
      const uploadResult = await uploadEncryptedArtifact(encryptedArtifact, { storageMode });

      setCodeHash(uploadResult.codeHash);
      setCipherCid(uploadResult.cipherCid);
      setEncryptionDetails({
        keyHex: uploadResult.encryptionKeyHex,
        ivHex: uploadResult.initializationVectorHex,
        algorithm: uploadResult.algorithm,
        size: uploadResult.size,
      });
      setStatus(
        `암호화 및 업로드가 완료되었습니다. (${storageMode}) 환경 기준입니다. 키 정보를 안전하게 보관하세요.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류입니다.";
      setStatus(`파일 암호화 또는 업로드 실패: ${message}`);
      setCipherCid("");
      setEncryptionDetails(null);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setCodeHash("");
    setCipherCid("");
    setStatus(null);
    setEncryptionDetails(null);
    setIsProcessingFile(false);
    setShardStatus({ state: "idle" });
  }, []);

  return (
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">
            코드 등록
          </h2>
          <p className="text-sm text-text-light-50 dark:text-text-dark-50">
            코드를 해시하여 온체인에 등록하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-primary-50 bg-background-light-50 px-3 py-2 text-xs font-semibold text-primary-100 hover:border-primary-75 hover:text-primary-75 dark:border-primary-75 dark:bg-background-dark-75 dark:text-text-dark-75 dark:hover:border-primary-100 dark:hover:text-text-dark-100"
        >
          새로고침
        </button>
      </header>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">코드 파일</span>
          <input
            type="file"
            accept=".wasm,.zip,.js,.ts"
            onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
          />
          <span className="text-xs text-text-light-50 dark:text-text-dark-50">
            파일은 브라우저에서 AES-GCM으로 암호화된 후 IPFS에 업로드됩니다. (최대 256MB)
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">
            코드 해시 (keccak256)
          </span>
          <input
            type="text"
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 font-mono text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            placeholder="0x..."
            value={codeHash}
            onChange={(event) => setCodeHash(event.target.value as `0x${string}` | "")}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">암호화 파일 CID</span>
          <input
            type="text"
            className="rounded-lg border border-primary-25 bg-background-light-50 px-3 py-2 text-sm text-text-light-100 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-50 dark:border-primary-50 dark:bg-background-dark-75 dark:text-text-dark-100"
            placeholder="bafy..."
            value={cipherCid}
            readOnly
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-secondary-100 px-4 py-[10px] text-sm font-bold uppercase tracking-wide text-text-dark-100 transition-colors duration-150 ease-out hover:bg-secondary-75 enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-secondary-25 disabled:text-text-dark-50"
          disabled={isPending || isProcessingFile}
        >
          {isProcessingFile ? "파일 준비 중..." : isPending ? "트랜잭션 전송 중..." : "코드 등록"}
        </button>
      </form>

      {encryptionDetails && (
        <section className="mt-6 rounded border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-primary-50 dark:bg-background-dark-75">
          <h3 className="text-sm font-semibold text-primary-100 dark:text-text-dark-100">
            암호화 세부 정보
          </h3>
          <dl className="mt-3 space-y-2 text-xs text-text-light-75 dark:text-text-dark-75">
            <div>
              <dt className="font-semibold">암호화 알고리즘</dt>
              <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                {encryptionDetails.algorithm}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">AES Key</dt>
              <dd className="mt-1 break-all font-mono text-text-light-100 dark:text-text-dark-100">
                {encryptionDetails.keyHex}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Initialization Vector</dt>
              <dd className="mt-1 break-all font-mono text-text-light-100 dark:text-text-dark-100">
                {encryptionDetails.ivHex}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">암호문 크기</dt>
              <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">
                {encryptionDetails.size.toLocaleString()} bytes
              </dd>
            </div>
          </dl>
        </section>
      )}

      <footer className="mt-4 space-y-2 text-sm">
        {status && (
          <p className="max-h-[4.5rem] overflow-hidden text-text-light-50 dark:text-text-dark-50">
            {status}
          </p>
        )}
        {isSuccess && transactionHash && (
          <p className="text-secondary-100">등록 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && (
          <p className="max-h-[4.5rem] overflow-hidden text-rose-500">
            오류: {error.message}
          </p>
        )}
      </footer>

      <section className="mt-6 rounded-xl border border-primary-25 bg-background-light-50 p-4 text-sm shadow-sm dark:border-primary-75 dark:bg-background-dark-75">
        <h3 className="text-sm font-semibold text-primary-100 dark:text-text-dark-100">
          위원회 분할 키 상태
        </h3>
        <p className="mt-1 text-xs text-text-light-50 dark:text-text-dark-50">
          총 {committeeMembers.length}명의 위원에게 키 조각을 전달하며, 임계값은 {threshold}입니다.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-text-light-75 dark:text-text-dark-75">
          {committeeMembers.map((member) => (
            <li key={member} className="font-mono">
              {member}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-text-light-100 dark:text-text-dark-75">
          상태: {renderShardStatus(shardStatus)}
        </p>
      </section>
    </section>
  );
}

function renderShardStatus(status: ShardStatusState): string {
  switch (status.state) {
    case "pending":
      return status.message ?? "위원회에 shard를 등록 중입니다.";
    case "success":
      return status.message ?? "등록 완료";
    case "error":
      return status.message ?? "등록 중 오류가 발생했습니다.";
    default:
      return status.message ?? "대기 중";
  }
}
