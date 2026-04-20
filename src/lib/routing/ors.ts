export async function openRouteServiceFootRoute(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  apiKey: string,
): Promise<{ distanceM: number; durationS: number } | null> {
  const url =
    "https://api.openrouteservice.org/v2/directions/foot-walking/json";
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ac.signal,
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
        units: "m",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { summary?: { distance?: number; duration?: number } }[];
    };
    const summary = data.routes?.[0]?.summary;
    if (
      summary?.distance === undefined ||
      summary?.duration === undefined
    ) {
      return null;
    }
    return {
      distanceM: summary.distance,
      durationS: summary.duration,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
