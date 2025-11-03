import { NextResponse } from "next/server";
import { addBytesToHelia } from "../../../../server/ipfs/addBytes";
import { uploadToPinata } from "../../../../server/pinata/upload";
import { storageMode, STORAGE_MODES } from "../../../../lib/storageConfig";
import { requirePinataJwt } from "../../../../lib/serverEnv";

const CIPHER_FIELD_NAME = "cipher";
const MAX_UPLOAD_BYTES = 256 * 1024 * 1024;
const PINATA_FILE_NAME = "cipher.bin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const cipher = formData.get(CIPHER_FIELD_NAME);

    const hasPinataCredentials =
      typeof process.env.PINATA_JWT === "string" && process.env.PINATA_JWT.trim() !== "";
    const shouldUploadToPinata =
      storageMode === STORAGE_MODES.PRODUCTION && hasPinataCredentials;
    const effectiveStorageMode = shouldUploadToPinata
      ? STORAGE_MODES.PRODUCTION
      : STORAGE_MODES.LOCAL;

    if (storageMode === STORAGE_MODES.PRODUCTION && !hasPinataCredentials) {
      console.warn(
        "[upload] PINATA_JWT is missing. Falling back to local storage mode for this request.",
      );
    }

    if (!(cipher instanceof Blob)) {
      throw new Error("암호화된 파일이 첨부되지 않았습니다.");
    }

    if (cipher.size > MAX_UPLOAD_BYTES) {
      throw new Error("지원하는 최대 파일 크기(256MB)를 초과했습니다.");
    }

    const cipherBuffer = await cipher.arrayBuffer();
    const cipherBytes = new Uint8Array(cipherBuffer);
    const { cid } = await addBytesToHelia(cipherBytes);

    let pinataCid: string | null = null;
    if (shouldUploadToPinata) {
      const jwt = requirePinataJwt();
      pinataCid = await uploadToPinata(cipherBytes, PINATA_FILE_NAME, jwt);
    }

    return NextResponse.json({
      cipherCid: cid.toString(),
      storageMode: effectiveStorageMode,
      pinataCid,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
