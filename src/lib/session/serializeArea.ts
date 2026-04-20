import type { Position } from "geojson";

/** Keep share URLs under common browser limits. */
export const MAX_AREA_PARAM_CHARS = 1800;

export type EncodedSearchArea = { v: 1; r: [number, number][] };

export function encodeSearchAreaParam(ring: Position[]): string {
  const r = ring.map(([lng, lat]) => [
    Math.round(lng * 1e6) / 1e6,
    Math.round(lat * 1e6) / 1e6,
  ]) as [number, number][];
  return JSON.stringify({ v: 1, r } satisfies EncodedSearchArea);
}

export function decodeSearchAreaParam(raw: string | null): Position[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as EncodedSearchArea;
    if (parsed?.v !== 1 || !Array.isArray(parsed.r) || parsed.r.length < 4) {
      return null;
    }
    const ring = parsed.r as Position[];
    const [fx, fy] = ring[0]!;
    const [lx, ly] = ring[ring.length - 1]!;
    if (fx !== lx || fy !== ly) {
      return [...ring, [fx, fy]];
    }
    return ring;
  } catch {
    return null;
  }
}
