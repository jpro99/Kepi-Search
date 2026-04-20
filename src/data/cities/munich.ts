import type { CityCatalog } from "@/data/cities/types";

export const munichCatalog: CityCatalog = {
  id: "munich",
  label: "Munich, Germany",
  map: {
    center: { lng: 11.5755, lat: 48.1374 },
    zoom: 11.5,
    maxBounds: [
      [11.35, 48.05],
      [11.75, 48.22],
    ],
  },
  hotels: [
    {
      id: "munich-marriott-city",
      chain: "marriott",
      name: "Munich Marriott Hotel City West",
      lat: 48.1436,
      lng: 11.5056,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/mucmc-munich-marriott-hotel-city-west/overview/",
    },
    {
      id: "munich-hilton-park",
      chain: "hilton",
      name: "Hilton Munich Park",
      lat: 48.1524,
      lng: 11.5986,
      bookUrl: "https://www.hilton.com/en/hotels/muchitw-hilton-munich-park/",
    },
    {
      id: "munich-hyatt-regency",
      chain: "hyatt",
      name: "Hyatt Regency Munich",
      lat: 48.1379,
      lng: 11.6044,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/germany/hyatt-regency-munich/muchr",
    },
  ],
  transit: [
    {
      id: "mun-hbf",
      name: "Munchen Hauptbahnhof (rail)",
      mode: "rail",
      lat: 48.1402,
      lng: 11.5583,
    },
    {
      id: "mun-marienplatz",
      name: "Marienplatz (S/U)",
      mode: "rail",
      lat: 48.1371,
      lng: 11.5754,
    },
    {
      id: "mun-sendlinger",
      name: "Sendlinger Tor (U)",
      mode: "rail",
      lat: 48.1347,
      lng: 11.5677,
    },
  ],
  touristAnchors: [
    {
      id: "mun-old-town",
      label: "Altstadt / Marienplatz",
      lat: 48.1371,
      lng: 11.5754,
    },
  ],
};
