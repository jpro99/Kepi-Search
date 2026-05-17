import { z } from "zod";
import { inngest } from "@/inngest/client";
import {
  BackgroundRunTimeoutError,
  runManagedTravelUpdateBackgroundPass,
} from "@/lib/travelAssistant/backgroundRunManager";
import { BackgroundRunInProgressError } from "@/lib/travelAssistant/backgroundRunStateStore";
import { RuntimeStateUnavailableError } from "@/lib/travelAssistant/backgroundOrchestrator";
import { runTravelOpsAlertSweep } from "@/lib/travelAssistant/opsAlertingOrchestrator";
import { runWithKvUserContext } from "@/lib/travelAssistant/kvUserContext";

const TravelUpdateRequestedEventSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(["off", "mock", "auto"]).optional(),
  nowIso: z.string().datetime().optional(),
  timeoutMs: z.number().int().min(250).max(120000).optional(),
  trigger: z.string().min(1).optional(),
});

async function runAlertSweepSafe(trigger: string) {
  try {
    return await runTravelOpsAlertSweep({ trigger });
  } catch {
    return null;
  }
}

export const travelUpdatePass = inngest.createFunction(
  {
    id: "travel-update-pass",
    name: "Travel update pass",
    retries: 3,
    triggers: [{ event: "travel/update.requested" }],
  },
  async ({ event, logger }) => {
    const parsed = TravelUpdateRequestedEventSchema.safeParse(event.data);
    if (!parsed.success) {
      logger.warn("Skipping invalid travel/update.requested event payload", {
        errors: parsed.error.flatten(),
      });
      return {
        status: "invalid-event" as const,
        errors: parsed.error.flatten(),
      };
    }

    return runWithKvUserContext(parsed.data.userId, async () => {
      try {
        const backgroundRun = await runManagedTravelUpdateBackgroundPass({
          mode: parsed.data.mode,
          nowIso: parsed.data.nowIso,
          timeoutMs: parsed.data.timeoutMs,
        });
        const alertSweep = await runAlertSweepSafe(
          parsed.data.trigger ? `${parsed.data.trigger}-success` : "inngest-travel-update-success",
        );
        return {
          status: "success" as const,
          userId: parsed.data.userId,
          backgroundRun,
          alertSweep,
        };
      } catch (error) {
        if (error instanceof BackgroundRunInProgressError) {
          const alertSweep = await runAlertSweepSafe("inngest-travel-update-overlap");
          return {
            status: "skipped-overlap" as const,
            userId: parsed.data.userId,
            error: error.message,
            activeRunId: error.activeRunId,
            activeStartedAt: error.startedAt,
            alertSweep,
          };
        }
        if (error instanceof RuntimeStateUnavailableError) {
          const alertSweep = await runAlertSweepSafe("inngest-travel-update-runtime-missing");
          return {
            status: "runtime-missing" as const,
            userId: parsed.data.userId,
            error: error.message,
            alertSweep,
          };
        }
        if (error instanceof BackgroundRunTimeoutError) {
          const alertSweep = await runAlertSweepSafe("inngest-travel-update-timeout");
          return {
            status: "timeout" as const,
            userId: parsed.data.userId,
            error: error.message,
            runId: error.runId,
            timeoutMs: error.timeoutMs,
            alertSweep,
          };
        }
        throw error;
      }
    });
  },
);
