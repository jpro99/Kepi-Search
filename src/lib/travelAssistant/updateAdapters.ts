import "server-only";
import { createFlightStatusProviderFromEnv } from "@/lib/travelAssistant/providers/flightStatusProvider";
import { createMockTravelUpdateProvider } from "@/lib/travelAssistant/providers/mockTransportProvider";
import { createRailStatusProviderFromEnv } from "@/lib/travelAssistant/providers/railStatusProvider";
import type {
  TravelProviderReport,
  TravelUpdateCheckResult,
  TravelUpdateEvent,
  TravelUpdateMode,
  TravelUpdateProvider,
  UpdatableReservation,
} from "@/lib/travelAssistant/travelUpdateTypes";

export type {
  TravelProviderReport,
  TravelUpdateCheckResult,
  TravelUpdateEvent,
  TravelUpdateMode,
  TravelUpdateProvider,
  UpdatableReservation,
};

export interface TravelUpdateCheckOptions {
  providerOverride?: TravelUpdateProvider | null;
  providersOverride?: readonly TravelUpdateProvider[];
  includeMockFallback?: boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  cooldownMs?: number;
  failureThreshold?: number;
  nowMs?: number;
  disableDelay?: boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 300;
const DEFAULT_COOLDOWN_MS = 60_000;
const DEFAULT_FAILURE_THRESHOLD = 2;
const circuitStateByProvider = new Map<string, { consecutiveFailures: number; openUntilMs: number }>();

function resolveProviders(
  mode: TravelUpdateMode,
  options?: TravelUpdateCheckOptions,
): readonly TravelUpdateProvider[] {
  if (options?.providersOverride && options.providersOverride.length > 0) {
    return options.providersOverride;
  }
  if (options?.providerOverride) {
    return [options.providerOverride];
  }
  if (mode === "off") {
    return [];
  }
  if (mode === "mock") {
    return [createMockTravelUpdateProvider()];
  }

  const providers: TravelUpdateProvider[] = [];
  const flightProvider = createFlightStatusProviderFromEnv();
  const railProvider = createRailStatusProviderFromEnv();
  if (flightProvider) providers.push(flightProvider);
  if (railProvider) providers.push(railProvider);

  const includeMockFallback = options?.includeMockFallback ?? true;
  if (providers.length === 0 && includeMockFallback) {
    providers.push(createMockTravelUpdateProvider());
  }
  return providers;
}

function dedupeUpdates(updates: readonly TravelUpdateEvent[]): TravelUpdateEvent[] {
  const seen = new Set<string>();
  const unique: TravelUpdateEvent[] = [];
  updates.forEach((update) => {
    const key = [
      update.provider,
      update.kind,
      update.target.reservationType,
      update.target.confirmationCode ?? "",
      update.target.titleHint ?? "",
      update.delayMinutes ?? "",
      update.updatedLocation ?? "",
      update.summary,
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(update);
  });
  return unique;
}

function jitteredDelay(baseDelayMs: number, attempt: number): number {
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * Math.max(25, baseDelayMs / 2));
  return exponential + jitter;
}

async function waitMs(value: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, value));
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown provider failure";
}

export function resetTravelUpdateCircuitState(): void {
  circuitStateByProvider.clear();
}

async function runProviderCheckWithResilience({
  provider,
  reservations,
  nowIso,
  options,
}: {
  provider: TravelUpdateProvider;
  reservations: readonly UpdatableReservation[];
  nowIso: string;
  options?: TravelUpdateCheckOptions;
}): Promise<{ updates: TravelUpdateEvent[]; report: TravelProviderReport }> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = Math.max(50, options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS);
  const cooldownMs = Math.max(5_000, options?.cooldownMs ?? DEFAULT_COOLDOWN_MS);
  const failureThreshold = Math.max(1, options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD);
  const nowMs = options?.nowMs ?? Date.now();

  const circuitState = circuitStateByProvider.get(provider.name) ?? {
    consecutiveFailures: 0,
    openUntilMs: 0,
  };

  if (circuitState.openUntilMs > nowMs) {
    return {
      updates: [],
      report: {
        provider: provider.name,
        attempts: 0,
        updateCount: 0,
        circuitOpen: true,
        error: `Circuit open until ${new Date(circuitState.openUntilMs).toISOString()}`,
      },
    };
  }

  let attempts = 0;
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const updates = dedupeUpdates(await provider.fetchUpdates({ reservations, nowIso }));
      circuitStateByProvider.set(provider.name, { consecutiveFailures: 0, openUntilMs: 0 });
      return {
        updates,
        report: {
          provider: provider.name,
          attempts,
          updateCount: updates.length,
          circuitOpen: false,
          error: null,
        },
      };
    } catch (error) {
      lastError = normalizeError(error);
      if (attempt < maxAttempts && !options?.disableDelay) {
        await waitMs(jitteredDelay(baseDelayMs, attempt));
      }
    }
  }

  const nextConsecutiveFailures = circuitState.consecutiveFailures + 1;
  const openUntilMs =
    nextConsecutiveFailures >= failureThreshold ? nowMs + cooldownMs : circuitState.openUntilMs;
  circuitStateByProvider.set(provider.name, {
    consecutiveFailures: nextConsecutiveFailures,
    openUntilMs,
  });

  return {
    updates: [],
    report: {
      provider: provider.name,
      attempts,
      updateCount: 0,
      circuitOpen: openUntilMs > nowMs,
      error: lastError ?? "Provider update check failed",
    },
  };
}

export async function runTravelUpdateCheck({
  mode,
  reservations,
  nowIso,
  options,
}: {
  mode: TravelUpdateMode;
  reservations: readonly UpdatableReservation[];
  nowIso: string;
  options?: TravelUpdateCheckOptions;
}): Promise<TravelUpdateCheckResult> {
  const providers = resolveProviders(mode, options);
  if (providers.length === 0) {
    return {
      mode,
      provider: null,
      updates: [],
      attempts: 0,
      circuitOpen: false,
      error: null,
      providerReports: [],
    };
  }

  const providerReports: TravelProviderReport[] = [];
  const aggregateUpdates: TravelUpdateEvent[] = [];

  for (const provider of providers) {
    const providerResult = await runProviderCheckWithResilience({
      provider,
      reservations,
      nowIso,
      options,
    });
    providerReports.push(providerResult.report);
    aggregateUpdates.push(...providerResult.updates);
  }

  const firstError = providerReports.find((report) => report.error)?.error ?? null;
  return {
    mode,
    provider: providers.map((provider) => provider.name).join(", "),
    updates: dedupeUpdates(aggregateUpdates),
    attempts: providerReports.reduce((sum, report) => sum + report.attempts, 0),
    circuitOpen: providerReports.some((report) => report.circuitOpen),
    error: firstError,
    providerReports,
  };
}
