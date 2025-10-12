import { NextResponse } from "next/server";
import { addBytesToHelia } from "../../../../server/ipfs/add-bytes";
import { createCarFromBytes } from "../../../../server/ipfs/create-car";
import { uploadCarToStoracha } from "../../../../server/storacha/upload";
import { storageMode, STORAGE_MODES } from "../../../../lib/storage-config";

const CIPHER_FIELD_NAME = "cipher";
const MAX_UPLOAD_BYTES = 256 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const cipher = formData.get(CIPHER_FIELD_NAME);

    if (!(cipher instanceof Blob)) {
      throw new Error("암호화된 파일이 첨부되지 않았습니다.");
    }

    if (cipher.size > MAX_UPLOAD_BYTES) {
      throw new Error("지원하는 최대 파일 크기(256MB)를 초과했습니다.");
    }

    const cipherBuffer = await cipher.arrayBuffer();
    const cipherBytes = new Uint8Array(cipherBuffer);
    const { cid } = await addBytesToHelia(cipherBytes);

    if (storageMode === STORAGE_MODES.PRODUCTION) {
      const heliaCidString = cid.toString();
      const { rootCid, bytes: carBytes } = await createCarFromBytes(cipherBytes, heliaCidString);
      const rootAsString = rootCid.toString();

      if (rootAsString !== heliaCidString) {
        throw new Error(`CAR root CID (${rootAsString}) does not match Helia CID (${heliaCidString}).`);
      }

      await uploadCarToStoracha(carBytes, heliaCidString);
    }

    return NextResponse.json({ cipherCid: cid.toString(), storageMode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
