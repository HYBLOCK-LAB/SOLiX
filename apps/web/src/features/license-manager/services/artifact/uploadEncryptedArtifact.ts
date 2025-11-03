import type { CodeRegistrationArtifact, EncryptedArtifact } from "./types";

interface UploadOptions {
  storageMode: string;
}

interface UploadResponse {
  cipherCid: string;
  storageMode: string;
}

const STORAGE_UPLOAD_ENDPOINT = "/api/storage/upload";
export async function uploadEncryptedArtifact(
  artifact: EncryptedArtifact,
  options: UploadOptions,
): Promise<CodeRegistrationArtifact> {
  const formData = new FormData();
  formData.append("fileName", artifact.fileName);
  formData.append("storageMode", options.storageMode);

  const cipherArrayBuffer =
    artifact.cipherBytes.byteOffset === 0 &&
    artifact.cipherBytes.byteLength === artifact.cipherBytes.buffer.byteLength
      ? (artifact.cipherBytes.buffer as ArrayBuffer)
      : (artifact.cipherBytes.buffer.slice(
          artifact.cipherBytes.byteOffset,
          artifact.cipherBytes.byteOffset + artifact.cipherBytes.byteLength,
        ) as ArrayBuffer);

  formData.append("cipher", new Blob([cipherArrayBuffer], { type: "application/octet-stream" }));

  const response = await fetch(STORAGE_UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IPFS 업로드 실패: ${errorText || response.statusText}`);
  }

  const payload = (await response.json()) as UploadResponse;

  return {
    codeHash: artifact.codeHash,
    cipherCid: payload.cipherCid,
    encryptionKeyHex: artifact.keyHex,
    initializationVectorHex: artifact.ivHex,
    algorithm: artifact.algorithm,
    size: artifact.size,
  };
}
