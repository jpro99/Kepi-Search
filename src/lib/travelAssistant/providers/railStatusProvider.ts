import { z } from "zod";
import type {
  TravelUpdateEvent,
  TravelUpdateProvider,
  UpdatableReservation,
} from "@/lib/travelAssistant/travelUpdateTypes";
import {
  clampDelayMinutes,
  createTimeoutSignal,
  ensureSummary,
  normalizeLocationToken,
  normalizeProviderCode,
  parseProviderEvents,
} from "@/lib/travelAssistant/providers/providerUtils";

const RailEventSchema = z.object({
  confirmationCode: z.string().min(1),
  status: z.enum(["on_time", "delayed", "cancelled", "platform_changed"]),
  delayMinutes: z.number().int().nonnegative().optional(),
  platform: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
});

interface RailProviderConfig {
  endpoint: string;
  apiKey: string;
}

function resolveRailProviderConfig(): RailProviderConfig | null {
  const endpoint = process.env.RAIL_STATUS_API_URL?.trim();
  const apiKey = process.env.RAIL_STATUS_API_KEY?.trim();
  if (!endpoint || !apiKey) {
    return null;
  }
  return { endpoint, apiKey };
}

function mapRailEventToUpdate(
  reservation: UpdatableReservation,
  event: z.infer<typeof RailEventSchema>,
): TravelUpdateEvent {
  const normalizedDelay = clampDelayMinutes(event.delayMinutes);
  const normalizedPlatform = event.platform ? normalizeLocationToken(event.platform) : undefined;

  if (event.status === "cancelled") {
    return {
      provider: "rail-status-provider",
      kind: "cancellation",
      severity: "critical",
      summary: ensureSummary(event.summary, `${reservation.title} was cancelled`),
      detail: "Rail cancellation detected from live rail provider.",
      target: {
        reservationType: "train",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
    };
  }

  if (event.status === "platform_changed" && normalizedPlatform) {
    return {
      provider: "rail-status-provider",
      kind: "platform-change",
      severity: "warning",
      summary: ensureSummary(event.summary, `${reservation.title} changed to platform ${normalizedPlatform}`),
      detail: "Platform update detected from live rail provider.",
      target: {
        reservationType: "train",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      updatedLocation: `Platform ${normalizedPlatform}`,
    };
  }

  if (event.status === "delayed" && typeof normalizedDelay === "number") {
    const severity = normalizedDelay >= 30 ? "critical" : normalizedDelay >= 15 ? "warning" : "info";
    return {
      provider: "rail-status-provider",
      kind: "delay",
      severity,
      summary: ensureSummary(event.summary, `${reservation.title} delayed ${normalizedDelay} minutes`),
      detail: "Delay update detected from live rail provider.",
      target: {
        reservationType: "train",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      delayMinutes: normalizedDelay,
    };
  }

  return {
    provider: "rail-status-provider",
    kind: "on-time",
    severity: "info",
    summary: ensureSummary(event.summary, `${reservation.title} remains on time`),
    detail: "Live provider confirmed on-time status.",
    target: {
      reservationType: "train",
      confirmationCode: reservation.confirmationCode,
      titleHint: reservation.title,
    },
  };
}

export function createRailStatusProviderFromEnv(): TravelUpdateProvider | null {
  const config = resolveRailProviderConfig();
  if (!config) {
    return null;
  }

  return {
    name: "rail-status-provider",
    async fetchUpdates(args) {
      const candidates = args.reservations.filter((reservation) => reservation.type === "train");
      if (candidates.length === 0) return [];
      const byConfirmation = new Map(
        candidates.map((reservation) => [normalizeProviderCode(reservation.confirmationCode), reservation]),
      );

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          nowIso: args.nowIso,
          confirmations: candidates.map((reservation) => normalizeProviderCode(reservation.confirmationCode)),
        }),
        cache: "no-store",
        signal: createTimeoutSignal(),
      });

      if (!response.ok) {
        throw new Error(`Rail provider returned ${response.status}`);
      }

      const { validEvents, invalidCount, totalCount } = parseProviderEvents({
        payload: await response.json(),
        eventSchema: RailEventSchema,
      });
      if (totalCount > 0 && validEvents.length === 0) {
        throw new Error(`Rail provider payload invalid (${invalidCount}/${totalCount} events rejected)`);
      }

      return validEvents
        .map((event) => {
          const reservation = byConfirmation.get(normalizeProviderCode(event.confirmationCode));
          if (!reservation) return null;
          return mapRailEventToUpdate(reservation, event);
        })
        .filter((event): event is TravelUpdateEvent => event !== null);
    },
  };
}
