import { kvStoreGet, kvStoreSet } from "@/lib/travelAssistant/kvStore";

const EMAIL_FORWARD_SETTINGS_KEY = "email-forward/settings";
const GMAIL_PROMPT_SEEN_KEY = "onboarding:gmail-prompt:seen";
const DEFAULT_FORWARD_DOMAIN = "trips.kepitravel.com";

interface EmailForwardSettingsRecord {
  forwardAddress: string | null;
  createdAt: string | null;
  updatedAt: string;
}

export interface EmailForwardSetupStatus {
  forwardAddress: string | null;
  gmailPromptSeen: boolean;
  gmailPromptSeenAt: string | null;
}

function sanitizeSettingsRecord(raw: unknown): EmailForwardSettingsRecord {
  if (!raw || typeof raw !== "object") {
    return {
      forwardAddress: null,
      createdAt: null,
      updatedAt: new Date(0).toISOString(),
    };
  }
  const candidate = raw as Partial<EmailForwardSettingsRecord>;
  return {
    forwardAddress: typeof candidate.forwardAddress === "string" && candidate.forwardAddress.trim().length > 0
      ? candidate.forwardAddress.trim().toLowerCase()
      : null,
    createdAt: typeof candidate.createdAt === "string" && candidate.createdAt.trim().length > 0 ? candidate.createdAt : null,
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt.trim().length > 0
      ? candidate.updatedAt
      : new Date(0).toISOString(),
  };
}

function normalizedForwardDomain(): string {
  const domain = process.env.EMAIL_FORWARD_DOMAIN?.trim().toLowerCase() || DEFAULT_FORWARD_DOMAIN;
  return domain.replace(/^@/u, "");
}

function forwardLocalPartFromUserId(userId: string): string {
  const normalized = userId.toLowerCase().replace(/[^a-z0-9]/gu, "");
  const suffix = normalized.slice(-10) || "user";
  return `trip-${suffix}`;
}

export function generateForwardAddressForUser(userId: string): string {
  return `${forwardLocalPartFromUserId(userId)}@${normalizedForwardDomain()}`;
}

export async function getEmailForwardSetupStatus(userId: string): Promise<EmailForwardSetupStatus> {
  const [settingsRaw, promptSeenRaw] = await Promise.all([
    kvStoreGet<unknown>(EMAIL_FORWARD_SETTINGS_KEY, { userId }),
    kvStoreGet<string | boolean | null>(GMAIL_PROMPT_SEEN_KEY, { userId }),
  ]);
  const settings = sanitizeSettingsRecord(settingsRaw);
  const promptSeenAt =
    typeof promptSeenRaw === "string" && promptSeenRaw.trim().length > 0
      ? promptSeenRaw
      : promptSeenRaw === true
        ? new Date(0).toISOString()
        : null;
  return {
    forwardAddress: settings.forwardAddress,
    gmailPromptSeen: promptSeenAt !== null,
    gmailPromptSeenAt: promptSeenAt,
  };
}

export async function setForwardAddress(userId: string, forwardAddress: string): Promise<EmailForwardSettingsRecord> {
  const existing = sanitizeSettingsRecord(await kvStoreGet<unknown>(EMAIL_FORWARD_SETTINGS_KEY, { userId }));
  const nowIso = new Date().toISOString();
  const next: EmailForwardSettingsRecord = {
    forwardAddress: forwardAddress.trim().toLowerCase(),
    createdAt: existing.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  await kvStoreSet(EMAIL_FORWARD_SETTINGS_KEY, next, { userId });
  return next;
}

export async function ensureForwardAddress(userId: string): Promise<string> {
  const existing = sanitizeSettingsRecord(await kvStoreGet<unknown>(EMAIL_FORWARD_SETTINGS_KEY, { userId }));
  if (existing.forwardAddress) {
    return existing.forwardAddress;
  }
  const generated = generateForwardAddressForUser(userId);
  await setForwardAddress(userId, generated);
  return generated;
}

export async function markGmailPromptSeen(userId: string): Promise<void> {
  await kvStoreSet(GMAIL_PROMPT_SEEN_KEY, new Date().toISOString(), { userId });
}
