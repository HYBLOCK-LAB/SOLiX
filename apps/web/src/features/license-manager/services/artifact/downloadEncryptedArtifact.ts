import { keccak256 } from "viem";
import { fetchIpfsResource } from "../../services/shards/ipfs";
import { hexToBytes } from "../../utils/hex";

export interface ArtifactDownloadParams {
  cipherCid: string;
  encryptionKeyHex: `0x${string}`;
  initializationVectorHex: `0x${string}`;
  expectedHash: `0x${string}`;
  fileName?: string;
}

export interface ArtifactDownloadResult {
  verifiedHash: `0x${string}`;
  bytes: number;
}

export async function downloadAndDecryptArtifact(
  params: ArtifactDownloadParams,
): Promise<ArtifactDownloadResult> {
  console.log("[artifact] Download/decrypt start", {
    cid: params.cipherCid,
    expectedHash: params.expectedHash,
  });
  const encrypted = await fetchEncryptedArtifact(params.cipherCid);
  console.log("[artifact] Encrypted payload fetched", { bytes: encrypted.byteLength });
  const decrypted = await decryptWithAesGcm(
    encrypted,
    params.encryptionKeyHex,
    params.initializationVectorHex,
  );
  console.log("[artifact] Secret used for decryption", {
    keyHex: params.encryptionKeyHex,
    ivHex: params.initializationVectorHex,
  });
  console.log("[artifact] Payload decrypted", { bytes: decrypted.byteLength });
  const verifiedHash = verifyHash(decrypted, params.expectedHash);
  console.log("[artifact] Hash verified", { verifiedHash });
  triggerBrowserDownload(decrypted, params.fileName ?? "code.bin");
  console.log("[artifact] Browser download triggered", { fileName: params.fileName });
  return { verifiedHash, bytes: decrypted.byteLength };
}

async function fetchEncryptedArtifact(cid: string): Promise<ArrayBuffer> {
  console.log("[artifact] Fetching from IPFS", { cid });
  const { response, source } = await fetchIpfsResource(cid);
  console.log("[artifact] IPFS fetch complete", { status: response.status, source });
  return response.arrayBuffer();
}

async function decryptWithAesGcm(
  payload: ArrayBuffer,
  keyHex: `0x${string}`,
  ivHex: `0x${string}`,
): Promise<ArrayBuffer> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("이 브라우저는 Web Crypto API를 지원하지 않습니다.");
  }
  console.log("[artifact] Starting AES-GCM decryption");
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = hexToBytes(ivHex);
  // Ensure keyBytes is a native ArrayBuffer
  const keyBuffer =
    keyBytes.buffer instanceof ArrayBuffer ? keyBytes.buffer : new Uint8Array(keyBytes).buffer;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyBuffer, keyBytes.byteOffset, keyBytes.byteLength),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  try {
    const ivBuffer = ivBytes.buffer.slice(
      ivBytes.byteOffset,
      ivBytes.byteOffset + ivBytes.byteLength,
    ) as ArrayBuffer;
    const result = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      cryptoKey,
      payload,
    );
    console.log("[artifact] AES-GCM decryption succeeded");
    return result;
  } catch (error) {
    console.error("[artifact] AES-GCM decryption failed", error);
    throw new Error((error as Error).message || "암호화 파일 복호화에 실패했습니다.");
  }
}

function verifyHash(buffer: ArrayBuffer, expectedHash: `0x${string}`): `0x${string}` {
  const computed = keccak256(new Uint8Array(buffer));
  if (computed.toLowerCase() !== expectedHash.toLowerCase()) {
    console.error("[artifact] Hash mismatch", { computed, expected: expectedHash });
    throw new Error("복호화된 파일의 해시가 codeHash와 일치하지 않습니다.");
  }
  console.log("[artifact] Hash match confirmed");
  return computed;
}

function triggerBrowserDownload(buffer: ArrayBuffer, fileName: string): void {
  console.log("[artifact] Triggering download", { fileName, bytes: buffer.byteLength });
  const blob = new Blob([buffer]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
