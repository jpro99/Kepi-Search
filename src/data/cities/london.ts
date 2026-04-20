import type { CityCatalog } from "@/data/cities/types";

export const londonCatalog: CityCatalog = {
  id: "london",
  label: "London, UK",
  map: {
    center: { lng: -0.1276, lat: 51.5074 },
    zoom: 11.2,
    maxBounds: [
      [-0.35, 51.42],
      [0.05, 51.58],
    ],
  },
  hotels: [
    {
      id: "marriott-county-hall",
      chain: "marriott",
      name: "London Marriott Hotel County Hall",
      lat: 51.5035,
      lng: -0.1196,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/lonch-london-marriott-hotel-county-hall/overview/",
    },
    {
      id: "hyatt-churchill",
      chain: "hyatt",
      name: "Hyatt Regency London - The Churchill",
      lat: 51.5155,
      lng: -0.1725,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/england-united-kingdom/hyatt-regency-london-the-churchill/lonhr",
    },
    {
      id: "hilton-metropole",
      chain: "hilton",
      name: "Hilton London Metropole",
      lat: 51.5183,
      lng: -0.1678,
      bookUrl:
        "https://www.hilton.com/en/hotels/lonmetgi-hilton-london-metropole/",
    },
  ],
  transit: [
    {
      id: "westminster",
      name: "Westminster (tube and rail)",
      mode: "rail",
      lat: 51.501,
      lng: -0.1249,
    },
    {
      id: "paddington",
      name: "London Paddington (rail)",
      mode: "rail",
      lat: 51.5154,
      lng: -0.1755,
    },
    {
      id: "kings-cross",
      name: "Kings Cross St Pancras (rail)",
      mode: "rail",
      lat: 51.5308,
      lng: -0.1238,
    },
  ],
  touristAnchors: [
    {
      id: "westminster-core",
      label: "Westminster / South Bank core",
      lat: 51.5007,
      lng: -0.1246,
    },
  ],
};
