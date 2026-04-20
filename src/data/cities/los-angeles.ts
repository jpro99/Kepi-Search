import type { CityCatalog } from "@/data/cities/types";

/** Curated properties; overrides bulk seed for `los-angeles`. */
export const losAngelesCatalog: CityCatalog = {
  id: "los-angeles",
  label: "Los Angeles, United States",
  map: {
    center: { lng: -118.2437, lat: 34.0522 },
    zoom: 10,
    maxBounds: [
      [-118.67, 33.7],
      [-117.6, 34.34],
    ],
  },
  hotels: [
    {
      id: "la-jw-marriott-live",
      chain: "marriott",
      name: "JW Marriott Los Angeles L.A. LIVE",
      lat: 34.0453,
      lng: -118.2663,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/laxjw-jw-marriott-los-angeles-la-live/overview/",
    },
    {
      id: "la-sheraton-grand",
      chain: "marriott",
      name: "Sheraton Grand Los Angeles (Marriott portfolio)",
      lat: 34.0495,
      lng: -118.2581,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/laxgs-sheraton-grand-los-angeles/overview/",
    },
    {
      id: "la-hilton-lax",
      chain: "hilton",
      name: "Hilton Los Angeles Airport",
      lat: 33.9426,
      lng: -118.3841,
      bookUrl:
        "https://www.hilton.com/en/hotels/laxaphhf-hilton-los-angeles-airport/",
    },
    {
      id: "la-hilton-universal",
      chain: "hilton",
      name: "Hilton Los Angeles-Universal City",
      lat: 34.1361,
      lng: -118.362,
      bookUrl:
        "https://www.hilton.com/en/hotels/laxuchf-hilton-los-angeles-universal-city/",
    },
    {
      id: "la-hyatt-regency-dtla",
      chain: "hyatt",
      name: "Hyatt Regency Los Angeles Downtown",
      lat: 34.0498,
      lng: -118.2597,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/california-usa/hyatt-regency-los-angeles-downtown/laxrd",
    },
    {
      id: "la-andaz-west-hollywood",
      chain: "hyatt",
      name: "Andaz West Hollywood",
      lat: 34.095,
      lng: -118.3717,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/california-usa/andaz-west-hollywood/laxaw",
    },
  ],
  transit: [
    {
      id: "union-station-la",
      name: "Los Angeles Union Station",
      mode: "rail",
      lat: 34.0562,
      lng: -118.2348,
    },
    {
      id: "7th-metro",
      name: "7th St / Metro Center",
      mode: "rail",
      lat: 34.0493,
      lng: -118.2583,
    },
    {
      id: "hollywood-highland",
      name: "Hollywood / Highland (Red Line)",
      mode: "rail",
      lat: 34.1017,
      lng: -118.3391,
    },
  ],
  touristAnchors: [
    {
      id: "dtla-core",
      label: "Downtown LA / Civic core",
      lat: 34.0522,
      lng: -118.2437,
    },
  ],
};
