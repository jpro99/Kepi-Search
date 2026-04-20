import type { CityCatalog } from "@/data/cities/types";

export const cologneCatalog: CityCatalog = {
  id: "cologne",
  label: "Cologne, Germany",
  map: {
    center: { lng: 6.9603, lat: 50.9375 },
    zoom: 12,
    maxBounds: [
      [6.82, 50.86],
      [7.1, 51.02],
    ],
  },
  hotels: [
    {
      id: "cgn-hyatt-regency",
      chain: "hyatt",
      name: "Hyatt Regency Cologne",
      lat: 50.9412,
      lng: 6.9636,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/germany/hyatt-regency-cologne/cgnhr",
    },
    {
      id: "cgn-marriott",
      chain: "marriott",
      name: "Cologne Marriott Hotel",
      lat: 50.9424,
      lng: 6.9819,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/cgnmc-cologne-marriott-hotel/overview/",
    },
    {
      id: "cgn-hilton",
      chain: "hilton",
      name: "Hilton Cologne",
      lat: 50.9421,
      lng: 6.9578,
      bookUrl: "https://www.hilton.com/en/hotels/cgnhitgi-hilton-cologne/",
    },
  ],
  transit: [
    {
      id: "cgn-hbf",
      name: "Koln Hauptbahnhof (rail)",
      mode: "rail",
      lat: 50.943,
      lng: 6.9587,
    },
    {
      id: "cgn-heumarkt",
      name: "Heumarkt (Stadtbahn)",
      mode: "rail",
      lat: 50.9356,
      lng: 6.9581,
    },
  ],
  touristAnchors: [
    {
      id: "cgn-dom",
      label: "Kolner Dom / old town",
      lat: 50.9413,
      lng: 6.9583,
    },
  ],
};
