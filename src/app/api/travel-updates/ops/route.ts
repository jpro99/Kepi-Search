import { NextResponse } from "next/server";
import { z } from "zod";
import { buildTravelOpsSnapshot } from "@/lib/travelAssistant/opsSnapshot";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const snapshot = await buildTravelOpsSnapshot({
    auditLimit: parsed.data.limit ?? 20,
  });
  return NextResponse.json(snapshot);
}
