import { CID } from "multiformats/cid";
import { getStorachaClient } from "./client";

const CAR_MIME_TYPE = "application/car";

export async function uploadCarToStoracha(carBytes: Uint8Array, rootCid: string): Promise<void> {
  const client = await getStorachaClient();
  const carArrayBuffer =
    carBytes.byteOffset === 0 && carBytes.byteLength === carBytes.buffer.byteLength
      ? (carBytes.buffer as ArrayBuffer)
      : (carBytes.buffer.slice(
          carBytes.byteOffset,
          carBytes.byteOffset + carBytes.byteLength,
        ) as ArrayBuffer);
  const carBlob = new Blob([carArrayBuffer as ArrayBuffer], { type: CAR_MIME_TYPE });
  await client.uploadCAR(carBlob, { rootCID: CID.parse(rootCid) });
}
