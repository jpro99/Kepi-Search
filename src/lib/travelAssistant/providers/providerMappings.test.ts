import assert from "node:assert/strict";
import test from "node:test";
import { createFlightStatusProviderFromEnv } from "@/lib/travelAssistant/providers/flightStatusProvider";
import { createRailStatusProviderFromEnv } from "@/lib/travelAssistant/railStatusProvider";
import { createRideStatusProviderFromEnv } from "@/lib/travelAssistant/rideStatusProvider";
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

test("flight provider falls back to mock updates when key is missing", async () => {
  const previousKey = process.env.AERODATABOX_API_KEY;
  delete process.env.AERODATABOX_API_KEY;
  try {
    const provider = createFlightStatusProviderFromEnv();
    const updates = await provider.fetchUpdates({
      reservations: [SAMPLE_FLIGHT_RESERVATION],
      nowIso: "2026-06-22T06:30:00.000Z",
    });
    assert.ok(updates.length >= 1);
    // When no key is set, provider returns "status unavailable" updates
    assert.ok(updates[0]?.provider === "flight-status-provider");
    assert.ok(updates[0]?.summary?.includes("unavailable") || updates[0]?.kind === "on-time");
  } finally {
    process.env.AERODATABOX_API_KEY = previousKey;
  }
});

test("flight provider instance is created", () => {
  const provider = createFlightStatusProviderFromEnv();
  assert.equal(provider.name, "flight-status-provider");
});

test("rail provider instance is created", () => {
  const provider = createRailStatusProviderFromEnv();
  assert.equal(provider.name, "rail-status-provider");
});

test("ride provider instance is created", () => {
  const provider = createRideStatusProviderFromEnv();
  assert.equal(provider.name, "ride-status-provider");
});
