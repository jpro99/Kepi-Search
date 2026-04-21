import { createHmac, timingSafeEqual } from "node:crypto";

function settingsPassword(): string {
  return process.env.KEPI_SETTINGS_PASSWORD ?? "";
}

export function settingsAuthConfigured(): boolean {
  return settingsPassword().length >= 8;
}

/** Signed opaque token; verified server-side without server session store. */
export function createSettingsSessionToken(): string {
  const secret = settingsPassword();
  if (!settingsAuthConfigured()) {
    throw new Error("KEPI_SETTINGS_PASSWORD must be at least 8 characters.");
  }
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ exp, sig }), "utf8").toString(
    "base64url",
  );
}

export function verifySettingsSessionToken(token: string | undefined): boolean {
  if (!token || !settingsAuthConfigured()) return false;
  try {
    const { exp, sig } = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as { exp: number; sig: string };
    if (typeof exp !== "number" || typeof sig !== "string") return false;
    if (Date.now() > exp) return false;
    const secret = settingsPassword();
    const expectHex = createHmac("sha256", secret)
      .update(String(exp))
      .digest("hex");
    const gotBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectHex, "hex");
    if (gotBuf.length !== expBuf.length) return false;
    return timingSafeEqual(gotBuf, expBuf);
  } catch {
    return false;
  }
}
