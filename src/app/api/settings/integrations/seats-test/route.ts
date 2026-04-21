import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  COOKIE_INTEGRATIONS_VAULT,
  COOKIE_SETTINGS_SESSION,
} from "@/lib/settings/cookieNames";
import { verifySettingsSessionToken } from "@/lib/settings/session";
import { decryptVaultPayload } from "@/lib/settings/vault";

const SEATS_BASE = "https://seats.aero/partnerapi";

export async function POST() {
  const jar = await cookies();
  const tok = jar.get(COOKIE_SETTINGS_SESSION)?.value;
  if (!verifySettingsSessionToken(tok)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vault = decryptVaultPayload(jar.get(COOKIE_INTEGRATIONS_VAULT)?.value);
  const apiKey = vault?.seatsAeroApiKey?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Save a Seats.aero API key first." },
      { status: 400 },
    );
  }

  const url = new URL(`${SEATS_BASE}/search`);
  url.searchParams.set("origin_airport", "LAX");
  url.searchParams.set("destination_airport", "FCO");
  url.searchParams.set("take", "10");

  const r = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Partner-Authorization": apiKey,
    },
    cache: "no-store",
  });

  const text = await r.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!r.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: r.status,
        body,
        hint: "Confirm your Pro API key under seats.aero Settings → API. Cached Search counts toward your daily quota.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: r.status,
    body,
  });
}
