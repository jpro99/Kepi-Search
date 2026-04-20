type CachedRoute = {
  distanceM: number;
  durationS: number;
  expiresAt: number;
};

const store = new Map<string, CachedRoute>();
const MAX_KEYS = 400;
const TTL_MS = 24 * 60 * 60 * 1000;

function normalizeCoord(n: number) {
  return Math.round(n * 100_000) / 100_000;
}

/** Stable key for an undirected pair of points (walking symmetry is close enough for caching). */
export function routeCacheKey(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
) {
  const p1 = `${normalizeCoord(a.lng)},${normalizeCoord(a.lat)}`;
  const p2 = `${normalizeCoord(b.lng)},${normalizeCoord(b.lat)}`;
  return p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
}

export function routeCacheGet(key: string): CachedRoute | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit;
}

export function routeCacheSet(
  key: string,
  distanceM: number,
  durationS: number,
) {
  while (store.size >= MAX_KEYS) {
    const first = store.keys().next().value;
    if (first === undefined) break;
    store.delete(first);
  }
  store.set(key, {
    distanceM,
    durationS,
    expiresAt: Date.now() + TTL_MS,
  });
}
