import { NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "../../../../../../lib/serverEnv";

const requestSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  shards: z.array(
    z.object({
      committee: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      shardNonce: z.string().min(1),
      shareIndex: z.number().int().min(1),
      shareValue: z.string().regex(/^0x[a-fA-F0-9]+$/),
      byteLength: z.number().int().positive(),
      expiresAt: z.string().optional(),
      note: z.string().optional(),
    })
  ),
});

export async function POST(
  request: Request,
  context: { params: { codeId: string } }
) {
  const payload = requestSchema.parse(await request.json());
  const response = await fetch(
    `${serverEnv.COMMITTEE_API_URL}/codes/${context.params.codeId}/shards/plain`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
