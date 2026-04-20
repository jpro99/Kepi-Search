import type { CityCatalog } from "@/data/cities/types";

export const bolognaCatalog: CityCatalog = {
  id: "bologna",
  label: "Bologna, Italy",
  map: {
    center: { lng: 11.3426, lat: 44.4949 },
    zoom: 12.5,
    maxBounds: [
      [11.25, 44.42],
      [11.45, 44.56],
    ],
  },
  hotels: [
    {
      id: "bologna-ac",
      chain: "marriott",
      name: "AC Hotel Bologna by Marriott",
      lat: 44.5142,
      lng: 11.3724,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/blqac-ac-hotel-bologna/overview/",
    },
    {
      id: "bologna-hilton-garden",
      chain: "hilton",
      name: "Hilton Garden Inn Bologna North",
      lat: 44.5511,
      lng: 11.3722,
      bookUrl:
        "https://www.hilton.com/en/hotels/blqbigi-hilton-garden-inn-bologna-north/",
    },
    {
      id: "bologna-courtyard",
      chain: "marriott",
      name: "Courtyard Bologna Airport",
      lat: 44.5269,
      lng: 11.2889,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/blqcy-courtyard-bologna-airport/overview/",
    },
  ],
  transit: [
    {
      id: "blq-centrale",
      name: "Bologna Centrale (rail)",
      mode: "rail",
      lat: 44.5059,
      lng: 11.3434,
    },
    {
      id: "blq-airport",
      name: "Bologna Airport (BLQ)",
      mode: "rail",
      lat: 44.5294,
      lng: 11.293,
    },
  ],
  touristAnchors: [
    {
      id: "blq-maggiore",
      label: "Piazza Maggiore area",
      lat: 44.4938,
      lng: 11.3431,
    },
  ],
};
