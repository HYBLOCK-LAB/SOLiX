import { keccak256 } from "viem";

export async function hashFile(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const hash = keccak256(new Uint8Array(buffer));
  return hash;
}
