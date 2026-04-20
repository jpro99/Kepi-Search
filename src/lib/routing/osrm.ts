export async function osrmFootRoute(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
): Promise<{ distanceM: number; durationS: number } | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=false`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "KepiSearch/1.0 (personal)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      routes?: { distance: number; duration: number }[];
    };
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const r = data.routes[0];
    return { distanceM: r.distance, durationS: r.duration };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
