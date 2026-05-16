import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  persistTravelRuntimeState,
  readTravelRuntimeState,
} from "@/lib/travelAssistant/updateRuntimeStateStore";
import type { UpdatableReservation } from "@/lib/travelAssistant/travelUpdateTypes";

const SAMPLE_RESERVATIONS: UpdatableReservation[] = [
  {
    id: "flight-1",
    type: "flight",
    title: "DL 407 JFK -> SFO",
    confirmationCode: "Y8Q4D2",
    localTime: "2026-06-22 08:15",
    location: "Terminal 4, JFK",
    timezone: "America/New_York",
  },
];

test("persists and reads runtime state snapshot", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "travel-runtime-state-test-"));
  const statePath = join(tempDir, "runtime-state.json");
  try {
    await persistTravelRuntimeState({
      reservations: SAMPLE_RESERVATIONS,
      mode: "auto",
      updatedAt: "2026-06-21T10:00:00.000Z",
      storagePath: statePath,
    });
    const loaded = await readTravelRuntimeState(statePath);
    assert.equal(loaded.mode, "auto");
    assert.equal(loaded.updatedAt, "2026-06-21T10:00:00.000Z");
    assert.equal(loaded.reservations.length, 1);
    assert.equal(loaded.reservations[0]?.confirmationCode, "Y8Q4D2");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("returns empty defaults when runtime state file missing", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "travel-runtime-state-test-"));
  const statePath = join(tempDir, "missing-runtime-state.json");
  try {
    const loaded = await readTravelRuntimeState(statePath);
    assert.equal(loaded.mode, "auto");
    assert.equal(loaded.reservations.length, 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
