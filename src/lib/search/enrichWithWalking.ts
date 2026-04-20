import pLimit from "p-limit";
import type { CityCatalog } from "@/data/cities/types";
import { getFootRoute } from "@/lib/routing/walkingRouter";
import type { HotelSearchHit } from "@/lib/search/types";

function scoreFromDuration(durationSec: number, halfLifeSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec < 0) return 0;
  const raw = 100 * Math.exp(-durationSec / halfLifeSec);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

/**
 * Adds pedestrian route estimates (when the routing engine returns a path).
 * Caps concurrency to stay polite to public OSRM; ORS key raises your own quota.
 */
export async function enrichHitsWithWalking(
  hits: HotelSearchHit[],
  catalog: CityCatalog,
): Promise<HotelSearchHit[]> {
  const anchor = catalog.touristAnchors[0];
  if (!anchor) return hits;

  const limit = pLimit(4);

  const enriched = await Promise.all(
    hits.map((h) =>
      limit(async (): Promise<HotelSearchHit> => {
        const from = { lng: h.lng, lat: h.lat };
        const transitEnd = {
          lng: h.nearestTransitLng,
          lat: h.nearestTransitLat,
        };
        const coreEnd = { lng: anchor.lng, lat: anchor.lat };

        const [legTransit, legCore] = await Promise.all([
          getFootRoute(from, transitEnd),
          getFootRoute(from, coreEnd),
        ]);

        const routingProvider =
          legTransit || legCore
            ? (legTransit?.source ?? legCore?.source ?? "osrm")
            : "none";

        const walkingToTransit = legTransit
          ? { durationSec: legTransit.durationS, distanceM: legTransit.distanceM }
          : null;
        const walkingToCore = legCore
          ? { durationSec: legCore.durationS, distanceM: legCore.distanceM }
          : null;

        let transitProximityScore = h.transitProximityScore;
        let coreProximityScore = h.coreProximityScore;

        if (walkingToTransit) {
          transitProximityScore = scoreFromDuration(
            walkingToTransit.durationSec,
            360,
          );
        }
        if (walkingToCore) {
          coreProximityScore = scoreFromDuration(walkingToCore.durationSec, 540);
        }

        return {
          ...h,
          transitProximityScore,
          coreProximityScore,
          walkingToTransit,
          walkingToCore,
          routingProvider,
        };
      }),
    ),
  );

  enriched.sort((a, b) => {
    const ac = a.walkingToCore?.durationSec ?? a.metersToPrimaryTouristCore;
    const bc = b.walkingToCore?.durationSec ?? b.metersToPrimaryTouristCore;
    if (ac !== bc) return ac - bc;
    const at =
      a.walkingToTransit?.durationSec ?? a.metersToNearestTransit;
    const bt =
      b.walkingToTransit?.durationSec ?? b.metersToNearestTransit;
    return at - bt;
  });

  return enriched;
}
