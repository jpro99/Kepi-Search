import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getLocalTips } from "@/lib/travelAssistant/localIntelligenceService";
import { getWeatherForecast } from "@/lib/travelAssistant/weatherService";

const QuerySchema = z.object({
  city: z.string().trim().min(1).max(160),
  days: z.coerce.number().int().min(1).max(7).default(3),
  includeLocalTips: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true"),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
});

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/travel-updates/weather",
    method: "GET",
  });

  if (!userId) {
    routeLogger.warn("Unauthorized weather intelligence request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    policyName: "travel-updates-general",
    identifier: userId,
    route: "/api/travel-updates/weather",
    requestId,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many weather requests. Please retry shortly." },
      { status: 429, headers: rateLimit.headers },
    );
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    city: url.searchParams.get("city"),
    days: url.searchParams.get("days") ?? undefined,
    includeLocalTips: url.searchParams.get("includeLocalTips") ?? undefined,
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422, headers: rateLimit.headers },
    );
  }

  const weather = await getWeatherForecast(parsed.data.city, parsed.data.days);
  const localTips = parsed.data.includeLocalTips
    ? await getLocalTips(parsed.data.city, {
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      })
    : null;

  return NextResponse.json(
    {
      weather,
      localTips,
    },
    { headers: rateLimit.headers },
  );
}
