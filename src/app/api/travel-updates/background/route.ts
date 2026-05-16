import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BackgroundRunTimeoutError,
  runManagedTravelUpdateBackgroundPass,
} from "@/lib/travelAssistant/backgroundRunManager";
import { runTravelOpsAlertSweep } from "@/lib/travelAssistant/opsAlertingOrchestrator";
import { BackgroundRunInProgressError } from "@/lib/travelAssistant/backgroundRunStateStore";
import {
  RuntimeStateUnavailableError,
} from "@/lib/travelAssistant/backgroundOrchestrator";

const BodySchema = z.object({
  mode: z.enum(["off", "mock", "auto"]).optional(),
  nowIso: z.string().datetime().optional(),
  timeoutMs: z.number().int().min(250).max(120000).optional(),
});

function isAuthorized(req: Request): boolean {
  const expectedSecret = process.env.TRAVEL_UPDATE_CRON_SECRET?.trim();
  if (!expectedSecret) {
    return true;
  }
  const headerSecret = req.headers.get("x-travel-cron-secret")?.trim();
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return headerSecret === expectedSecret || bearerToken === expectedSecret;
}

async function runAlertSweepSafe(trigger: string) {
  try {
    return await runTravelOpsAlertSweep({ trigger });
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized background trigger" }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const backgroundRun = await runManagedTravelUpdateBackgroundPass({
      mode: parsed.data.mode,
      nowIso: parsed.data.nowIso,
      timeoutMs: parsed.data.timeoutMs,
    });
    const alertSweep = await runAlertSweepSafe("background-route-success");
    return NextResponse.json({
      ...backgroundRun,
      alertSweep,
    });
  } catch (error) {
    if (error instanceof BackgroundRunInProgressError) {
      const alertSweep = await runAlertSweepSafe("background-route-overlap");
      return NextResponse.json(
        { error: error.message, activeRunId: error.activeRunId, activeStartedAt: error.startedAt, alertSweep },
        { status: 409 },
      );
    }
    if (error instanceof RuntimeStateUnavailableError) {
      const alertSweep = await runAlertSweepSafe("background-route-runtime-missing");
      return NextResponse.json({ error: error.message, alertSweep }, { status: 409 });
    }
    if (error instanceof BackgroundRunTimeoutError) {
      const alertSweep = await runAlertSweepSafe("background-route-timeout");
      return NextResponse.json(
        { error: error.message, runId: error.runId, timeoutMs: error.timeoutMs, alertSweep },
        { status: 504 },
      );
    }
    throw error;
  }
}
