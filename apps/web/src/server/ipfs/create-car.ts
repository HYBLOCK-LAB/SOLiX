import { CarWriter } from "@ipld/car/writer";
import { CID } from "multiformats/cid";
import type { CID as CidType } from "multiformats/cid";
import { concatUint8Arrays } from "./utils/concat";

export interface CarFile {
  rootCid: CidType;
  bytes: Uint8Array;
}

export async function createCarFromBytes(bytes: Uint8Array, rootCidString: string): Promise<CarFile> {
  const rootCid = CID.parse(rootCidString);
  const { writer, out } = CarWriter.create([rootCid]);

  await writer.put({ cid: rootCid, bytes });
  await writer.close();

  const chunks: Uint8Array[] = [];
  for await (const chunk of out) {
    chunks.push(chunk);
  }

  return {
    rootCid,
    bytes: concatUint8Arrays(chunks),
  };
}
