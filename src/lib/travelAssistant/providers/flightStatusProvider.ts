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

const FlightEventSchema = z.object({
  confirmationCode: z.string().min(1),
  status: z.enum(["on_time", "delayed", "cancelled", "gate_changed"]),
  delayMinutes: z.number().int().nonnegative().optional(),
  gate: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
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
  const normalizedDelay = clampDelayMinutes(event.delayMinutes);
  const normalizedGate = event.gate ? normalizeLocationToken(event.gate) : undefined;

  if (event.status === "cancelled") {
    return {
      provider: "flight-status-provider",
      kind: "cancellation",
      severity: "critical",
      summary: ensureSummary(event.summary, `${reservation.title} was cancelled`),
      detail: "Carrier cancellation detected from live flight status provider.",
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
    };
  }

  if (event.status === "gate_changed" && normalizedGate) {
    return {
      provider: "flight-status-provider",
      kind: "gate-change",
      severity: "warning",
      summary: ensureSummary(event.summary, `${reservation.title} gate changed to ${normalizedGate}`),
      detail: "Gate update detected from live flight status provider.",
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      updatedLocation: `Gate ${normalizedGate}`,
    };
  }

  if (event.status === "delayed" && typeof normalizedDelay === "number") {
    const severity = normalizedDelay >= 45 ? "critical" : normalizedDelay >= 20 ? "warning" : "info";
    return {
      provider: "flight-status-provider",
      kind: "delay",
      severity,
      summary: ensureSummary(event.summary, `${reservation.title} delayed ${normalizedDelay} minutes`),
      detail: "Delay update detected from live flight status provider.",
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      delayMinutes: normalizedDelay,
    };
  }

  return {
    provider: "flight-status-provider",
    kind: "on-time",
    severity: "info",
    summary: ensureSummary(event.summary, `${reservation.title} remains on time`),
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
        throw new Error(`Flight provider returned ${response.status}`);
      }

      const { validEvents, invalidCount, totalCount } = parseProviderEvents({
        payload: await response.json(),
        eventSchema: FlightEventSchema,
      });
      if (totalCount > 0 && validEvents.length === 0) {
        throw new Error(`Flight provider payload invalid (${invalidCount}/${totalCount} events rejected)`);
      }

      return validEvents
        .map((event) => {
          const reservation = byConfirmation.get(normalizeProviderCode(event.confirmationCode));
          if (!reservation) return null;
          return mapFlightEventToUpdate(reservation, event);
        })
        .filter((event): event is TravelUpdateEvent => event !== null);
    },
  };
}
