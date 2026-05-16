import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  TravelUpdateMode,
  UpdatableReservation,
} from "@/lib/travelAssistant/travelUpdateTypes";

interface RuntimeStateData {
  version: 1;
  mode: TravelUpdateMode;
  updatedAt: string;
  reservations: UpdatableReservation[];
}

const DEFAULT_RUNTIME_STATE_PATH = "/tmp/kepi-travel-runtime-state.json";
let writeQueue: Promise<void> = Promise.resolve();

function resolveRuntimeStatePath(customPath?: string): string {
  return customPath ?? process.env.TRAVEL_UPDATE_RUNTIME_STATE_PATH ?? DEFAULT_RUNTIME_STATE_PATH;
}

function createEmptyState(): RuntimeStateData {
  return {
    version: 1,
    mode: "auto",
    updatedAt: new Date(0).toISOString(),
    reservations: [],
  };
}

async function loadState(filePath: string): Promise<RuntimeStateData> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RuntimeStateData>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.reservations) ||
      typeof parsed.mode !== "string" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return createEmptyState();
    }
    return {
      version: 1,
      mode: parsed.mode,
      updatedAt: parsed.updatedAt,
      reservations: parsed.reservations,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyState();
    }
    throw error;
  }
}

async function saveState(filePath: string, data: RuntimeStateData): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function persistTravelRuntimeState({
  reservations,
  mode,
  updatedAt,
  storagePath,
}: {
  reservations: readonly UpdatableReservation[];
  mode: TravelUpdateMode;
  updatedAt?: string;
  storagePath?: string;
}): Promise<void> {
  const filePath = resolveRuntimeStatePath(storagePath);
  const effectiveUpdatedAt = updatedAt ?? new Date().toISOString();

  const run = async (): Promise<void> => {
    const nextState: RuntimeStateData = {
      version: 1,
      mode,
      updatedAt: effectiveUpdatedAt,
      reservations: [...reservations],
    };
    await saveState(filePath, nextState);
  };

  const task = writeQueue.then(run, run);
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export async function readTravelRuntimeState(storagePath?: string): Promise<{
  mode: TravelUpdateMode;
  updatedAt: string;
  reservations: UpdatableReservation[];
}> {
  const filePath = resolveRuntimeStatePath(storagePath);
  const state = await loadState(filePath);
  return {
    mode: state.mode,
    updatedAt: state.updatedAt,
    reservations: state.reservations,
  };
}
