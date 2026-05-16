import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  TravelAuditReadSnapshot,
  TravelAuditTrailEntry,
  TravelUpdateAuditSummary,
  TravelUpdateCheckResult,
  TravelUpdateEvent,
} from "@/lib/travelAssistant/travelUpdateTypes";

interface StoredUpdateRecord {
  idempotencyKey: string;
  provider: string;
  kind: TravelUpdateEvent["kind"];
  summary: string;
  targetConfirmationCode: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
}

interface UpdateAuditStoreData {
  version: 1;
  eventsByKey: Record<string, StoredUpdateRecord>;
  auditTrail: TravelAuditTrailEntry[];
}

const DEFAULT_AUDIT_PATH = "/tmp/kepi-travel-update-audit.json";
const MAX_AUDIT_TRAIL_ENTRIES = 1000;
let writeQueue: Promise<void> = Promise.resolve();

function resolveAuditPath(customPath?: string): string {
  return customPath ?? process.env.TRAVEL_UPDATE_AUDIT_PATH ?? DEFAULT_AUDIT_PATH;
}

function createEmptyStore(): UpdateAuditStoreData {
  return {
    version: 1,
    eventsByKey: {},
    auditTrail: [],
  };
}

async function loadStore(filePath: string): Promise<UpdateAuditStoreData> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<UpdateAuditStoreData>;
    if (parsed.version !== 1 || !parsed.eventsByKey || !Array.isArray(parsed.auditTrail)) {
      return createEmptyStore();
    }
    const normalizedAuditTrail = parsed.auditTrail.map((entry) => {
      const raw = entry as Partial<TravelAuditTrailEntry>;
      return {
        source: raw.source === "background" ? "background" : "interactive",
        requestId: typeof raw.requestId === "string" ? raw.requestId : randomUUID(),
        checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : new Date(0).toISOString(),
        mode: raw.mode ?? "auto",
        provider: typeof raw.provider === "string" || raw.provider === null ? raw.provider : null,
        incomingUpdates: typeof raw.incomingUpdates === "number" ? raw.incomingUpdates : 0,
        newUpdates: typeof raw.newUpdates === "number" ? raw.newUpdates : 0,
        duplicateUpdates: typeof raw.duplicateUpdates === "number" ? raw.duplicateUpdates : 0,
        providerError: typeof raw.providerError === "string" || raw.providerError === null ? raw.providerError : null,
        circuitOpen: typeof raw.circuitOpen === "boolean" ? raw.circuitOpen : false,
        conflictAccepted: typeof raw.conflictAccepted === "number" ? raw.conflictAccepted : 0,
        conflictSuppressed: typeof raw.conflictSuppressed === "number" ? raw.conflictSuppressed : 0,
        providerReports: Array.isArray(raw.providerReports) ? raw.providerReports : [],
      } satisfies TravelAuditTrailEntry;
    });
    return {
      version: 1,
      eventsByKey: parsed.eventsByKey,
      auditTrail: normalizedAuditTrail,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyStore();
    }
    throw error;
  }
}

async function saveStore(filePath: string, data: UpdateAuditStoreData): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function buildUpdateIdempotencyKey(update: TravelUpdateEvent): string {
  return [
    update.provider,
    update.kind,
    update.target.reservationType,
    update.target.confirmationCode ?? "",
    update.target.titleHint ?? "",
    update.delayMinutes ?? "",
    update.updatedLocation ?? "",
    update.summary,
  ].join("|");
}

export async function persistTravelUpdateAudit({
  result,
  checkedAt,
  storagePath,
  source = "interactive",
}: {
  result: TravelUpdateCheckResult;
  checkedAt?: string;
  storagePath?: string;
  source?: "interactive" | "background";
}): Promise<{
  freshUpdates: TravelUpdateEvent[];
  duplicateUpdates: number;
  summary: TravelUpdateAuditSummary;
}> {
  const effectiveCheckedAt = checkedAt ?? new Date().toISOString();
  const requestId = randomUUID();
  const filePath = resolveAuditPath(storagePath);

  const run = async (): Promise<{
    freshUpdates: TravelUpdateEvent[];
    duplicateUpdates: number;
    summary: TravelUpdateAuditSummary;
  }> => {
    const store = await loadStore(filePath);
    const freshUpdates: TravelUpdateEvent[] = [];
    let duplicateUpdates = 0;

    result.updates.forEach((update) => {
      const key = buildUpdateIdempotencyKey(update);
      const existing = store.eventsByKey[key];
      if (existing) {
        duplicateUpdates += 1;
        existing.lastSeenAt = effectiveCheckedAt;
        existing.seenCount += 1;
        return;
      }
      store.eventsByKey[key] = {
        idempotencyKey: key,
        provider: update.provider,
        kind: update.kind,
        summary: update.summary,
        targetConfirmationCode: update.target.confirmationCode ?? null,
        firstSeenAt: effectiveCheckedAt,
        lastSeenAt: effectiveCheckedAt,
        seenCount: 1,
      };
      freshUpdates.push(update);
    });

    const summary: TravelUpdateAuditSummary = {
      requestId,
      checkedAt: effectiveCheckedAt,
      mode: result.mode,
      provider: result.provider,
      incomingUpdates: result.updates.length,
      newUpdates: freshUpdates.length,
      duplicateUpdates,
      totalKnownEvents: Object.keys(store.eventsByKey).length,
    };

    store.auditTrail.unshift({
      source,
      requestId,
      checkedAt: effectiveCheckedAt,
      mode: result.mode,
      provider: result.provider,
      incomingUpdates: result.updates.length,
      newUpdates: freshUpdates.length,
      duplicateUpdates,
      providerError: result.error,
      circuitOpen: result.circuitOpen,
      conflictAccepted: result.conflictResolution?.acceptedUpdates ?? result.updates.length,
      conflictSuppressed: result.conflictResolution?.suppressedUpdates ?? 0,
      providerReports: result.providerReports,
    });
    if (store.auditTrail.length > MAX_AUDIT_TRAIL_ENTRIES) {
      store.auditTrail.length = MAX_AUDIT_TRAIL_ENTRIES;
    }

    await saveStore(filePath, store);
    return { freshUpdates, duplicateUpdates, summary };
  };

  const task = writeQueue.then(run, run);
  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export async function readTravelUpdateAuditSnapshot({
  storagePath,
  limit = 20,
}: {
  storagePath?: string;
  limit?: number;
} = {}): Promise<TravelAuditReadSnapshot> {
  const filePath = resolveAuditPath(storagePath);
  const store = await loadStore(filePath);
  return {
    totalKnownEvents: Object.keys(store.eventsByKey).length,
    recentAuditTrail: store.auditTrail.slice(0, Math.max(1, limit)),
  };
}
