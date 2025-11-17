import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "../../utils/hex";
import type { RemoteShardPublication, SecretSharePayload } from "./types";
import { combineShares } from "./combineShares";
import { fetchIpfsResource } from "./ipfs";

export async function fetchShardPublication(shardCid: string): Promise<RemoteShardPublication> {
  const { response } = await fetchIpfsResource(shardCid);
  return (await response.json()) as RemoteShardPublication;
}

export async function decryptShardPublication(
  publication: RemoteShardPublication,
  recipientPrivateKey: `0x${string}`,
): Promise<SecretSharePayload> {
  const aesKey = deriveAesKey(recipientPrivateKey, publication.payload.ephemeralPublicKey);
  const plaintext = await decryptAesGcm(
    publication.payload.ciphertext,
    publication.payload.authTag,
    publication.payload.iv,
    aesKey,
  );
  return {
    index: publication.shareIndex,
    value: bytesToHex(new Uint8Array(plaintext)),
    byteLength: publication.byteLength,
  };
}

function deriveAesKey(
  privateKeyHex: `0x${string}` | string,
  peerPublicKey: `0x${string}` | string,
): Uint8Array {
  const privBytes = hexToBytes(privateKeyHex);
  const pubBytes = hexToBytes(peerPublicKey);
  const shared = secp256k1.getSharedSecret(privBytes, pubBytes, true);
  const sharedNoPrefix = shared.length === 33 ? shared.slice(1) : shared;
  return Uint8Array.from(sha256(sharedNoPrefix));
}

async function decryptAesGcm(
  ciphertextHex: `0x${string}`,
  authTagHex: `0x${string}`,
  ivHex: `0x${string}`,
  keyBytes: Uint8Array,
): Promise<ArrayBuffer> {
  const ciphertext = hexToBytes(ciphertextHex);
  const authTag = hexToBytes(authTagHex);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const keyBuffer = Uint8Array.from(keyBytes).buffer;
  const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Uint8Array.from(hexToBytes(ivHex)),
    },
    key,
    combined,
  );
}

export function combineDecryptedShares(shares: SecretSharePayload[]): `0x${string}` {
  const combined = combineShares(shares);
  return bytesToHex(combined);
}
