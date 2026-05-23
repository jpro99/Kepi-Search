import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rateLimit";
import { kvStoreSet } from "@/lib/travelAssistant/kvStore";
import { generateId } from "@/lib/utils/generateId";

const ADVANCED_MODE_KEY = "advanced-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resetAdvancedModePreference(req: Request): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id")?.trim() || generateId();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/preferences/advanced-mode/reset",
  });

  if (!userId) {
    routeLogger.warn("Unauthorized advanced mode reset request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    policyName: "travel-updates-general",
    identifier: userId,
    route: "/api/preferences/advanced-mode/reset",
    requestId,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please retry shortly." },
      { status: 429, headers: rateLimit.headers },
    );
  }

  await kvStoreSet(ADVANCED_MODE_KEY, false, { userId });
  routeLogger.info("Advanced mode preference reset to false.");
  return NextResponse.json({ ok: true, enabled: false, persistedToKv: true }, { headers: rateLimit.headers });
}

export async function GET(req: Request) {
  return resetAdvancedModePreference(req);
}

export async function POST(req: Request) {
  return resetAdvancedModePreference(req);
}
