import { NextRequest, NextResponse } from "next/server";
import { CID } from "multiformats/cid";
import { getUnixFs } from "../../../../../server/ipfs/helia";

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cid: string }> },
): Promise<NextResponse> {
  try {
    const { cid: cidString } = await context.params;
    const unixFs = await getUnixFs();
    const cid = CID.parse(cidString);
    const chunks: Uint8Array[] = [];
    for await (const chunk of unixFs.cat(cid)) {
      chunks.push(chunk);
    }
    if (chunks.length === 0) {
      throw new Error("CID에 대한 데이터가 없습니다.");
    }
    const payload = concatChunks(chunks);
    const payloadCopy = payload.slice(); // ensures buffer is typed as ArrayBuffer, not SharedArrayBuffer
    return new NextResponse(payloadCopy.buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export const dynamic = "force-dynamic";
