import type { CityCatalog } from "@/data/cities/types";

export const frankfurtCatalog: CityCatalog = {
  id: "frankfurt",
  label: "Frankfurt, Germany",
  map: {
    center: { lng: 8.6821, lat: 50.1109 },
    zoom: 12,
    maxBounds: [
      [8.52, 50.02],
      [8.85, 50.18],
    ],
  },
  hotels: [
    {
      id: "fra-marriott",
      chain: "marriott",
      name: "Frankfurt Marriott Hotel",
      lat: 50.1055,
      lng: 8.6524,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/frafr-frankfurt-marriott-hotel/overview/",
    },
    {
      id: "fra-hilton-centre",
      chain: "hilton",
      name: "Hilton Frankfurt City Centre",
      lat: 50.1149,
      lng: 8.6699,
      bookUrl:
        "https://www.hilton.com/en/hotels/frahitgi-hilton-frankfurt-city-centre/",
    },
    {
      id: "fra-hyatt-place-airport",
      chain: "hyatt",
      name: "Hyatt Place Frankfurt Airport",
      lat: 50.0512,
      lng: 8.5721,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/germany/hyatt-place-frankfurt-airport/fraza",
    },
  ],
  transit: [
    {
      id: "fra-hbf",
      name: "Frankfurt (Main) Hbf (rail)",
      mode: "rail",
      lat: 50.1069,
      lng: 8.663,
    },
    {
      id: "fra-konstablerwache",
      name: "Konstablerwache (S/U)",
      mode: "rail",
      lat: 50.1146,
      lng: 8.6881,
    },
    {
      id: "fra-romer",
      name: "Dom / Romer area",
      mode: "rail",
      lat: 50.1106,
      lng: 8.6821,
    },
  ],
  touristAnchors: [
    {
      id: "fra-romerberg",
      label: "Romerberg / old town core",
      lat: 50.1103,
      lng: 8.6821,
    },
  ],
};
