import type { Helia } from "helia";
import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";

let heliaInstance: Helia | null = null;
let unixFsInstance: ReturnType<typeof unixfs> | null = null;

export async function getHelia(): Promise<Helia> {
  if (heliaInstance) {
    return heliaInstance;
  }
  heliaInstance = await createHelia();
  return heliaInstance;
}

export async function getUnixFs() {
  if (unixFsInstance) {
    return unixFsInstance;
  }
  const helia = await getHelia();
  unixFsInstance = unixfs(helia);
  return unixFsInstance;
}
