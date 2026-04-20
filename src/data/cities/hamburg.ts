import type { CityCatalog } from "@/data/cities/types";

export const hamburgCatalog: CityCatalog = {
  id: "hamburg",
  label: "Hamburg, Germany",
  map: {
    center: { lng: 9.9937, lat: 53.5511 },
    zoom: 11.5,
    maxBounds: [
      [9.75, 53.42],
      [10.25, 53.65],
    ],
  },
  hotels: [
    {
      id: "ham-reichshof",
      chain: "hilton",
      name: "Reichshof Hotel Hamburg, Curio Collection by Hilton",
      lat: 53.5586,
      lng: 10.0066,
      bookUrl:
        "https://www.hilton.com/en/hotels/hamcici-reichshof-hotel-hamburg-curio-collection/",
    },
    {
      id: "ham-marriott",
      chain: "marriott",
      name: "Hamburg Marriott Hotel",
      lat: 53.5519,
      lng: 9.9897,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/hammc-hamburg-marriott-hotel/overview/",
    },
    {
      id: "ham-westin",
      chain: "marriott",
      name: "The Westin Hamburg",
      lat: 53.5413,
      lng: 9.9851,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/hamwi-the-westin-hamburg/overview/",
    },
  ],
  transit: [
    {
      id: "ham-hbf",
      name: "Hamburg Hauptbahnhof (rail)",
      mode: "rail",
      lat: 53.5527,
      lng: 10.0069,
    },
    {
      id: "ham-jungfernstieg",
      name: "Jungfernstieg (S/U)",
      mode: "rail",
      lat: 53.5534,
      lng: 9.9922,
    },
    {
      id: "ham-landungsbrucken",
      name: "Landungsbrucken (S/U)",
      mode: "rail",
      lat: 53.5451,
      lng: 9.9706,
    },
  ],
  touristAnchors: [
    {
      id: "ham-rathaus",
      label: "Rathaus / Altstadt core",
      lat: 53.5503,
      lng: 9.9927,
    },
  ],
};
