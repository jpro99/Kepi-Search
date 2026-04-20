import type { Chain, HotelSearchHit } from "@/lib/search/types";

const STORAGE_KEY = "kepi-search-session-v1";

export type SortModePersisted =
  | "coreWalk"
  | "transitWalk"
  | "lineCore"
  | "coreScore"
  | "name";

export type StoredSearchSessionV1 = {
  version: 1;
  cityId: string;
  /** Outer ring of search polygon (lng, lat), closed. */
  ring: [number, number][];
  hotels: HotelSearchHit[];
  meta: {
    cityId: string;
    cityLabel: string;
    anchorLabel: string;
    hotelCountScanned: number;
    routing?: { mode: string; engine: string; note: string };
  };
  chainOn: Record<Chain, boolean>;
  sortBy: SortModePersisted;
  savedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadSearchSession(): StoredSearchSessionV1 | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredSearchSessionV1;
    if (data?.version !== 1 || typeof data.cityId !== "string") return null;
    if (!Array.isArray(data.ring) || data.ring.length < 4) return null;
    if (!Array.isArray(data.hotels)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSearchSession(session: StoredSearchSessionV1): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // QuotaExceeded or private mode — ignore
  }
}

export function clearSearchSession(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
