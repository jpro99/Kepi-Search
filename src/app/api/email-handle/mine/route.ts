import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getEmailForwardSetupStatus } from "@/lib/travelAssistant/emailForwardSetupStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/email-handle/mine",
  });

  if (!userId) {
    routeLogger.warn("Unauthorized email handle request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    policyName: "travel-updates-general",
    identifier: userId,
    route: "/api/email-handle/mine",
    requestId,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many email handle requests. Please retry shortly." },
      { status: 429, headers: rateLimit.headers },
    );
  }

  const setupStatus = await getEmailForwardSetupStatus(userId);
  return NextResponse.json(
    {
      ok: true,
      handle: setupStatus.handle,
      forwardAddress: setupStatus.forwardAddress,
      canChangeHandle: setupStatus.canChangeHandle,
      nextHandleChangeAt: setupStatus.nextHandleChangeAt,
    },
    { headers: rateLimit.headers },
  );
}
