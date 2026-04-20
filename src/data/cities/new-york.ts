import type { CityCatalog } from "@/data/cities/types";

/** Curated properties + transit anchors; overrides bulk seed for `new-york`. */
export const newYorkCatalog: CityCatalog = {
  id: "new-york",
  label: "New York, United States",
  map: {
    center: { lng: -74.006, lat: 40.7128 },
    zoom: 11,
    maxBounds: [
      [-74.26, 40.49],
      [-73.7, 40.92],
    ],
  },
  hotels: [
    {
      id: "nyc-marriott-marquis",
      chain: "marriott",
      name: "New York Marriott Marquis",
      lat: 40.7589,
      lng: -73.985,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/nycmq-new-york-marriott-marquis/overview/",
    },
    {
      id: "nyc-courtyard-midtown",
      chain: "marriott",
      name: "Courtyard New York Manhattan / Midtown East",
      lat: 40.7546,
      lng: -73.9721,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/nycme-courtyard-new-york-manhattan-midtown-east/overview/",
    },
    {
      id: "nyc-hilton-midtown",
      chain: "hilton",
      name: "New York Hilton Midtown",
      lat: 40.7624,
      lng: -73.9788,
      bookUrl:
        "https://www.hilton.com/en/hotels/nycmhhf-new-york-hilton-midtown/",
    },
    {
      id: "nyc-conrad-downtown",
      chain: "hilton",
      name: "Conrad New York Downtown",
      lat: 40.7151,
      lng: -74.0159,
      bookUrl:
        "https://www.hilton.com/en/hotels/nycwcdi-conrad-new-york-downtown/",
    },
    {
      id: "nyc-hyatt-times-square",
      chain: "hyatt",
      name: "Hyatt Centric Times Square New York",
      lat: 40.7549,
      lng: -73.984,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/new-york-usa/hyatt-centric-times-square-new-york/nycct",
    },
    {
      id: "nyc-grand-hyatt",
      chain: "hyatt",
      name: "Grand Hyatt New York (legacy landmark area)",
      lat: 40.7517,
      lng: -73.9756,
      bookUrl: "https://www.hyatt.com/search?term=Grand%20Hyatt%20New%20York",
    },
  ],
  transit: [
    {
      id: "gct",
      name: "Grand Central Terminal",
      mode: "rail",
      lat: 40.7527,
      lng: -73.9772,
    },
    {
      id: "penn",
      name: "New York Penn Station",
      mode: "rail",
      lat: 40.7506,
      lng: -73.9937,
    },
    {
      id: "times-sq-subway",
      name: "Times Square–42nd Street (subway)",
      mode: "rail",
      lat: 40.759,
      lng: -73.9845,
    },
  ],
  touristAnchors: [
    {
      id: "times-square-core",
      label: "Times Square / Theater District",
      lat: 40.758,
      lng: -73.9855,
    },
  ],
};
