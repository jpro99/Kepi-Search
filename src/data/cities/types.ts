import type { HotelRecord, TouristAnchor, TransitStop } from "@/lib/search/types";

export interface CityMapConfig {
  center: { lng: number; lat: number };
  zoom: number;
  maxBounds: [[number, number], [number, number]];
}

/** One searchable city: hotels, transit sample nodes, map framing, tourist anchor(s). */
export interface CityCatalog {
  id: string;
  label: string;
  map: CityMapConfig;
  hotels: HotelRecord[];
  transit: TransitStop[];
  touristAnchors: TouristAnchor[];
}
