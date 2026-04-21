import { NextResponse } from "next/server";

import {
  COOKIE_INTEGRATIONS_VAULT,
  COOKIE_SETTINGS_SESSION,
} from "@/lib/settings/cookieNames";
import {
  createSettingsSessionToken,
  settingsAuthConfigured,
} from "@/lib/settings/session";

export async function POST(req: Request) {
  if (!settingsAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set KEPI_SETTINGS_PASSWORD (8+ characters) in .env.local, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password ?? "";
  if (password !== process.env.KEPI_SETTINGS_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  let token: string;
  try {
    token = createSettingsSessionToken();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Auth misconfigured" },
      { status: 503 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SETTINGS_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SETTINGS_SESSION, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  res.cookies.set(COOKIE_INTEGRATIONS_VAULT, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
