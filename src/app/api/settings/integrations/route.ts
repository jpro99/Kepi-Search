import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  COOKIE_INTEGRATIONS_VAULT,
  COOKIE_SETTINGS_SESSION,
} from "@/lib/settings/cookieNames";
import type { IntegrationsVaultV1 } from "@/lib/settings/types";
import {
  settingsAuthConfigured,
  verifySettingsSessionToken,
} from "@/lib/settings/session";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  maskIntegrations,
  mergeVault,
} from "@/lib/settings/vault";

async function requireSettingsAuth(): Promise<NextResponse | null> {
  const jar = await cookies();
  const tok = jar.get(COOKIE_SETTINGS_SESSION)?.value;
  if (!verifySettingsSessionToken(tok)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  if (!settingsAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set KEPI_SETTINGS_PASSWORD (8+ characters) in .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }
  const deny = await requireSettingsAuth();
  if (deny) return deny;

  const raw = (await cookies()).get(COOKIE_INTEGRATIONS_VAULT)?.value;
  const vault = decryptVaultPayload(raw);
  return NextResponse.json({
    masked: maskIntegrations(vault),
  });
}

export async function POST(req: Request) {
  const deny = await requireSettingsAuth();
  if (deny) return deny;

  let patch: Partial<IntegrationsVaultV1>;
  try {
    patch = (await req.json()) as Partial<IntegrationsVaultV1>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let encrypted: string;
  try {
    const prev = decryptVaultPayload(
      (await cookies()).get(COOKIE_INTEGRATIONS_VAULT)?.value,
    );
    const next = mergeVault(prev, patch);
    encrypted = encryptVaultPayload(next);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not encrypt vault (check KEPI_VAULT_SECRET).",
      },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_INTEGRATIONS_VAULT, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
  return res;
}
