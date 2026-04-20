import type { CityCatalog } from "@/data/cities/types";

export const naplesCatalog: CityCatalog = {
  id: "naples",
  label: "Naples, Italy",
  map: {
    center: { lng: 14.2681, lat: 40.8518 },
    zoom: 12.2,
    maxBounds: [
      [14.12, 40.76],
      [14.38, 40.92],
    ],
  },
  hotels: [
    {
      id: "naples-marriott",
      chain: "marriott",
      name: "Naples Marriott Hotel",
      lat: 40.8356,
      lng: 14.2756,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/napmc-naples-marriott-hotel/overview/",
    },
    {
      id: "naples-hilton",
      chain: "hilton",
      name: "Hilton Naples",
      lat: 40.8381,
      lng: 14.2464,
      bookUrl: "https://www.hilton.com/en/hotels/naphitgi-hilton-naples/",
    },
    {
      id: "naples-courtyard",
      chain: "marriott",
      name: "Courtyard Naples",
      lat: 40.8531,
      lng: 14.2689,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/napcy-courtyard-naples/overview/",
    },
  ],
  transit: [
    {
      id: "nap-centrale",
      name: "Napoli Centrale (rail)",
      mode: "rail",
      lat: 40.8528,
      lng: 14.2731,
    },
    {
      id: "nap-municipio",
      name: "Municipio (Metro L1)",
      mode: "rail",
      lat: 40.8425,
      lng: 14.254,
    },
  ],
  touristAnchors: [
    {
      id: "nap-historic",
      label: "Historic center / waterfront",
      lat: 40.8431,
      lng: 14.2486,
    },
  ],
};
