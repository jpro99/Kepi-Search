import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAutomatedTestRuntime } from "@/lib/auth/mockClerkAuth";
import { logger } from "@/lib/logger";
import { unsubscribeUser } from "@/lib/travelAssistant/pushNotificationService";

async function resolveAuthenticatedUserId(): Promise<string | null> {
  const isTestEnv = isAutomatedTestRuntime();
  try {
    const clerkServer = await import("@clerk/nextjs/server");
    const session = await clerkServer.auth();
    if (session.userId) {
      return session.userId;
    }
    return isTestEnv ? "test-user" : null;
  } catch {
    return isTestEnv ? "test-user" : null;
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/push/unsubscribe",
  });

  if (!userId) {
    routeLogger.warn("Unauthorized push unsubscribe request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await unsubscribeUser(userId);
  routeLogger.info("Push subscription removed.");
  return NextResponse.json({ ok: true });
}
