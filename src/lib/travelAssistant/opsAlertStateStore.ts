import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

interface OpsAlertStateData {
  version: 1;
  lastSentByKey: Record<string, string>;
}

const DEFAULT_OPS_ALERT_STATE_PATH = "/tmp/kepi-travel-alert-state.json";
let writeQueue: Promise<void> = Promise.resolve();

function resolveAlertStatePath(customPath?: string): string {
  return customPath ?? process.env.TRAVEL_UPDATE_ALERT_STATE_PATH ?? DEFAULT_OPS_ALERT_STATE_PATH;
}

function createEmptyStore(): OpsAlertStateData {
  return {
    version: 1,
    lastSentByKey: {},
  };
}

async function loadStore(filePath: string): Promise<OpsAlertStateData> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<OpsAlertStateData>;
    if (parsed.version !== 1 || !parsed.lastSentByKey || typeof parsed.lastSentByKey !== "object") {
      return createEmptyStore();
    }
    return {
      version: 1,
      lastSentByKey: parsed.lastSentByKey,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyStore();
    }
    throw error;
  }
}

async function saveStore(filePath: string, state: OpsAlertStateData): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
}

export async function checkTravelOpsAlertEligibility({
  alertKey,
  nowIso,
  cooldownMs,
  storagePath,
}: {
  alertKey: string;
  nowIso: string;
  cooldownMs: number;
  storagePath?: string;
}): Promise<{ eligible: boolean; lastSentAt: string | null }> {
  const filePath = resolveAlertStatePath(storagePath);
  const state = await loadStore(filePath);
  const lastSentAt = state.lastSentByKey[alertKey] ?? null;
  if (!lastSentAt) {
    return { eligible: true, lastSentAt: null };
  }
  const nowMs = Date.parse(nowIso);
  const lastMs = Date.parse(lastSentAt);
  if (Number.isNaN(nowMs) || Number.isNaN(lastMs)) {
    return { eligible: true, lastSentAt };
  }
  return { eligible: nowMs - lastMs >= Math.max(1_000, cooldownMs), lastSentAt };
}

export async function markTravelOpsAlertSent({
  alertKey,
  sentAt,
  storagePath,
}: {
  alertKey: string;
  sentAt: string;
  storagePath?: string;
}): Promise<void> {
  const filePath = resolveAlertStatePath(storagePath);
  const run = async (): Promise<void> => {
    const state = await loadStore(filePath);
    state.lastSentByKey[alertKey] = sentAt;
    await saveStore(filePath, state);
  };
  const task = writeQueue.then(run, run);
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  await task;
}
