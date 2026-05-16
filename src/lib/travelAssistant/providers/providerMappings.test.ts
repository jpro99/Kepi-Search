import assert from "node:assert/strict";
import test from "node:test";
import { createFlightStatusProviderFromEnv } from "@/lib/travelAssistant/providers/flightStatusProvider";
import { createRailStatusProviderFromEnv } from "@/lib/travelAssistant/providers/railStatusProvider";
import type { UpdatableReservation } from "@/lib/travelAssistant/travelUpdateTypes";

const SAMPLE_FLIGHT_RESERVATION: UpdatableReservation = {
  id: "flight-1",
  type: "flight",
  title: "DL 407 JFK -> SFO",
  confirmationCode: "y8q4d2",
  localTime: "2026-06-22 08:15",
  location: "JFK Terminal 4",
  timezone: "America/New_York",
};

const SAMPLE_RAIL_RESERVATION: UpdatableReservation = {
  id: "rail-1",
  type: "train",
  title: "Coastline Express",
  confirmationCode: "ct-7730",
  localTime: "2026-06-23 09:40",
  location: "SFO Transit Station",
  timezone: "America/Los_Angeles",
};

test("flight provider returns null when env config is missing", () => {
  const originalUrl = process.env.FLIGHT_STATUS_API_URL;
  const originalKey = process.env.FLIGHT_STATUS_API_KEY;
  delete process.env.FLIGHT_STATUS_API_URL;
  delete process.env.FLIGHT_STATUS_API_KEY;
  const provider = createFlightStatusProviderFromEnv();
  assert.equal(provider, null);
  process.env.FLIGHT_STATUS_API_URL = originalUrl;
  process.env.FLIGHT_STATUS_API_KEY = originalKey;
});

test("flight provider normalizes confirmation and clamps delay", async () => {
  const originalUrl = process.env.FLIGHT_STATUS_API_URL;
  const originalKey = process.env.FLIGHT_STATUS_API_KEY;
  const originalFetch = globalThis.fetch;

  process.env.FLIGHT_STATUS_API_URL = "https://api.example.com/flight";
  process.env.FLIGHT_STATUS_API_KEY = "flight-key";

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.confirmations, ["Y8Q4D2"]);
    return new Response(
      JSON.stringify({
        events: [
          {
            confirmationCode: "Y8Q4D2",
            status: "delayed",
            delayMinutes: 9999,
          },
          {
            confirmationCode: "Y8Q4D2",
            status: "gate_changed",
            gate: " b12 ",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const provider = createFlightStatusProviderFromEnv();
    assert.ok(provider);
    const updates = await provider.fetchUpdates({
      reservations: [SAMPLE_FLIGHT_RESERVATION],
      nowIso: "2026-06-21T15:00:00.000Z",
    });
    assert.equal(updates.length, 2);
    assert.equal(updates[0]?.delayMinutes, 720);
    assert.equal(updates[1]?.updatedLocation, "Gate B12");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FLIGHT_STATUS_API_URL = originalUrl;
    process.env.FLIGHT_STATUS_API_KEY = originalKey;
  }
});

test("rail provider skips invalid events and maps valid platform change", async () => {
  const originalUrl = process.env.RAIL_STATUS_API_URL;
  const originalKey = process.env.RAIL_STATUS_API_KEY;
  const originalFetch = globalThis.fetch;

  process.env.RAIL_STATUS_API_URL = "https://api.example.com/rail";
  process.env.RAIL_STATUS_API_KEY = "rail-key";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        events: [
          { confirmationCode: "CT-7730", status: "platform_changed", platform: " 7a " },
          { confirmationCode: "CT-7730", status: "unknown-status" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  try {
    const provider = createRailStatusProviderFromEnv();
    assert.ok(provider);
    const updates = await provider.fetchUpdates({
      reservations: [SAMPLE_RAIL_RESERVATION],
      nowIso: "2026-06-21T15:00:00.000Z",
    });
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.kind, "platform-change");
    assert.equal(updates[0]?.updatedLocation, "Platform 7A");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.RAIL_STATUS_API_URL = originalUrl;
    process.env.RAIL_STATUS_API_KEY = originalKey;
  }
});

test("flight provider throws when payload has zero valid events", async () => {
  const originalUrl = process.env.FLIGHT_STATUS_API_URL;
  const originalKey = process.env.FLIGHT_STATUS_API_KEY;
  const originalFetch = globalThis.fetch;

  process.env.FLIGHT_STATUS_API_URL = "https://api.example.com/flight";
  process.env.FLIGHT_STATUS_API_KEY = "flight-key";

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ events: [{ status: "delayed" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const provider = createFlightStatusProviderFromEnv();
    assert.ok(provider);
    await assert.rejects(
      () =>
        provider.fetchUpdates({
          reservations: [SAMPLE_FLIGHT_RESERVATION],
          nowIso: "2026-06-21T15:00:00.000Z",
        }),
      /payload invalid/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FLIGHT_STATUS_API_URL = originalUrl;
    process.env.FLIGHT_STATUS_API_KEY = originalKey;
  }
});
