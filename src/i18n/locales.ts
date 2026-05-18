export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE_NAME = "kepi-locale";

function toPrimaryLanguageTag(rawLocale: string): string {
  return rawLocale.trim().toLowerCase().split("-")[0] ?? "";
}

export function isSupportedLocale(locale: string | null | undefined): locale is AppLocale {
  if (!locale) return false;
  return SUPPORTED_LOCALES.includes(locale as AppLocale);
}

export function normalizeLocale(locale: string | null | undefined): AppLocale | null {
  if (!locale) return null;
  const normalized = toPrimaryLanguageTag(locale);
  return isSupportedLocale(normalized) ? normalized : null;
}

export function detectLocaleFromAcceptLanguage(headerValue: string | null | undefined): AppLocale {
  if (!headerValue) return DEFAULT_LOCALE;
  const candidates = headerValue
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim() ?? "")
    .map((entry) => normalizeLocale(entry))
    .filter((entry): entry is AppLocale => entry !== null);
  return candidates[0] ?? DEFAULT_LOCALE;
}
