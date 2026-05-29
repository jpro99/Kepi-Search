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
} from "@/lib/travelAssistant/providers/providerUtils";
import { createMockTravelUpdateProvider } from "@/lib/travelAssistant/providers/mockTransportProvider";
import { logger } from "@/lib/logger";

const AERODATABOX_BASE_URL = "https://prod.api.market/api/v1/aedbx/aerodatabox";
type FlightGovernanceStatus = "green" | "yellow" | "red";

const AeroDataBoxTimeSchema = z.object({
  local: z.string().trim().optional().nullable(),
  utc: z.string().trim().optional().nullable(),
});

const AeroDataBoxAirportSchema = z.object({
  iata: z.string().trim().optional().nullable(),
  name: z.string().trim().optional().nullable(),
});

const AeroDataBoxEndpointSchema = z.object({
  airport: AeroDataBoxAirportSchema.optional().nullable(),
  scheduledTime: AeroDataBoxTimeSchema.optional().nullable(),
  estimatedTime: AeroDataBoxTimeSchema.optional().nullable(),
  actualTime: AeroDataBoxTimeSchema.optional().nullable(),
  delay: z.number().finite().optional().nullable(),
});

const AeroDataBoxFlightSchema = z.object({
  number: z.string().trim().optional().nullable(),
  status: z.string().trim().optional().nullable(),
  airline: z.object({ name: z.string().trim().optional().nullable() }).optional().nullable(),
  departure: AeroDataBoxEndpointSchema.optional().nullable(),
  arrival: AeroDataBoxEndpointSchema.optional().nullable(),
});

interface FlightProviderConfig {
  apiKey: string;
}

function resolveFlightProviderConfig(): FlightProviderConfig | null {
  const apiKey = process.env.AERODATABOX_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return { apiKey };
}

function parseDateToMs(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function calculateDelayMinutes(args: {
  scheduledDeparture: string | null | undefined;
  estimatedDeparture: string | null | undefined;
  scheduledArrival: string | null | undefined;
  estimatedArrival: string | null | undefined;
}): number | undefined {
  const departureScheduledMs = parseDateToMs(args.scheduledDeparture);
  const departureEstimatedMs = parseDateToMs(args.estimatedDeparture);
  if (!Number.isNaN(departureScheduledMs) && !Number.isNaN(departureEstimatedMs)) {
    return clampDelayMinutes(Math.round((departureEstimatedMs - departureScheduledMs) / 60000));
  }

  const arrivalScheduledMs = parseDateToMs(args.scheduledArrival);
  const arrivalEstimatedMs = parseDateToMs(args.estimatedArrival);
  if (!Number.isNaN(arrivalScheduledMs) && !Number.isNaN(arrivalEstimatedMs)) {
    return clampDelayMinutes(Math.round((arrivalEstimatedMs - arrivalScheduledMs) / 60000));
  }
  return undefined;
}

function mapAeroDataBoxStatusToGovernanceStatus(
  status: string,
  delayMinutes: number | undefined,
): FlightGovernanceStatus {
  if (status === "cancelled" || status === "diverted") {
    return "red";
  }
  if (status === "delayed" || (typeof delayMinutes === "number" && delayMinutes >= 20)) {
    return "yellow";
  }
  return "green";
}

function extractFlightNumber(reservation: UpdatableReservation): string | null {
  const fromTitle = reservation.title
    .toUpperCase()
    .match(/\b([A-Z0-9]{2,3})[\s-]?(\d{1,4}[A-Z]?)\b/);
  if (fromTitle) {
    return `${fromTitle[1]}${fromTitle[2]}`;
  }

  const normalizedConfirmation = reservation.confirmationCode.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
  if (/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalizedConfirmation)) {
    return normalizedConfirmation;
  }
  return null;
}

function extractFlightDate(reservation: UpdatableReservation): string | null {
  const directMatch = reservation.localTime.match(/^(\d{4}-\d{2}-\d{2})/u);
  if (directMatch?.[1]) {
    return directMatch[1];
  }
  const parsed = Date.parse(reservation.localTime);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function selectBestFlightSnapshot(
  snapshots: readonly z.infer<typeof AeroDataBoxFlightSchema>[],
  expectedFlightNumber: string,
): z.infer<typeof AeroDataBoxFlightSchema> | null {
  const normalizedExpected = normalizeProviderCode(expectedFlightNumber);
  const statusPriority = [
    "enroute",
    "boarding",
    "gateclosed",
    "departed",
    "approaching",
    "arrived",
    "delayed",
    "landed",
    "scheduled",
    "cancelled",
    "diverted",
  ] as const;
  const matching = snapshots.filter(
    (snapshot) => normalizeProviderCode(snapshot.number ?? "") === normalizedExpected,
  );
  const pool = matching.length > 0 ? matching : snapshots;
  if (pool.length === 0) return null;

  return [...pool].sort((left, right) => {
    const leftStatusPriority = statusPriority.indexOf((left.status ?? "").toLowerCase() as (typeof statusPriority)[number]);
    const rightStatusPriority = statusPriority.indexOf((right.status ?? "").toLowerCase() as (typeof statusPriority)[number]);
    if (leftStatusPriority !== rightStatusPriority) {
      if (leftStatusPriority === -1) return 1;
      if (rightStatusPriority === -1) return -1;
      return leftStatusPriority - rightStatusPriority;
    }
    const leftTime = parseDateToMs(
      left.departure?.scheduledTime?.utc ??
        left.departure?.scheduledTime?.local ??
        left.departure?.estimatedTime?.utc ??
        left.departure?.estimatedTime?.local,
    );
    const rightTime = parseDateToMs(
      right.departure?.scheduledTime?.utc ??
        right.departure?.scheduledTime?.local ??
        right.departure?.estimatedTime?.utc ??
        right.departure?.estimatedTime?.local,
    );
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  })[0];
}

function resolveAeroDataBoxTime(endpoint: z.infer<typeof AeroDataBoxEndpointSchema> | null | undefined): string {
  if (!endpoint) return "";
  return (
    endpoint.actualTime?.utc ??
    endpoint.actualTime?.local ??
    endpoint.estimatedTime?.utc ??
    endpoint.estimatedTime?.local ??
    endpoint.scheduledTime?.utc ??
    endpoint.scheduledTime?.local ??
    ""
  );
}

function resolveAeroDataBoxStatus(status: string | null | undefined): { normalizedStatus: string; onTime: boolean | null } {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "cancelled" || normalized === "cancelleduncertain") {
    return { normalizedStatus: "cancelled", onTime: false };
  }
  if (normalized === "diverted") {
    return { normalizedStatus: "diverted", onTime: false };
  }
  if (normalized === "delayed") {
    return { normalizedStatus: "delayed", onTime: false };
  }
  if (normalized === "enroute" || normalized === "approaching" || normalized === "departed") {
    return { normalizedStatus: "active", onTime: null };
  }
  if (normalized === "arrived" || normalized === "landed") {
    return { normalizedStatus: "landed", onTime: null };
  }
  if (normalized === "boarding" || normalized === "gateclosed" || normalized === "checkin") {
    return { normalizedStatus: "boarding", onTime: null };
  }
  if (normalized === "scheduled") {
    return { normalizedStatus: "scheduled", onTime: null };
  }
  return { normalizedStatus: normalized || "unknown", onTime: null };
}

function mapFlightSnapshotToUpdate(
  reservation: UpdatableReservation,
  snapshot: z.infer<typeof AeroDataBoxFlightSchema>,
): TravelUpdateEvent {
  const normalizedDelay = calculateDelayMinutes({
    scheduledDeparture:
      snapshot.departure?.scheduledTime?.utc ?? snapshot.departure?.scheduledTime?.local,
    estimatedDeparture:
      snapshot.departure?.estimatedTime?.utc ?? snapshot.departure?.estimatedTime?.local,
    scheduledArrival:
      snapshot.arrival?.scheduledTime?.utc ?? snapshot.arrival?.scheduledTime?.local,
    estimatedArrival:
      snapshot.arrival?.estimatedTime?.utc ?? snapshot.arrival?.estimatedTime?.local,
  });
  const explicitDelay = typeof snapshot.departure?.delay === "number"
    ? clampDelayMinutes(snapshot.departure.delay)
    : typeof snapshot.arrival?.delay === "number"
      ? clampDelayMinutes(snapshot.arrival.delay)
      : undefined;
  const finalDelay = explicitDelay ?? normalizedDelay;
  const status = resolveAeroDataBoxStatus(snapshot.status);
  const governanceStatus = mapAeroDataBoxStatusToGovernanceStatus(status.normalizedStatus, finalDelay);
  const departureAirport = normalizeLocationToken(
    snapshot.departure?.airport?.iata ?? snapshot.departure?.airport?.name ?? "unknown",
  );
  const arrivalAirport = normalizeLocationToken(
    snapshot.arrival?.airport?.iata ?? snapshot.arrival?.airport?.name ?? "unknown",
  );
  const routeSummary = `${departureAirport} -> ${arrivalAirport}`;
  const scheduleSummary = [
    `Dep ${resolveAeroDataBoxTime(snapshot.departure) || "n/a"}`,
    `Arr ${resolveAeroDataBoxTime(snapshot.arrival) || "n/a"}`,
  ].join(" | ");

  if (governanceStatus === "red") {
    return {
      provider: "flight-status-provider",
      kind: "cancellation",
      severity: "critical",
      summary: ensureSummary(
        undefined,
        `${reservation.title} ${status.normalizedStatus === "cancelled" ? "cancelled" : status.normalizedStatus}`,
      ),
      detail: `AeroDataBox status ${status.normalizedStatus}. Route ${routeSummary}. ${scheduleSummary}`,
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
    };
  }

  if (governanceStatus === "yellow") {
    const severity = typeof finalDelay === "number" && finalDelay >= 45 ? "critical" : "warning";
    const delayDescriptor =
      typeof finalDelay === "number" && finalDelay > 0
        ? `${finalDelay} minutes`
        : "operational status";
    return {
      provider: "flight-status-provider",
      kind: "delay",
      severity,
      summary: `${reservation.title} delayed (${delayDescriptor})`,
      detail: `AeroDataBox status ${status.normalizedStatus}. Route ${routeSummary}. ${scheduleSummary}`,
      target: {
        reservationType: "flight",
        confirmationCode: reservation.confirmationCode,
        titleHint: reservation.title,
      },
      delayMinutes: finalDelay,
    };
  }

  return {
    provider: "flight-status-provider",
    kind: "on-time",
    severity: "info",
    summary: `${reservation.title} on time`,
    detail: `AeroDataBox status ${status.normalizedStatus}. Route ${routeSummary}. ${scheduleSummary}`,
    target: {
      reservationType: "flight",
      confirmationCode: reservation.confirmationCode,
      titleHint: reservation.title,
    },
  };
}

async function runMockFallback(args: {
  reservations: readonly UpdatableReservation[];
  nowIso: string;
  reason: string;
}): Promise<TravelUpdateEvent[]> {
  logger.warn(`${args.reason}; falling back to mock transport provider.`, {
    scope: "travelAssistant/flightStatusProvider",
  });
  const fallbackProvider = createMockTravelUpdateProvider();
  const fallbackUpdates = await fallbackProvider.fetchUpdates({
    reservations: args.reservations,
    nowIso: args.nowIso,
  });
  return fallbackUpdates.filter((event) => event.target.reservationType === "flight");
}

export function createFlightStatusProviderFromEnv(): TravelUpdateProvider {
  const config = resolveFlightProviderConfig();

  return {
    name: "flight-status-provider",
    async fetchUpdates(args) {
      const candidates = args.reservations.filter((reservation) => reservation.type === "flight");
      if (candidates.length === 0) return [];
      if (!config) {
        return runMockFallback({
          reservations: candidates,
          nowIso: args.nowIso,
          reason: "AERODATABOX_API_KEY is missing",
        });
      }

      const updates: TravelUpdateEvent[] = [];
      for (const reservation of candidates) {
        const flightNumber = extractFlightNumber(reservation);
        const flightDate = extractFlightDate(reservation);
        if (!flightNumber || !flightDate) {
          continue;
        }

        try {
          const lookupUrl = `${AERODATABOX_BASE_URL}/flights/number/${encodeURIComponent(flightNumber)}/${encodeURIComponent(flightDate)}`;
          const response = await fetch(lookupUrl, {
            method: "GET",
            headers: {
              "x-api-market-key": config.apiKey,
              Accept: "application/json",
            },
            cache: "no-store",
            signal: createTimeoutSignal(),
          });
          if (response.status === 204) {
            continue;
          }
          if (response.status === 404) {
            continue;
          }
          if (!response.ok) {
            const errText = await response.text().catch(() => "");
            throw new Error(`AeroDataBox returned ${response.status}: ${errText.slice(0, 200)}`);
          }

          const rawPayload = await response.json();
          const normalizedPayload = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
          const parsedFlights = z.array(AeroDataBoxFlightSchema).safeParse(normalizedPayload);
          if (!parsedFlights.success) {
            throw new Error("AeroDataBox payload validation failed");
          }

          const snapshot = selectBestFlightSnapshot(parsedFlights.data, flightNumber);
          if (!snapshot) {
            continue;
          }
          updates.push(mapFlightSnapshotToUpdate(reservation, snapshot));
        } catch (error) {
          const fallbackUpdates = await runMockFallback({
            reservations: [reservation],
            nowIso: args.nowIso,
            reason: error instanceof Error ? error.message : "AeroDataBox request failed",
          });
          updates.push(...fallbackUpdates);
        }
      }
      return updates;
    },
  };
}

export {
  AeroDataBoxFlightSchema,
  mapAeroDataBoxStatusToGovernanceStatus,
  resolveAeroDataBoxStatus,
  calculateDelayMinutes,
  extractFlightNumber,
  extractFlightDate,
};
