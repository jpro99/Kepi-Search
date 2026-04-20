import type { CityCatalog } from "@/data/cities/types";

export const berlinCatalog: CityCatalog = {
  id: "berlin",
  label: "Berlin, Germany",
  map: {
    center: { lng: 13.405, lat: 52.52 },
    zoom: 11.2,
    maxBounds: [
      [13.2, 52.42],
      [13.65, 52.62],
    ],
  },
  hotels: [
    {
      id: "berlin-hilton-gendarmenmarkt",
      chain: "hilton",
      name: "Hilton Berlin",
      lat: 52.5139,
      lng: 13.3927,
      bookUrl: "https://www.hilton.com/en/hotels/berhitgi-hilton-berlin/",
    },
    {
      id: "berlin-westin-grand",
      chain: "marriott",
      name: "The Westin Grand Berlin",
      lat: 52.5163,
      lng: 13.3882,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/berwi-the-westin-grand-berlin/overview/",
    },
    {
      id: "berlin-grand-hyatt",
      chain: "hyatt",
      name: "Grand Hyatt Berlin",
      lat: 52.5096,
      lng: 13.3736,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/germany/grand-hyatt-berlin/bergh",
    },
  ],
  transit: [
    {
      id: "ber-hbf",
      name: "Berlin Hauptbahnhof (rail)",
      mode: "rail",
      lat: 52.5251,
      lng: 13.3694,
    },
    {
      id: "ber-brandenburger",
      name: "Brandenburger Tor (S/U)",
      mode: "rail",
      lat: 52.5163,
      lng: 13.3777,
    },
    {
      id: "ber-alexanderplatz",
      name: "Alexanderplatz (S/U)",
      mode: "rail",
      lat: 52.5219,
      lng: 13.4132,
    },
  ],
  touristAnchors: [
    {
      id: "ber-mitte",
      label: "Mitte / Brandenburg Gate area",
      lat: 52.5163,
      lng: 13.3777,
    },
  ],
};
