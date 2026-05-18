import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, detectLocaleFromAcceptLanguage, normalizeLocale } from "@/i18n/locales";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { setUserLocalePreference } from "@/lib/i18n/localeStore";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rateLimit";

const LocaleBodySchema = z.object({
  locale: z.string().trim().min(2).max(16),
});

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function buildLocaleCookie(locale: "en" | "es") {
  return {
    name: LOCALE_COOKIE_NAME,
    value: locale,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  };
}

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/locale",
  });

  const headerLocale = detectLocaleFromAcceptLanguage(req.headers.get("accept-language"));
  const cookieLocale = normalizeLocale(req.headers.get("cookie")?.match(/kepi-locale=([^;]+)/)?.[1] ?? null);
  const locale = cookieLocale ?? headerLocale ?? DEFAULT_LOCALE;
  routeLogger.info("Locale status requested.", { locale });

  return NextResponse.json({ locale });
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || randomUUID();
  const userId = await resolveAuthenticatedUserId();
  const routeLogger = logger.withContext({
    requestId,
    userId,
    route: "/api/locale",
  });

  const rateLimit = await enforceRateLimit({
    policyName: "travel-updates-general",
    identifier: userId ?? `anon:${requestId}`,
    route: "/api/locale",
    requestId,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many locale update requests. Please retry shortly." },
      { status: 429, headers: rateLimit.headers },
    );
  }

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const parsed = LocaleBodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422, headers: rateLimit.headers },
    );
  }

  const locale = normalizeLocale(parsed.data.locale);
  if (!locale) {
    return NextResponse.json(
      { error: "Unsupported locale. Allowed values: en, es." },
      { status: 422, headers: rateLimit.headers },
    );
  }

  if (userId) {
    await setUserLocalePreference(userId, locale);
  }

  const response = NextResponse.json(
    {
      locale,
      persistedToKv: Boolean(userId),
    },
    { headers: rateLimit.headers },
  );
  response.cookies.set(buildLocaleCookie(locale));
  routeLogger.info("Locale preference updated.", { locale, persistedToKv: Boolean(userId) });
  return response;
}
