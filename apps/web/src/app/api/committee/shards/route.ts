import { NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "../../../../lib/serverEnv";

const requestSchema = z.object({
  runId: z.string().min(1),
  totalShares: z.number().int().min(1),
  threshold: z.number().int().min(1),
  shards: z
    .array(
      z.object({
        committee: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        shareIndex: z.number().int().min(1),
        shareValue: z.string().regex(/^0x[a-fA-F0-9]+$/),
        byteLength: z.number().int().positive(),
        expiresAt: z.string().optional(),
        note: z.string().max(256).optional(),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  const payload = requestSchema.parse(await request.json());

  const response = await fetch(`${serverEnv.COMMITTEE_API_URL}/runs/${payload.runId}/prepare-shards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message }, { status: response.status });
  }

  const body = await response.json();
  return NextResponse.json(body);
}
