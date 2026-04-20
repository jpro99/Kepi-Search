import * as turf from "@turf/turf";
import type { CityCatalog } from "@/data/cities/types";
import type { Feature, Polygon, Position } from "geojson";
import type { HotelSearchHit } from "@/lib/search/types";

const toPoint = (lng: number, lat: number): Feature<GeoJSON.Point> =>
  turf.point([lng, lat]);

function metersBetween(aLng: number, aLat: number, bLng: number, bLat: number) {
  return turf.distance(toPoint(aLng, aLat), toPoint(bLng, bLat), {
    units: "kilometers",
  }) * 1000;
}

/** Map distance to 0–100 (closer → higher). `halfLifeM` is distance at which score ≈ 50. */
function proximityScore(meters: number, halfLifeM: number): number {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  const raw = 100 * Math.exp(-meters / halfLifeM);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function ringClosed(ring: Position[]): Position[] {
  if (ring.length < 4) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export function searchHotelsInPolygon(
  area: Feature<Polygon>,
  catalog: CityCatalog,
): HotelSearchHit[] {
  const poly: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: area.geometry.coordinates.map(ringClosed),
    },
  };

  const primary = catalog.touristAnchors[0];
  if (!primary || catalog.transit.length === 0) {
    return [];
  }

  const hits: HotelSearchHit[] = [];

  for (const h of catalog.hotels) {
    const pt = toPoint(h.lng, h.lat);
    if (!turf.booleanPointInPolygon(pt, poly)) continue;

    let bestTransit = catalog.transit[0]!;
    let bestD = Infinity;
    for (const s of catalog.transit) {
      const d = metersBetween(h.lng, h.lat, s.lng, s.lat);
      if (d < bestD) {
        bestD = d;
        bestTransit = s;
      }
    }

    const metersToCore = metersBetween(h.lng, h.lat, primary.lng, primary.lat);

    hits.push({
      ...h,
      metersToNearestTransit: Math.round(bestD),
      nearestTransitName: bestTransit.name,
      nearestTransitMode: bestTransit.mode,
      nearestTransitLng: bestTransit.lng,
      nearestTransitLat: bestTransit.lat,
      metersToPrimaryTouristCore: Math.round(metersToCore),
      coreProximityScore: proximityScore(metersToCore, 600),
      transitProximityScore: proximityScore(bestD, 400),
      walkingToTransit: null,
      walkingToCore: null,
      routingProvider: "none",
    });
  }

  hits.sort((a, b) => {
    if (a.metersToPrimaryTouristCore !== b.metersToPrimaryTouristCore) {
      return a.metersToPrimaryTouristCore - b.metersToPrimaryTouristCore;
    }
    return a.metersToNearestTransit - b.metersToNearestTransit;
  });

  return hits;
}
