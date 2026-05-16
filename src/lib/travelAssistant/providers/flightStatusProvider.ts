import { z } from "zod";
import type {
  TravelUpdateEvent,
  TravelUpdateProvider,
  UpdatableReservation,
} from "@/lib/travelAssistant/travelUpdateTypes";

const FlightEventSchema = z.object({
  confirmationCode: z.string().min(1),
  status: z.enum(["on_time", "delayed", "cancelled", "gate_changed"]),
  delayMinutes: z.number().int().nonnegative().optional(),
  gate: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
});

const FlightResponseSchema = z.object({
  events: z.array(FlightEventSchema),
});

interface FlightProviderConfig {
  endpoint: string;
  apiKey: string;
}

function resolveFlightProviderConfig(): FlightProviderConfig | null {
  const endpoint = process.env.FLIGHT_STATUS_API_URL?.trim();
  const apiKey = process.env.FLIGHT_STATUS_API_KEY?.trim();
  if (!endpoint || !apiKey) {
    return null;
  }
  return { endpoint, apiKey };
}

function mapFlightEventToUpdate(
  reservation: UpdatableReservation,
  event: z.infer<typeof FlightEventSchema>,
): TravelUpdateEvent {
  if (event.status === "cancelled") {
    return {
      provider: "flight-status-provider",
      kind: "cancellation",
      severity: "critical",
      summary: event.summary ?? `${reservation.title} was cancelled`,
      detail: "Carrier cancellation detected from live flight status provider.",
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
    };
  }

  if (event.status === "gate_changed" && event.gate) {
    return {
      provider: "flight-status-provider",
      kind: "gate-change",
      severity: "warning",
      summary: event.summary ?? `${reservation.title} gate changed to ${event.gate}`,
      detail: "Gate update detected from live flight status provider.",
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      updatedLocation: `Gate ${event.gate}`,
    };
  }

  if (event.status === "delayed" && typeof event.delayMinutes === "number") {
    const severity = event.delayMinutes >= 45 ? "critical" : event.delayMinutes >= 20 ? "warning" : "info";
    return {
      provider: "flight-status-provider",
      kind: "delay",
      severity,
      summary: event.summary ?? `${reservation.title} delayed ${event.delayMinutes} minutes`,
      detail: "Delay update detected from live flight status provider.",
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      delayMinutes: event.delayMinutes,
    };
  }

  return {
    provider: "flight-status-provider",
    kind: "on-time",
    severity: "info",
    summary: event.summary ?? `${reservation.title} remains on time`,
    detail: "Live provider confirmed on-time status.",
    target: {
      reservationType: "flight",
      confirmationCode: reservation.confirmationCode,
      titleHint: reservation.title,
    },
  };
}

export function createFlightStatusProviderFromEnv(): TravelUpdateProvider | null {
  const config = resolveFlightProviderConfig();
  if (!config) {
    return null;
  }

  return {
    name: "flight-status-provider",
    async fetchUpdates(args) {
      const candidates = args.reservations.filter((reservation) => reservation.type === "flight");
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
        throw new Error(`Flight provider returned ${response.status}`);
      }
      const payload = FlightResponseSchema.parse(await response.json());
      const byConfirmation = new Map(candidates.map((reservation) => [reservation.confirmationCode, reservation]));
      return payload.events
        .map((event) => {
          const reservation = byConfirmation.get(event.confirmationCode);
          if (!reservation) return null;
          return mapFlightEventToUpdate(reservation, event);
        })
        .filter((event): event is TravelUpdateEvent => event !== null);
    },
  };
}
