import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildCommitteeUrls } from "../../../../../../lib/committeeApi";

const requestSchema = z.object({
  codeId: z.string().min(1),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  shards: z.array(
    z.object({
      committee: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      runNonce: z.string().min(1),
      shareIndex: z.number().int().min(1),
      shareValue: z.string().regex(/^0x[a-fA-F0-9]+$/),
      byteLength: z.number().int().positive(),
      expiresAt: z.string().optional(),
      note: z.string().optional(),
    })
  ),
});

type RouteParams = Promise<{ codeId: string }>;

export async function POST(
  request: NextRequest,
  context: { params: RouteParams }
) {
  const { codeId } = await context.params;
  const body = await request.json();
  const payload = requestSchema.parse({ codeId, ...body });
  const targetUrls = buildCommitteeUrls(`/codes/${codeId}/shards/plain`);

  try {
    const { results, errors } = await targetUrls.reduce(
      async (previousPromise, url) => {
        const acc = await previousPromise;
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const body = await response
            .json()
            .catch(async () => ({ message: await response.text().catch(() => "") }));

          if (!response.ok) {
            acc.errors.push(
              `Committee ${url} responded with ${response.status}: ${JSON.stringify(body)}`
            );
          } else {
            acc.results.push({ url, body });
          }
        } catch (error) {
          acc.errors.push(`Committee ${url} request failed: ${(error as Error).message}`);
        }

        return acc;
      },
      Promise.resolve({ results: [] as Array<{ url: string; body: unknown }>, errors: [] as string[] })
    );

    const statusCode = errors.length === targetUrls.length ? 502 : 207;
    return NextResponse.json(
      { stored: errors.length === 0, responses: results, errors },
      { status: errors.length === 0 ? 201 : statusCode }
    );
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 502 }
    );
  }
}
