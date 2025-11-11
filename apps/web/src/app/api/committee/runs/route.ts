import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildCommitteeUrls } from "../../../../lib/committeeApi";

const runRequestSchema = z.object({
  codeId: z.number().int().nonnegative(),
  requester: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  runNonce: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  recipientPubKey: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = runRequestSchema.parse(body);
  const committeePayload = {
    codeId: payload.codeId.toString(),
    requester: payload.requester,
    runNonce: payload.runNonce,
    recipientPubKey: payload.recipientPubKey,
    requestedAt: new Date().toISOString(),
  };

  const urls = buildCommitteeUrls("/runs/manual");

  const results: Array<{ url: string; queued: boolean; reason?: string }> = [];
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(committeePayload),
      });

      if (!response.ok) {
        const message = await response.text();
        errors.push(`Committee ${url} responded with ${response.status}: ${message}`);
        continue;
      }

      const body = (await response.json()) as { queued?: boolean; reason?: string };
      results.push({ url, queued: Boolean(body?.queued), reason: body?.reason });
    } catch (error) {
      errors.push(`Committee ${url} request failed: ${(error as Error).message}`);
    }
  }

  const totalCommittees = urls.length;
  const queuedCount = results.filter((result) => result.queued).length;
  const status = errors.length === urls.length ? 502 : errors.length > 0 ? 207 : 201;
  return NextResponse.json(
    {
      success: errors.length === 0,
      totalCommittees,
      queuedCount,
      responses: results,
      errors,
    },
    { status },
  );
}
