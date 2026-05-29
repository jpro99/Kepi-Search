/**
 * Flight status provider — uses AeroDataBox via api.market.
 * This is the background polling provider that runs every 90 seconds
 * to check for delays, cancellations, and gate changes.
 *
 * Previously used AviationStack (AVIATIONSTACK_API_KEY) which was not
 * configured. Switched to AeroDataBox (AERODATABOX_API_KEY) which is
 * the same key used by the manual "Check status" button.
 */

import { z } from "zod";
import type { TravelUpdateProvider, TravelUpdateEvent, UpdatableReservation } from "@/lib/travelAssistant/travelUpdateTypes";

const AERODATABOX_BASE = "https://prod.api.market/api/v1/aedbx/aerodatabox";
const TIMEOUT_MS = 12_000;

/* ─── Config ─────────────────────────────────────────────────── */
interface FlightProviderConfig { apiKey: string; }

function resolveFlightProviderConfig(): FlightProviderConfig | null {
  const apiKey = (
    process.env.AERODATABOX_API_KEY ||
    process.env.NEXT_PUBLIC_AERODATABOX_API_KEY
  )?.trim();
  if (!apiKey) return null;
  return { apiKey };
}

/* ─── Response schema ────────────────────────────────────────── */
const AeroFlightSchema = z.object({
  number: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  airline: z.object({ name: z.string().optional().nullable() }).optional().nullable(),
  departure: z.object({
    airport: z.object({ iata: z.string().optional().nullable() }).optional().nullable(),
    scheduledTimeLocal: z.string().optional().nullable(),
    actualTimeLocal: z.string().optional().nullable(),
    gate: z.string().optional().nullable(),
    terminal: z.string().optional().nullable(),
    delay: z.number().optional().nullable(),
  }).optional().nullable(),
  arrival: z.object({
    airport: z.object({ iata: z.string().optional().nullable() }).optional().nullable(),
    scheduledTimeLocal: z.string().optional().nullable(),
    actualTimeLocal: z.string().optional().nullable(),
    gate: z.string().optional().nullable(),
    terminal: z.string().optional().nullable(),
    delay: z.number().optional().nullable(),
  }).optional().nullable(),
});

type AeroFlight = z.infer<typeof AeroFlightSchema>;

/* ─── Helpers ────────────────────────────────────────────────── */
function resolveStatus(status: string | null | undefined): { kind: "on-time" | "delay" | "cancellation"; delayMin: number | null } {
  const s = (status ?? "").toLowerCase();
  if (s === "cancelled" || s === "cancelleduncertain") return { kind: "cancellation", delayMin: null };
  if (s === "delayed") return { kind: "delay", delayMin: null };
  return { kind: "on-time", delayMin: null };
}

function flightDate(reservation: UpdatableReservation): string {
  // localTime is "YYYY-MM-DD HH:mm" — extract date portion
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(reservation.localTime?.trim() ?? "");
  return m?.[1] ?? new Date().toISOString().slice(0, 10);
}

function extractFlightNumber(reservation: UpdatableReservation): string | null {
  // Try typed fields first
  const r = reservation as unknown as Record<string, unknown>;
  const fn = (r.flightNumber ?? r.flight_number ?? r.flightIata ?? "") as string;
  if (fn?.trim()) return fn.trim().replace(/\s+/g, "").toUpperCase();
  // Fall back to title scan
  const m = /\b([A-Z]{2}\d{3,4})\b/.exec(reservation.title?.toUpperCase() ?? "");
  return m?.[1] ?? null;
}

function toEvent(reservation: UpdatableReservation, flight: AeroFlight): TravelUpdateEvent {
  const dep = flight.departure;
  const depDelay = typeof dep?.delay === "number" ? Math.max(0, Math.round(dep.delay)) : null;
  const { kind } = resolveStatus(flight.status);
  const effectiveDelay = kind === "delay" ? (depDelay ?? 30) : (depDelay ?? 0);

  const gateNote = dep?.gate ? ` · Gate ${dep.gate}${dep.terminal ? `, Terminal ${dep.terminal}` : ""}` : "";
  const deptIata = dep?.airport?.iata ?? "";
  const arrIata = flight.arrival?.airport?.iata ?? "";
  const route = deptIata && arrIata ? `${deptIata}→${arrIata}` : "";

  if (kind === "cancellation") {
    return {
      provider: "flight-status-provider",
      kind: "cancellation",
      severity: "critical",
      summary: `${reservation.title} cancelled`,
      detail: `AeroDataBox reports flight cancelled. ${route}${gateNote}. Contact airline immediately.`,
      target: { reservationType: "flight", confirmationCode: reservation.confirmationCode, titleHint: reservation.title },
    };
  }

  if (kind === "delay" || effectiveDelay >= 15) {
    const severity = effectiveDelay >= 45 ? "critical" : "warning";
    return {
      provider: "flight-status-provider",
      kind: "delay",
      severity,
      summary: `${reservation.title} delayed ${effectiveDelay} min`,
      detail: `AeroDataBox reports ${effectiveDelay}-minute delay. ${route}${gateNote}.`,
      target: { reservationType: "flight", confirmationCode: reservation.confirmationCode, titleHint: reservation.title },
      delayMinutes: effectiveDelay,
    };
  }

  return {
    provider: "flight-status-provider",
    kind: "on-time",
    severity: "info",
    summary: `${reservation.title} on time${dep?.gate ? ` · Gate ${dep.gate}` : ""}`,
    detail: `AeroDataBox: on time. ${route}${gateNote}.`,
    target: { reservationType: "flight", confirmationCode: reservation.confirmationCode, titleHint: reservation.title },
    ...(dep?.gate ? { updatedLocation: [dep.terminal ? `Terminal ${dep.terminal}` : "", `Gate ${dep.gate}`].filter(Boolean).join(" · ") } : {}),
  };
}

/* ─── Mock fallback ──────────────────────────────────────────── */
function mockUpdate(reservation: UpdatableReservation): TravelUpdateEvent {
  return {
    provider: "flight-status-provider",
    kind: "on-time",
    severity: "info",
    summary: `${reservation.title} — status unavailable (no API key)`,
    detail: "Set AERODATABOX_API_KEY in Vercel environment variables to enable live flight alerts.",
    target: { reservationType: "flight", confirmationCode: reservation.confirmationCode, titleHint: reservation.title },
  };
}

/* ─── Provider factory ───────────────────────────────────────── */
export function createFlightStatusProviderFromEnv(): TravelUpdateProvider {
  const config = resolveFlightProviderConfig();

  return {
    name: "flight-status-provider",
    async fetchUpdates(args) {
      const flights = args.reservations.filter(r => r.type === "flight");
      if (flights.length === 0) return [];

      if (!config) {
        // Return mock "no key" updates so the provider doesn't silently fail
        return flights.map(mockUpdate);
      }

      const updates: TravelUpdateEvent[] = [];

      for (const reservation of flights) {
        const flightNum = extractFlightNumber(reservation);
        if (!flightNum) continue;

        const date = flightDate(reservation);
        const url = `${AERODATABOX_BASE}/flights/number/${encodeURIComponent(flightNum)}/${encodeURIComponent(date)}`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
          const response = await fetch(url, {
            headers: { "x-api-market-key": config.apiKey, "Accept": "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (response.status === 204 || response.status === 404) continue; // no data, skip
          if (!response.ok) throw new Error(`AeroDataBox ${response.status}`);

          const raw = await response.json();
          const arr = Array.isArray(raw) ? raw : [raw];
          const parsed = z.array(AeroFlightSchema).safeParse(arr);
          if (!parsed.success || parsed.data.length === 0) continue;

          // Pick the most relevant flight (closest departure)
          const nowMs = Date.now();
          const best = parsed.data
            .filter(f => f.departure?.scheduledTimeLocal)
            .sort((a, b) => {
              const aMs = Date.parse(a.departure?.scheduledTimeLocal ?? "") || 0;
              const bMs = Date.parse(b.departure?.scheduledTimeLocal ?? "") || 0;
              return Math.abs(aMs - nowMs) - Math.abs(bMs - nowMs);
            })[0] ?? parsed.data[0];

          if (best) updates.push(toEvent(reservation, best));
        } catch (err) {
          // Log but don't crash the whole provider run
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[flightStatusProvider] ${flightNum} lookup failed:`, err instanceof Error ? err.message : err);
          }
        }
      }

      return updates;
    },
  };
}
