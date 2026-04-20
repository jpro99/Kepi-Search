import type { CityCatalog } from "@/data/cities/types";

export const romeCatalog: CityCatalog = {
  id: "rome",
  label: "Rome, Italy",
  map: {
    center: { lng: 12.4823, lat: 41.9028 },
    zoom: 11.5,
    maxBounds: [
      [12.35, 41.78],
      [12.65, 42.08],
    ],
  },
  hotels: [
    {
      id: "rome-st-regis",
      chain: "marriott",
      name: "The St. Regis Rome",
      lat: 41.9069,
      lng: 12.4818,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/romxr-the-st-regis-rome/overview/",
    },
    {
      id: "rome-marriott-flora",
      chain: "marriott",
      name: "Rome Marriott Grand Hotel Flora",
      lat: 41.9144,
      lng: 12.4896,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/romgh-rome-marriott-grand-hotel-flora/overview/",
    },
    {
      id: "rome-hilton-cavalieri",
      chain: "hilton",
      name: "Rome Cavalieri, A Waldorf Astoria Hotel",
      lat: 41.8744,
      lng: 12.4347,
      bookUrl:
        "https://www.hilton.com/en/hotels/romwawa-rome-cavalieri-a-waldorf-astoria-hotel/",
    },
  ],
  transit: [
    {
      id: "rome-termini",
      name: "Roma Termini (rail)",
      mode: "rail",
      lat: 41.901,
      lng: 12.5018,
    },
    {
      id: "rome-spagna",
      name: "Spagna (Metro A)",
      mode: "rail",
      lat: 41.9064,
      lng: 12.4825,
    },
    {
      id: "rome-colosseo",
      name: "Colosseo (Metro B)",
      mode: "rail",
      lat: 41.8914,
      lng: 12.4913,
    },
  ],
  touristAnchors: [
    {
      id: "rome-center",
      label: "Historic center (Pantheon / Trevi area)",
      lat: 41.8992,
      lng: 12.4833,
    },
  ],
};
