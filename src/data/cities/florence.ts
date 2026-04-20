import type { CityCatalog } from "@/data/cities/types";

export const florenceCatalog: CityCatalog = {
  id: "florence",
  label: "Florence, Italy",
  map: {
    center: { lng: 11.2558, lat: 43.7696 },
    zoom: 12.5,
    maxBounds: [
      [11.18, 43.72],
      [11.35, 43.81],
    ],
  },
  hotels: [
    {
      id: "florence-st-regis",
      chain: "marriott",
      name: "The St. Regis Florence",
      lat: 43.7711,
      lng: 11.2541,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/flrst-the-st-regis-florence/overview/",
    },
    {
      id: "florence-westin",
      chain: "marriott",
      name: "The Westin Excelsior, Florence",
      lat: 43.7698,
      lng: 11.2524,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/flrwi-the-westin-excelsior-florence/overview/",
    },
    {
      id: "florence-hilton-metropole",
      chain: "hilton",
      name: "Hilton Florence Metropole",
      lat: 43.7822,
      lng: 11.2281,
      bookUrl:
        "https://www.hilton.com/en/hotels/flrmetgi-hilton-florence-metropole/",
    },
  ],
  transit: [
    {
      id: "fl-smn",
      name: "Firenze Santa Maria Novella (rail)",
      mode: "rail",
      lat: 43.7766,
      lng: 11.2479,
    },
    {
      id: "fl-signoria",
      name: "Piazza della Signoria area",
      mode: "rail",
      lat: 43.7696,
      lng: 11.2558,
    },
  ],
  touristAnchors: [
    {
      id: "fl-duomo",
      label: "Duomo / Piazza del Duomo",
      lat: 43.7731,
      lng: 11.256,
    },
  ],
};
