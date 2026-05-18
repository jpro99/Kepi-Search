import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAutomatedTestRuntime } from "@/lib/auth/mockClerkAuth";
import { sendDisruptionAlert } from "@/lib/email/emailService";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { runTravelUpdateCheck } from "@/lib/travelAssistant/updateAdapters";
import { persistTravelUpdateAudit } from "@/lib/travelAssistant/updateAuditStore";
import { persistTravelRuntimeState } from "@/lib/travelAssistant/updateRuntimeStateStore";
import type { TravelUpdateEvent } from "@/lib/travelAssistant/travelUpdateTypes";

const ReservationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["flight", "train", "ride", "hotel", "dinner"]),
  title: z.string().min(1),
  confirmationCode: z.string().min(1),
  localTime: z.string().min(1),
  location: z.string().min(1),
  timezone: z.string().min(1),
});

const BodySchema = z.object({
  mode: z.enum(["off", "mock", "auto"]).default("auto"),
  nowIso: z.string().datetime().optional(),
  reservations: z.array(ReservationSchema),
});

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

function pickDisruptionUpdate(updates: readonly TravelUpdateEvent[]): TravelUpdateEvent | null {
  return (
    updates.find((update) => update.kind === "cancellation" || update.severity === "critical") ??
    updates.find((update) => update.kind === "delay" && (update.delayMinutes ?? 0) >= 20) ??
    null
  );
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/travel-updates",
  });

  if (!userId) {
    routeLogger.warn("Unauthorized travel update request.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit({
    policyName: "travel-updates-general",
    identifier: userId,
    route: "/api/travel-updates",
    requestId,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      { status: 429, headers: rateLimit.headers },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    routeLogger.warn("Rejected travel update request due to invalid JSON body.");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    routeLogger.warn("Travel update payload validation failed.", {
      issues: parsed.error.issues.length,
    });
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const effectiveNowIso = parsed.data.nowIso ?? new Date().toISOString();
  await persistTravelRuntimeState({
    reservations: parsed.data.reservations,
    mode: parsed.data.mode,
    updatedAt: effectiveNowIso,
  });

  const result = await runTravelUpdateCheck({
    mode: parsed.data.mode,
    reservations: parsed.data.reservations,
    nowIso: effectiveNowIso,
  });

  const audit = await persistTravelUpdateAudit({
    result,
    checkedAt: effectiveNowIso,
    source: "interactive",
  });

  routeLogger.info("Travel update check completed.", {
    mode: parsed.data.mode,
    reservationCount: parsed.data.reservations.length,
    incomingUpdates: result.updates.length,
    freshUpdates: audit.freshUpdates.length,
    duplicateUpdates: audit.duplicateUpdates,
  });

  const disruptionUpdate = pickDisruptionUpdate(audit.freshUpdates);
  if (disruptionUpdate) {
    const affectedReservation =
      parsed.data.reservations.find(
        (reservation) =>
          reservation.confirmationCode === disruptionUpdate.target.confirmationCode ||
          reservation.title === disruptionUpdate.target.titleHint,
      ) ?? null;
    void sendDisruptionAlert(userId, {
      affectedReservationTitle: affectedReservation?.title ?? disruptionUpdate.target.titleHint ?? "Affected reservation",
      disruptionType: disruptionUpdate.kind,
      severity: disruptionUpdate.severity,
      detail: disruptionUpdate.detail,
      affectedReservationId: affectedReservation?.id,
    });
  }

  return NextResponse.json({
    ...result,
    updates: audit.freshUpdates,
    audit: audit.summary,
  });
}
