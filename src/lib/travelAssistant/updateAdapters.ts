export type UpdatableReservationType = "flight" | "train" | "ride" | "hotel" | "dinner";
export type TravelUpdateMode = "mock" | "off";
export type TravelUpdateKind =
  | "delay"
  | "cancellation"
  | "gate-change"
  | "platform-change"
  | "pickup-change"
  | "on-time";
export type TravelUpdateSeverity = "info" | "warning" | "critical";

export interface UpdatableReservation {
  id: string;
  type: UpdatableReservationType;
  title: string;
  confirmationCode: string;
  localTime: string;
  location: string;
  timezone: string;
}

export interface TravelUpdateEvent {
  provider: string;
  kind: TravelUpdateKind;
  severity: TravelUpdateSeverity;
  summary: string;
  detail: string;
  target: {
    reservationType: UpdatableReservationType;
    confirmationCode?: string;
    titleHint?: string;
  };
  delayMinutes?: number;
  updatedLocation?: string;
}

export interface TravelUpdateProvider {
  name: string;
  fetchUpdates(args: {
    reservations: readonly UpdatableReservation[];
    nowIso: string;
  }): Promise<TravelUpdateEvent[]>;
}

export interface TravelUpdateCheckOptions {
  providerOverride?: TravelUpdateProvider;
  maxAttempts?: number;
  baseDelayMs?: number;
  cooldownMs?: number;
  failureThreshold?: number;
  nowMs?: number;
  disableDelay?: boolean;
}

export interface TravelUpdateCheckResult {
  mode: TravelUpdateMode;
  provider: string | null;
  updates: TravelUpdateEvent[];
  attempts: number;
  circuitOpen: boolean;
  error: string | null;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 300;
const DEFAULT_COOLDOWN_MS = 60_000;
const DEFAULT_FAILURE_THRESHOLD = 2;
const circuitStateByProvider = new Map<string, { consecutiveFailures: number; openUntilMs: number }>();

function parseDateInput(value: string): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function deterministicHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildMockUpdates(
  reservation: UpdatableReservation,
  minutesUntil: number,
  hashSeed: number,
): TravelUpdateEvent[] {
  if (!["flight", "train", "ride"].includes(reservation.type)) {
    return [];
  }
  if (minutesUntil < -120) {
    return [];
  }

  if (reservation.type === "flight") {
    if (hashSeed % 41 === 0 && minutesUntil < 210 && minutesUntil > 40) {
      return [
        {
          provider: "mock-flight-ops",
          kind: "cancellation",
          severity: "critical",
          summary: `${reservation.title} cancelled by carrier`,
          detail: "Auto-rebooking required. Open recovery mode and contact airline desk.",
          target: {
            reservationType: "flight",
            confirmationCode: reservation.confirmationCode,
            titleHint: reservation.title,
          },
        },
      ];
    }
    if (minutesUntil < 210 && minutesUntil > 55) {
      const delayMinutes = 20 + (hashSeed % 36);
      return [
        {
          provider: "mock-flight-ops",
          kind: "delay",
          severity: delayMinutes >= 35 ? "critical" : "warning",
          summary: `${reservation.title} delayed ${delayMinutes} minutes`,
          detail: "Departure estimate shifted by carrier operations update.",
          target: {
            reservationType: "flight",
            confirmationCode: reservation.confirmationCode,
            titleHint: reservation.title,
          },
          delayMinutes,
        },
      ];
    }
    if (minutesUntil <= 55 && minutesUntil >= -10) {
      const gate = 8 + (hashSeed % 14);
      return [
        {
          provider: "mock-flight-ops",
          kind: "gate-change",
          severity: "warning",
          summary: `${reservation.title} gate moved to A${gate}`,
          detail: "Boarding gate changed. Notify all assigned members.",
          target: {
            reservationType: "flight",
            confirmationCode: reservation.confirmationCode,
            titleHint: reservation.title,
          },
          updatedLocation: `Gate A${gate}`,
        },
      ];
    }
    return [];
  }

  if (reservation.type === "train") {
    if (minutesUntil < 180 && minutesUntil > 35) {
      const delayMinutes = 8 + (hashSeed % 17);
      return [
        {
          provider: "mock-rail-ops",
          kind: "delay",
          severity: delayMinutes >= 18 ? "warning" : "info",
          summary: `${reservation.title} delayed ${delayMinutes} minutes`,
          detail: "Rail operations posted a revised departure estimate.",
          target: {
            reservationType: "train",
            confirmationCode: reservation.confirmationCode,
            titleHint: reservation.title,
          },
          delayMinutes,
        },
      ];
    }
    if (minutesUntil <= 35 && minutesUntil >= -15) {
      const platform = 2 + (hashSeed % 9);
      return [
        {
          provider: "mock-rail-ops",
          kind: "platform-change",
          severity: "warning",
          summary: `${reservation.title} moved to platform ${platform}`,
          detail: "Platform update issued by station control.",
          target: {
            reservationType: "train",
            confirmationCode: reservation.confirmationCode,
            titleHint: reservation.title,
          },
          updatedLocation: `Platform ${platform}`,
        },
      ];
    }
    return [];
  }

  if (minutesUntil < 75 && minutesUntil > -20) {
    return [
      {
        provider: "mock-mobility-ops",
        kind: "pickup-change",
        severity: "warning",
        summary: `${reservation.title} pickup zone adjusted`,
        detail: "Driver assigned a new pickup zone due to traffic restrictions.",
        target: {
          reservationType: "ride",
          confirmationCode: reservation.confirmationCode,
          titleHint: reservation.title,
        },
        updatedLocation: `${reservation.location} • Zone ${String.fromCharCode(65 + (hashSeed % 5))}`,
      },
    ];
  }
  return [];
}

function createMockTravelUpdateProvider(): TravelUpdateProvider {
  return {
    name: "mock-transport-adapter",
    async fetchUpdates(args) {
      const nowMs = Date.parse(args.nowIso);
      const updates: TravelUpdateEvent[] = [];
      args.reservations.forEach((reservation) => {
        const reservationMs = parseDateInput(reservation.localTime);
        if (Number.isNaN(reservationMs)) return;
        const minutesUntil = Math.round((reservationMs - nowMs) / 60000);
        const hashSeed = deterministicHash(
          `${reservation.id}:${reservation.confirmationCode}:${reservation.localTime}:${args.nowIso.slice(0, 13)}`,
        );
        const candidateUpdates = buildMockUpdates(reservation, minutesUntil, hashSeed);
        updates.push(...candidateUpdates);
      });

      // Simulate network latency for realistic UI testing.
      await new Promise((resolve) => setTimeout(resolve, 280));
      return updates;
    },
  };
}

function resolveProvider(mode: TravelUpdateMode): TravelUpdateProvider | null {
  if (mode === "off") return null;
  return createMockTravelUpdateProvider();
}

function dedupeUpdates(updates: TravelUpdateEvent[]): TravelUpdateEvent[] {
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
  const provider = options?.providerOverride ?? resolveProvider(mode);
  if (!provider) {
    return { mode, provider: null, updates: [], attempts: 0, circuitOpen: false, error: null };
  }

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
      mode,
      provider: provider.name,
      updates: [],
      attempts: 0,
      circuitOpen: true,
      error: `Circuit open until ${new Date(circuitState.openUntilMs).toISOString()}`,
    };
  }

  let attempts = 0;
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const updates = await provider.fetchUpdates({ reservations, nowIso });
      circuitStateByProvider.set(provider.name, { consecutiveFailures: 0, openUntilMs: 0 });
      return {
        mode,
        provider: provider.name,
        updates: dedupeUpdates(updates),
        attempts,
        circuitOpen: false,
        error: null,
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
    mode,
    provider: provider.name,
    updates: [],
    attempts,
    circuitOpen: openUntilMs > nowMs,
    error: lastError ?? "Provider update check failed",
  };
}
