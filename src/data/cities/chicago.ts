import type { CityCatalog } from "@/data/cities/types";

/** Curated properties; overrides bulk seed for `chicago`. */
export const chicagoCatalog: CityCatalog = {
  id: "chicago",
  label: "Chicago, United States",
  map: {
    center: { lng: -87.6298, lat: 41.8781 },
    zoom: 11,
    maxBounds: [
      [-87.94, 41.64],
      [-87.52, 42.05],
    ],
  },
  hotels: [
    {
      id: "chi-marriott-downtown-mag",
      chain: "marriott",
      name: "Chicago Marriott Downtown Magnificent Mile",
      lat: 41.8951,
      lng: -87.6238,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/chidt-chicago-marriott-downtown-magnificent-mile/overview/",
    },
    {
      id: "chi-sheraton-grand",
      chain: "marriott",
      name: "Sheraton Grand Chicago Riverwalk",
      lat: 41.8887,
      lng: -87.6245,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/chisg-sheraton-grand-chicago-riverwalk/overview/",
    },
    {
      id: "chi-hilton-chicago",
      chain: "hilton",
      name: "Hilton Chicago",
      lat: 41.8727,
      lng: -87.6249,
      bookUrl:
        "https://www.hilton.com/en/hotels/chichhf-hilton-chicago/",
    },
    {
      id: "chi-hilton-londonhouse",
      chain: "hilton",
      name: "LondonHouse Chicago, Curio Collection by Hilton",
      lat: 41.8878,
      lng: -87.6214,
      bookUrl:
        "https://www.hilton.com/en/hotels/chilnhu-londonhouse-chicago-curio-collection/",
    },
    {
      id: "chi-hyatt-regency",
      chain: "hyatt",
      name: "Hyatt Regency Chicago",
      lat: 41.8887,
      lng: -87.6193,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/illinois-usa/hyatt-regency-chicago/chirc",
    },
    {
      id: "chi-park-hyatt",
      chain: "hyatt",
      name: "Park Hyatt Chicago",
      lat: 41.8974,
      lng: -87.6219,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/illinois-usa/park-hyatt-chicago/chiph",
    },
  ],
  transit: [
    {
      id: "union-station-chi",
      name: "Chicago Union Station",
      mode: "rail",
      lat: 41.8787,
      lng: -87.6403,
    },
    {
      id: "washington-blue",
      name: "Washington (Blue Line)",
      mode: "rail",
      lat: 41.8832,
      lng: -87.6319,
    },
    {
      id: "state-lake",
      name: "State/Lake (Loop L)",
      mode: "rail",
      lat: 41.8857,
      lng: -87.6279,
    },
  ],
  touristAnchors: [
    {
      id: "loop-millennium",
      label: "Loop / Millennium Park",
      lat: 41.8826,
      lng: -87.6226,
    },
  ],
};
