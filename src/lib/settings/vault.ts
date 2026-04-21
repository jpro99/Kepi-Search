import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type {
  IntegrationsMasked,
  IntegrationsVaultV1,
} from "@/lib/settings/types";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function encryptionKey(): Buffer {
  const secret = process.env.KEPI_VAULT_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error(
      "KEPI_VAULT_SECRET must be set to at least 32 characters (use a long random string in .env.local).",
    );
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptVaultPayload(data: IntegrationsVaultV1): string {
  const key = encryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const plain = Buffer.from(JSON.stringify(data), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptVaultPayload(
  token: string | undefined,
): IntegrationsVaultV1 | null {
  if (!token) return null;
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const key = encryptionKey();
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    const parsed = JSON.parse(plain.toString("utf8")) as IntegrationsVaultV1;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function previewField(v: string | undefined): string {
  if (!v) return "";
  const t = v.trim();
  if (t.length <= 4) return "****";
  return `...${t.slice(-4)}`;
}

export function maskIntegrations(
  v: IntegrationsVaultV1 | null,
): IntegrationsMasked {
  const empty: IntegrationsMasked = {
    seatsAeroApiKey: false,
    alaskaMileagePlan: false,
    americanAAdvantage: false,
    unitedMileagePlus: false,
    deltaSkyMiles: false,
    marriottBonvoy: false,
    hiltonHonors: false,
    worldOfHyatt: false,
    notes: false,
    preview: {},
  };
  if (!v) return empty;

  const preview: IntegrationsMasked["preview"] = {};
  const set = (k: keyof IntegrationsVaultV1, val: string | undefined) => {
    if (val && val.trim()) {
      (preview as Record<string, string>)[String(k)] = previewField(val);
    }
  };
  set("seatsAeroApiKey", v.seatsAeroApiKey);
  set("alaskaMileagePlan", v.alaskaMileagePlan);
  set("americanAAdvantage", v.americanAAdvantage);
  set("unitedMileagePlus", v.unitedMileagePlus);
  set("deltaSkyMiles", v.deltaSkyMiles);
  set("marriottBonvoy", v.marriottBonvoy);
  set("hiltonHonors", v.hiltonHonors);
  set("worldOfHyatt", v.worldOfHyatt);
  set("notes", v.notes);

  return {
    seatsAeroApiKey: Boolean(v.seatsAeroApiKey?.trim()),
    alaskaMileagePlan: Boolean(v.alaskaMileagePlan?.trim()),
    americanAAdvantage: Boolean(v.americanAAdvantage?.trim()),
    unitedMileagePlus: Boolean(v.unitedMileagePlus?.trim()),
    deltaSkyMiles: Boolean(v.deltaSkyMiles?.trim()),
    marriottBonvoy: Boolean(v.marriottBonvoy?.trim()),
    hiltonHonors: Boolean(v.hiltonHonors?.trim()),
    worldOfHyatt: Boolean(v.worldOfHyatt?.trim()),
    notes: Boolean(v.notes?.trim()),
    preview,
  };
}

export function mergeVault(
  prev: IntegrationsVaultV1 | null,
  patch: Partial<IntegrationsVaultV1>,
): IntegrationsVaultV1 {
  const base: IntegrationsVaultV1 = prev
    ? { ...prev, version: 1 as const }
    : { version: 1 as const };
  const keys = [
    "seatsAeroApiKey",
    "alaskaMileagePlan",
    "americanAAdvantage",
    "unitedMileagePlus",
    "deltaSkyMiles",
    "marriottBonvoy",
    "hiltonHonors",
    "worldOfHyatt",
    "notes",
  ] as const;

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      const val = patch[k];
      if (typeof val === "string") {
        const t = val.trim();
        if (t === "") {
          delete (base as Record<string, unknown>)[k];
        } else {
          (base as unknown as Record<string, string>)[k] = t;
        }
      }
    }
  }
  return base;
}
