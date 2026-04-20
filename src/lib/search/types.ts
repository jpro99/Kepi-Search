import type { Polygon } from "geojson";

export type Chain = "hyatt" | "marriott" | "hilton";

export type TransitMode = "vaporetto" | "water_taxi" | "rail" | "people_mover";

export type RoutingProvider = "openrouteservice" | "osrm" | "none";

export interface WalkingLeg {
  durationSec: number;
  distanceM: number;
}

export interface TransitStop {
  id: string;
  name: string;
  mode: TransitMode;
  lat: number;
  lng: number;
}

export interface TouristAnchor {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface HotelRecord {
  id: string;
  chain: Chain;
  name: string;
  lat: number;
  lng: number;
  bookUrl: string;
}

export interface HotelSearchHit extends HotelRecord {
  metersToNearestTransit: number;
  nearestTransitName: string;
  nearestTransitMode: TransitMode;
  nearestTransitLng: number;
  nearestTransitLat: number;
  metersToPrimaryTouristCore: number;
  coreProximityScore: number;
  transitProximityScore: number;
  walkingToTransit: WalkingLeg | null;
  walkingToCore: WalkingLeg | null;
  routingProvider: RoutingProvider;
}

export interface SearchRequestBody {
  area: GeoJSON.Feature<Polygon>;
}

export interface SearchResponseBody {
  hotels: HotelSearchHit[];
  meta: {
    cityId: string;
    cityLabel: string;
    anchorLabel: string;
    hotelCountScanned: number;
    routing: {
      mode: "foot";
      engine: RoutingProvider;
      note: string;
    };
  };
}
