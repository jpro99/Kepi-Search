import assert from "node:assert/strict";
import test from "node:test";
import {
  resetTravelUpdateCircuitState,
  runTravelUpdateCheck,
  type TravelUpdateProvider,
  type UpdatableReservation,
} from "./updateAdapters";

const SAMPLE_RESERVATIONS: UpdatableReservation[] = [
  {
    id: "flight-1",
    type: "flight",
    title: "DL 407 JFK -> SFO",
    confirmationCode: "Y8Q4D2",
    localTime: "2026-06-22 08:15",
    location: "JFK Terminal 4",
    timezone: "America/New_York",
  },
];

test("mode off returns no provider updates", async () => {
  resetTravelUpdateCircuitState();
  const result = await runTravelUpdateCheck({
    mode: "off",
    reservations: SAMPLE_RESERVATIONS,
    nowIso: "2026-06-21T15:00:00.000Z",
  });
  assert.equal(result.provider, null);
  assert.equal(result.updates.length, 0);
  assert.equal(result.attempts, 0);
  assert.equal(result.error, null);
  assert.equal(result.circuitOpen, false);
});

test("deduplicates repeated provider events", async () => {
  resetTravelUpdateCircuitState();
  const duplicateProvider: TravelUpdateProvider = {
    name: "duplicate-provider",
    async fetchUpdates() {
      return [
        {
          provider: "duplicate-provider",
          kind: "delay",
          severity: "warning",
          summary: "DL 407 delayed 20 minutes",
          detail: "Carrier posted an updated departure estimate.",
          target: { reservationType: "flight", confirmationCode: "Y8Q4D2", titleHint: "DL 407 JFK -> SFO" },
          delayMinutes: 20,
        },
        {
          provider: "duplicate-provider",
          kind: "delay",
          severity: "warning",
          summary: "DL 407 delayed 20 minutes",
          detail: "Carrier posted an updated departure estimate.",
          target: { reservationType: "flight", confirmationCode: "Y8Q4D2", titleHint: "DL 407 JFK -> SFO" },
          delayMinutes: 20,
        },
      ];
    },
  };

  const result = await runTravelUpdateCheck({
    mode: "mock",
    reservations: SAMPLE_RESERVATIONS,
    nowIso: "2026-06-21T15:00:00.000Z",
    options: { providerOverride: duplicateProvider, disableDelay: true },
  });
  assert.equal(result.attempts, 1);
  assert.equal(result.error, null);
  assert.equal(result.updates.length, 1);
});

test("retries transient provider failures", async () => {
  resetTravelUpdateCircuitState();
  let attempts = 0;
  const flakyProvider: TravelUpdateProvider = {
    name: "flaky-provider",
    async fetchUpdates() {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("Transient upstream timeout");
      }
      return [
        {
          provider: "flaky-provider",
          kind: "delay",
          severity: "warning",
          summary: "DL 407 delayed 12 minutes",
          detail: "Retry path recovered and fetched update.",
          target: { reservationType: "flight", confirmationCode: "Y8Q4D2" },
          delayMinutes: 12,
        },
      ];
    },
  };

  const result = await runTravelUpdateCheck({
    mode: "mock",
    reservations: SAMPLE_RESERVATIONS,
    nowIso: "2026-06-21T15:00:00.000Z",
    options: {
      providerOverride: flakyProvider,
      maxAttempts: 3,
      disableDelay: true,
    },
  });

  assert.equal(result.error, null);
  assert.equal(result.attempts, 2);
  assert.equal(result.circuitOpen, false);
  assert.equal(result.updates.length, 1);
});

test("opens circuit after repeated hard failures", async () => {
  resetTravelUpdateCircuitState();
  const failingProvider: TravelUpdateProvider = {
    name: "hard-fail-provider",
    async fetchUpdates() {
      throw new Error("Provider unavailable");
    },
  };

  const first = await runTravelUpdateCheck({
    mode: "mock",
    reservations: SAMPLE_RESERVATIONS,
    nowIso: "2026-06-21T15:00:00.000Z",
    options: {
      providerOverride: failingProvider,
      maxAttempts: 1,
      failureThreshold: 1,
      cooldownMs: 6_000,
      disableDelay: true,
      nowMs: 1_000,
    },
  });

  assert.equal(first.attempts, 1);
  assert.equal(first.circuitOpen, true);
  assert.equal(first.updates.length, 0);
  assert.match(first.error ?? "", /Provider unavailable/);

  const second = await runTravelUpdateCheck({
    mode: "mock",
    reservations: SAMPLE_RESERVATIONS,
    nowIso: "2026-06-21T15:00:00.000Z",
    options: {
      providerOverride: failingProvider,
      maxAttempts: 1,
      failureThreshold: 1,
      cooldownMs: 6_000,
      disableDelay: true,
      nowMs: 2_000,
    },
  });

  assert.equal(second.attempts, 0);
  assert.equal(second.circuitOpen, true);
  assert.equal(second.updates.length, 0);
  assert.match(second.error ?? "", /Circuit open/);
});
