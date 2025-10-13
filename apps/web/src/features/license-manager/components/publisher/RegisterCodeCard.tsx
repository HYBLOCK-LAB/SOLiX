"use client";

import { FormEvent, useState } from "react";
import { useLicenseManagerWrite } from "../../hooks/use-license-manager-write";
import { createEncryptedArtifact, uploadEncryptedArtifact } from "../../services/artifact";
import { storageMode } from "../../../../lib/storage-config";

const MAX_FILE_SIZE_BYTES = 256 * 1024 * 1024;

export function RegisterCodeCard() {
  const [codeHash, setCodeHash] = useState<`0x${string}` | "">("");
  const [cipherCid, setCipherCid] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [encryptionDetails, setEncryptionDetails] = useState<{
    keyHex: string;
    ivHex: string;
    algorithm: string;
    size: number;
  } | null>(null);

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

  return (
    <section className="rounded-2xl border border-primary-25 bg-surface-light-100 p-6 shadow-lg dark:border-surface-dark-75 dark:bg-surface-dark-100">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-primary-100 dark:text-text-dark-100">코드 등록</h2>
        <p className="text-sm text-text-light-50 dark:text-text-dark-50">
          코드를 해시하여 온체인에 등록하세요.
        </p>
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
          <span className="text-sm text-text-light-75 dark:text-text-dark-75">코드 해시 (keccak256)</span>
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
          className="rounded-lg bg-secondary-100 px-4 py-2 text-sm font-semibold text-text-dark-100 transition-colors hover:bg-secondary-75 disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-text-dark-75"
          disabled={isPending || isProcessingFile}
        >
          {isProcessingFile ? "파일 준비 중..." : isPending ? "트랜잭션 전송 중..." : "코드 등록"}
        </button>
      </form>

      {encryptionDetails && (
        <section className="mt-6 rounded border border-primary-25 bg-background-light-50 p-4 shadow-sm dark:border-primary-50 dark:bg-background-dark-75">
          <h3 className="text-sm font-semibold text-primary-100 dark:text-text-dark-100">암호화 세부 정보</h3>
          <dl className="mt-3 space-y-2 text-xs text-text-light-75 dark:text-text-dark-75">
            <div>
              <dt className="font-semibold">암호화 알고리즘</dt>
              <dd className="mt-1 font-mono text-text-light-100 dark:text-text-dark-100">{encryptionDetails.algorithm}</dd>
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
        {status && <p className="text-text-light-50 dark:text-text-dark-50">{status}</p>}
        {isSuccess && transactionHash && (
          <p className="text-secondary-100">등록 완료! Tx: {transactionHash.slice(0, 8)}...</p>
        )}
        {error && <p className="text-rose-400">오류: {error.message}</p>}
      </footer>
    </section>
  );
}
