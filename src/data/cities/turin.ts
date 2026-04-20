import type { CityCatalog } from "@/data/cities/types";

export const turinCatalog: CityCatalog = {
  id: "turin",
  label: "Turin, Italy",
  map: {
    center: { lng: 7.6869, lat: 45.0703 },
    zoom: 12,
    maxBounds: [
      [7.55, 44.95],
      [7.85, 45.15],
    ],
  },
  hotels: [
    {
      id: "turin-courtyard-lingotto",
      chain: "marriott",
      name: "Courtyard by Marriott Turin Lingotto",
      lat: 45.0331,
      lng: 7.6669,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/trnct-courtyard-turin-lingotto/overview/",
    },
    {
      id: "turin-hilton",
      chain: "hilton",
      name: "Hilton Turin City Centre",
      lat: 45.0627,
      lng: 7.6789,
      bookUrl:
        "https://www.hilton.com/en/hotels/trnhiti-hilton-turin-city-centre/",
    },
    {
      id: "turin-ac",
      chain: "marriott",
      name: "AC Hotel Torino by Marriott",
      lat: 45.0189,
      lng: 7.6564,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/trnac-ac-hotel-torino/overview/",
    },
  ],
  transit: [
    {
      id: "tur-porta-nuova",
      name: "Torino Porta Nuova (rail)",
      mode: "rail",
      lat: 45.0619,
      lng: 7.6787,
    },
    {
      id: "tur-re-umberto",
      name: "Re Umberto (Metro)",
      mode: "rail",
      lat: 45.0636,
      lng: 7.6765,
    },
  ],
  touristAnchors: [
    {
      id: "tur-mole",
      label: "Mole Antonelliana / centro",
      lat: 45.0689,
      lng: 7.6934,
    },
  ],
};
