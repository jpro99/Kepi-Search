import { z } from "zod";
import type {
  TravelUpdateEvent,
  TravelUpdateProvider,
  UpdatableReservation,
} from "@/lib/travelAssistant/travelUpdateTypes";

const RailEventSchema = z.object({
  confirmationCode: z.string().min(1),
  status: z.enum(["on_time", "delayed", "cancelled", "platform_changed"]),
  delayMinutes: z.number().int().nonnegative().optional(),
  platform: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
});

const RailResponseSchema = z.object({
  events: z.array(RailEventSchema),
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
  if (event.status === "cancelled") {
    return {
      provider: "rail-status-provider",
      kind: "cancellation",
      severity: "critical",
      summary: event.summary ?? `${reservation.title} was cancelled`,
      detail: "Rail cancellation detected from live rail provider.",
      target: {
        reservationType: "train",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
    };
  }

  if (event.status === "platform_changed" && event.platform) {
    return {
      provider: "rail-status-provider",
      kind: "platform-change",
      severity: "warning",
      summary: event.summary ?? `${reservation.title} changed to platform ${event.platform}`,
      detail: "Platform update detected from live rail provider.",
      target: {
        reservationType: "train",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      updatedLocation: `Platform ${event.platform}`,
    };
  }

  if (event.status === "delayed" && typeof event.delayMinutes === "number") {
    const severity = event.delayMinutes >= 30 ? "critical" : event.delayMinutes >= 15 ? "warning" : "info";
    return {
      provider: "rail-status-provider",
      kind: "delay",
      severity,
      summary: event.summary ?? `${reservation.title} delayed ${event.delayMinutes} minutes`,
      detail: "Delay update detected from live rail provider.",
      target: {
        reservationType: "train",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      delayMinutes: event.delayMinutes,
    };
  }

  return {
    provider: "rail-status-provider",
    kind: "on-time",
    severity: "info",
    summary: event.summary ?? `${reservation.title} remains on time`,
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

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          nowIso: args.nowIso,
          confirmations: candidates.map((reservation) => reservation.confirmationCode),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      });

      if (!response.ok) {
        throw new Error(`Rail provider returned ${response.status}`);
      }

      const payload = RailResponseSchema.parse(await response.json());
      const byConfirmation = new Map(candidates.map((reservation) => [reservation.confirmationCode, reservation]));
      return payload.events
        .map((event) => {
          const reservation = byConfirmation.get(event.confirmationCode);
          if (!reservation) return null;
          return mapRailEventToUpdate(reservation, event);
        })
        .filter((event): event is TravelUpdateEvent => event !== null);
    },
  };
}
