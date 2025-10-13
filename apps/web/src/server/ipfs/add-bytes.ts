import { type CID } from "multiformats/cid";
import { getUnixFs } from "./helia";

const CID_VERSION = 1;
const RAW_LEAVES = true;

export interface AddBytesResult {
  cid: CID;
}

export async function addBytesToHelia(bytes: Uint8Array): Promise<AddBytesResult> {
  const unixFs = await getUnixFs();
  const cid = await unixFs.addBytes(bytes, {
    cidVersion: CID_VERSION,
    rawLeaves: RAW_LEAVES,
  });
  return { cid };
}
