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
import { generateId } from "@/lib/utils/generateId";

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

const FlightLookupQuerySchema = z.object({
  action: z.literal("flight-lookup"),
  flightNumber: z.string().trim().min(2).max(16),
  airline: z.string().trim().min(2).max(120),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
});

const FlightLookupItemSchema = z.object({
  flight: z.object({
    iata: z.string().trim().min(1).nullable().optional(),
  }),
  airline: z.object({
    name: z.string().trim().min(1).nullable().optional(),
  }),
  departure: z.object({
    iata: z.string().trim().min(1).nullable().optional(),
    airport: z.string().trim().min(1).nullable().optional(),
    scheduled: z.string().trim().min(1).nullable().optional(),
    estimated: z.string().trim().min(1).nullable().optional(),
    terminal: z.string().trim().min(1).nullable().optional(),
    gate: z.string().trim().min(1).nullable().optional(),
    delay: z.number().finite().nullable().optional(),
  }),
  arrival: z.object({
    iata: z.string().trim().min(1).nullable().optional(),
    airport: z.string().trim().min(1).nullable().optional(),
    scheduled: z.string().trim().min(1).nullable().optional(),
    estimated: z.string().trim().min(1).nullable().optional(),
    terminal: z.string().trim().min(1).nullable().optional(),
    gate: z.string().trim().min(1).nullable().optional(),
    delay: z.number().finite().nullable().optional(),
  }),
  flight_status: z.string().trim().min(1).optional(),
});

const FlightLookupEnvelopeSchema = z.object({
  data: z.array(FlightLookupItemSchema).default([]),
  error: z
    .object({
      code: z.union([z.string(), z.number()]).optional(),
      message: z.string().optional(),
    })
    .optional(),
});

const AVIATIONSTACK_BASE_URL = "https://api.aviationstack.com/v1/flights";

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

function normalizeLookupValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

function normalizeFlightCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/gu, "");
}

function parseDateMs(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function chooseLookupResult(
  snapshots: readonly z.infer<typeof FlightLookupItemSchema>[],
  expectedFlightCode: string,
  expectedAirline: string,
  expectedDate: string,
): z.infer<typeof FlightLookupItemSchema> | null {
  const normalizedFlightCode = normalizeFlightCode(expectedFlightCode);
  const normalizedAirline = normalizeLookupValue(expectedAirline);
  const normalizedDate = expectedDate.trim();

  const exactFlightMatches = snapshots.filter(
    (snapshot) => normalizeFlightCode(snapshot.flight.iata ?? "") === normalizedFlightCode,
  );
  const airlineMatches = exactFlightMatches.filter((snapshot) =>
    normalizeLookupValue(snapshot.airline.name ?? "").includes(normalizedAirline),
  );
  const pool = airlineMatches.length > 0 ? airlineMatches : exactFlightMatches.length > 0 ? exactFlightMatches : snapshots;
  if (pool.length === 0) {
    return null;
  }

  const sameDay = pool.filter((snapshot) =>
    (snapshot.departure.scheduled ?? "").startsWith(normalizedDate),
  );
  const ranked = (sameDay.length > 0 ? sameDay : pool).sort((left, right) => {
    const leftMs = parseDateMs(left.departure.scheduled);
    const rightMs = parseDateMs(right.departure.scheduled);
    if (Number.isNaN(leftMs) && Number.isNaN(rightMs)) return 0;
    if (Number.isNaN(leftMs)) return 1;
    if (Number.isNaN(rightMs)) return -1;
    return leftMs - rightMs;
  });
  return ranked[0] ?? null;
}

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || generateId();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/travel-updates",
    method: "GET",
  });

  if (!userId) {
    routeLogger.warn("Unauthorized travel updates lookup request.");
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

  const url = new URL(req.url);
  const parsed = FlightLookupQuerySchema.safeParse({
    action: url.searchParams.get("action"),
    flightNumber: url.searchParams.get("flightNumber"),
    airline: url.searchParams.get("airline"),
    flightDate: url.searchParams.get("flightDate"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422, headers: rateLimit.headers },
    );
  }

  const apiKey = process.env.AVIATIONSTACK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Flight lookup unavailable: AVIATIONSTACK_API_KEY is missing." },
      { status: 503, headers: rateLimit.headers },
    );
  }

  const lookupUrl = new URL(AVIATIONSTACK_BASE_URL);
  lookupUrl.searchParams.set("access_key", apiKey);
  lookupUrl.searchParams.set("flight_iata", parsed.data.flightNumber);
  lookupUrl.searchParams.set("flight_date", parsed.data.flightDate);
  lookupUrl.searchParams.set("limit", "10");

  try {
    const response = await fetch(lookupUrl, { method: "GET", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`AviationStack returned ${response.status}`);
    }
    const parsedEnvelope = FlightLookupEnvelopeSchema.safeParse(await response.json());
    if (!parsedEnvelope.success) {
      throw new Error("Flight lookup payload validation failed.");
    }
    if (parsedEnvelope.data.error?.message) {
      throw new Error(parsedEnvelope.data.error.message);
    }

    const bestMatch = chooseLookupResult(
      parsedEnvelope.data.data,
      parsed.data.flightNumber,
      parsed.data.airline,
      parsed.data.flightDate,
    );
    if (!bestMatch) {
      return NextResponse.json(
        { error: "No matching flight found for that number, airline, and date." },
        { status: 404, headers: rateLimit.headers },
      );
    }

    return NextResponse.json(
      {
        flightNumber: bestMatch.flight.iata ?? parsed.data.flightNumber,
        airline: bestMatch.airline.name ?? parsed.data.airline,
        flightDate: parsed.data.flightDate,
        departureAirport: bestMatch.departure.iata ?? bestMatch.departure.airport ?? "",
        arrivalAirport: bestMatch.arrival.iata ?? bestMatch.arrival.airport ?? "",
        departureTime: bestMatch.departure.estimated ?? bestMatch.departure.scheduled ?? "",
        arrivalTime: bestMatch.arrival.estimated ?? bestMatch.arrival.scheduled ?? "",
        departureTerminal: bestMatch.departure.terminal ?? "",
        departureGate: bestMatch.departure.gate ?? "",
        arrivalTerminal: bestMatch.arrival.terminal ?? "",
        arrivalGate: bestMatch.arrival.gate ?? "",
        delayMinutes:
          typeof bestMatch.departure.delay === "number"
            ? Math.max(0, Math.round(bestMatch.departure.delay))
            : typeof bestMatch.arrival.delay === "number"
              ? Math.max(0, Math.round(bestMatch.arrival.delay))
              : null,
        onTime: (() => {
          const status = (bestMatch.flight_status ?? "").trim().toLowerCase();
          const delay =
            typeof bestMatch.departure.delay === "number"
              ? bestMatch.departure.delay
              : typeof bestMatch.arrival.delay === "number"
                ? bestMatch.arrival.delay
                : null;
          if (typeof delay === "number") {
            return delay <= 0;
          }
          if (status.includes("delay")) {
            return false;
          }
          if (status === "scheduled" || status === "active" || status === "on-time" || status === "on time") {
            return true;
          }
          if (status === "cancelled" || status === "canceled" || status === "diverted") {
            return false;
          }
          return null;
        })(),
        flightStatus: bestMatch.flight_status ?? "unknown",
      },
      { headers: rateLimit.headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown flight lookup error.";
    routeLogger.warn("Flight lookup failed.", { error: message });
    return NextResponse.json({ error: `Flight lookup failed: ${message}` }, { status: 502, headers: rateLimit.headers });
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || generateId();
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
