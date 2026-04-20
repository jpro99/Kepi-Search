import { openRouteServiceFootRoute } from "@/lib/routing/ors";
import { osrmFootRoute } from "@/lib/routing/osrm";
import { routeCacheGet, routeCacheKey, routeCacheSet } from "@/lib/routing/routeCache";

function provider(): "openrouteservice" | "osrm" {
  return process.env.OPENROUTESERVICE_API_KEY ? "openrouteservice" : "osrm";
}

export async function getFootRoute(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
): Promise<{
  distanceM: number;
  durationS: number;
  source: "openrouteservice" | "osrm";
} | null> {
  const key = routeCacheKey(from, to);
  const cached = routeCacheGet(key);
  if (cached) {
    return {
      distanceM: cached.distanceM,
      durationS: cached.durationS,
      source: provider(),
    };
  }

  const orsKey = process.env.OPENROUTESERVICE_API_KEY;
  const leg = orsKey
    ? await openRouteServiceFootRoute(from, to, orsKey)
    : await osrmFootRoute(from, to);

  if (!leg) return null;

  routeCacheSet(key, leg.distanceM, leg.durationS);
  return { ...leg, source: orsKey ? "openrouteservice" : "osrm" };
}
