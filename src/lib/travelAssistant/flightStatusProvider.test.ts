import assert from "node:assert/strict";
import test from "node:test";
import { createFlightStatusProviderFromEnv } from "@/lib/travelAssistant/providers/flightStatusProvider";
import type { UpdatableReservation } from "@/lib/travelAssistant/travelUpdateTypes";

const SAMPLE_FLIGHT_RESERVATION: UpdatableReservation = {
  id: "flight-1",
  type: "flight",
  title: "Alaska Airlines AS271",
  confirmationCode: "MFKRJF",
  localTime: "2026-05-29 13:41",
  location: "HNL",
  timezone: "Pacific/Honolulu",
};

test("AeroDataBox delayed flight maps to internal delay status", async () => {
  const previousKey = process.env.AERODATABOX_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.AERODATABOX_API_KEY = "aerodatabox-key";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        {
          number: "AS271",
          status: "Delayed",
          airline: { name: "Alaska Airlines" },
          departure: {
            airport: { iata: "HNL" },
            scheduledTimeLocal: "2026-05-29 13:41",
            actualTimeLocal: "2026-05-29 14:11",
            delay: 30,
            gate: "G17",
            terminal: "2",
          },
          arrival: {
            airport: { iata: "ONT" },
            scheduledTimeLocal: "2026-05-29 22:00",
          },
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    const provider = createFlightStatusProviderFromEnv();
    const updates = await provider.fetchUpdates({
      reservations: [SAMPLE_FLIGHT_RESERVATION],
      nowIso: "2026-05-29T13:00:00.000Z",
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.kind, "delay");
    assert.equal(updates[0]?.provider, "flight-status-provider");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.AERODATABOX_API_KEY = previousKey;
  }
});

test("AeroDataBox cancelled flight maps to cancellation update", async () => {
  const previousKey = process.env.AERODATABOX_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.AERODATABOX_API_KEY = "aerodatabox-key";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        {
          number: "AS271",
          status: "Cancelled",
          airline: { name: "Alaska Airlines" },
          departure: {
            airport: { iata: "HNL" },
            scheduledTimeLocal: "2026-05-29 13:41",
          },
          arrival: { airport: { iata: "ONT" } },
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    const provider = createFlightStatusProviderFromEnv();
    const updates = await provider.fetchUpdates({
      reservations: [SAMPLE_FLIGHT_RESERVATION],
      nowIso: "2026-05-29T13:00:00.000Z",
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.kind, "cancellation");
    assert.equal(updates[0]?.severity, "critical");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.AERODATABOX_API_KEY = previousKey;
  }
});

test("missing AERODATABOX_API_KEY returns mock unavailable updates", async () => {
  const previousKey = process.env.AERODATABOX_API_KEY;
  delete process.env.AERODATABOX_API_KEY;
  try {
    const provider = createFlightStatusProviderFromEnv();
    const updates = await provider.fetchUpdates({
      reservations: [SAMPLE_FLIGHT_RESERVATION],
      nowIso: "2026-05-29T13:00:00.000Z",
    });
    assert.ok(updates.length >= 1);
    assert.ok(updates[0]?.provider === "flight-status-provider");
    assert.ok(updates[0]?.kind === "on-time");
  } finally {
    process.env.AERODATABOX_API_KEY = previousKey;
  }
});
