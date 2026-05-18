import type { AppLocale } from "@/i18n/locales";
import { normalizeLocale } from "@/i18n/locales";
import { kvStoreGet, kvStoreSet } from "@/lib/travelAssistant/kvStore";

const LOCALE_KEY = "locale";

export async function getUserLocalePreference(userId: string): Promise<AppLocale | null> {
  const stored = await kvStoreGet<string>(LOCALE_KEY, { userId });
  return normalizeLocale(stored);
}

export async function setUserLocalePreference(userId: string, locale: AppLocale): Promise<void> {
  await kvStoreSet(LOCALE_KEY, locale, { userId });
}
