import { readTravelUpdateAuditSnapshot } from "@/lib/travelAssistant/updateAuditStore";
import { readTravelRuntimeState } from "@/lib/travelAssistant/updateRuntimeStateStore";
import type { TravelOpsHealthStatus, TravelOpsSnapshot } from "@/lib/travelAssistant/travelUpdateTypes";

const DEFAULT_STALE_MINUTES_YELLOW = 10;
const DEFAULT_STALE_MINUTES_RED = 30;

export async function buildTravelOpsSnapshot({
  nowIso,
  auditLimit = 20,
  runtimeStatePath,
  auditPath,
}: {
  nowIso?: string;
  auditLimit?: number;
  runtimeStatePath?: string;
  auditPath?: string;
} = {}): Promise<TravelOpsSnapshot> {
  const generatedAt = nowIso ?? new Date().toISOString();
  const nowMs = Date.parse(generatedAt);

  const [runtime, audit] = await Promise.all([
    readTravelRuntimeState(runtimeStatePath),
    readTravelUpdateAuditSnapshot({ limit: auditLimit, storagePath: auditPath }),
  ]);

  const runtimeUpdatedMs = Date.parse(runtime.updatedAt);
  const staleMinutesRaw = Number.isNaN(runtimeUpdatedMs)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.round((nowMs - runtimeUpdatedMs) / 60000));
  const staleMinutes = Number.isFinite(staleMinutesRaw) ? staleMinutesRaw : 999999;
  const isStale = staleMinutes >= DEFAULT_STALE_MINUTES_YELLOW;

  const recentErrorCount = audit.recentAuditTrail.filter((entry) => entry.providerError).length;
  const circuitOpenCount = audit.recentAuditTrail.filter((entry) => entry.circuitOpen).length;
  const latestBackgroundRun = audit.recentAuditTrail.find((entry) => entry.source === "background") ?? null;
  const reasons: string[] = [];

  let health: TravelOpsHealthStatus = "green";
  if (runtime.reservations.length === 0) {
    health = "red";
    reasons.push("No runtime reservation snapshot available for background updates.");
  }
  if (audit.recentAuditTrail.length === 0) {
    if (health !== "red") health = "yellow";
    reasons.push("No recent audit runs recorded yet.");
  }
  if (staleMinutes >= DEFAULT_STALE_MINUTES_RED) {
    health = "red";
    reasons.push(`Runtime snapshot stale for ${staleMinutes} minutes.`);
  } else if (staleMinutes >= DEFAULT_STALE_MINUTES_YELLOW) {
    if (health !== "red") health = "yellow";
    reasons.push(`Runtime snapshot approaching staleness (${staleMinutes} minutes).`);
  }
  if (circuitOpenCount > 0) {
    health = "red";
    reasons.push(`Provider circuit open detected in ${circuitOpenCount} recent run(s).`);
  } else if (recentErrorCount > 0) {
    if (health !== "red") health = "yellow";
    reasons.push(`Provider errors observed in ${recentErrorCount} recent run(s).`);
  }
  if (reasons.length === 0) {
    reasons.push("All checks healthy.");
  }

  return {
    generatedAt,
    health,
    reasons,
    runtime: {
      mode: runtime.mode,
      updatedAt: runtime.updatedAt,
      reservationCount: runtime.reservations.length,
      staleMinutes,
      isStale,
    },
    audit,
    latestBackgroundRun,
    provider: {
      recentErrorCount,
      circuitOpenCount,
    },
  };
}
