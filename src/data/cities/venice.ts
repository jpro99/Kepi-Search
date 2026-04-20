import type { CityCatalog } from "@/data/cities/types";
import {
  VENICE_HOTELS,
  VENICE_TOURIST_ANCHORS,
  VENICE_TRANSIT,
} from "@/data/veniceCatalog";

export const veniceCatalog: CityCatalog = {
  id: "venice",
  label: "Venice, Italy",
  map: {
    center: { lng: 12.335, lat: 45.437 },
    zoom: 12.4,
    maxBounds: [
      [12.25, 45.38],
      [12.42, 45.52],
    ],
  },
  hotels: VENICE_HOTELS,
  transit: VENICE_TRANSIT,
  touristAnchors: VENICE_TOURIST_ANCHORS,
};
