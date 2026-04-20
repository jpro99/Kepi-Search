import type { CityCatalog } from "@/data/cities/types";

export const milanCatalog: CityCatalog = {
  id: "milan",
  label: "Milan, Italy",
  map: {
    center: { lng: 9.19, lat: 45.4642 },
    zoom: 11.8,
    maxBounds: [
      [9.05, 45.38],
      [9.28, 45.52],
    ],
  },
  hotels: [
    {
      id: "milan-sheraton-diana",
      chain: "marriott",
      name: "Sheraton Diana Majestic, Milan",
      lat: 45.4771,
      lng: 9.2032,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/milbr-sheraton-diana-majestic-milan/overview/",
    },
    {
      id: "milan-hyatt-centric",
      chain: "hyatt",
      name: "Hyatt Centric Milan Centrale",
      lat: 45.4842,
      lng: 9.2044,
      bookUrl:
        "https://www.hyatt.com/en-US/hotel/italy/hyatt-centric-milan-centrale/milxc",
    },
    {
      id: "milan-hilton",
      chain: "hilton",
      name: "Hilton Milan",
      lat: 45.4781,
      lng: 9.1469,
      bookUrl: "https://www.hilton.com/en/hotels/milhitgi-hilton-milan/",
    },
  ],
  transit: [
    {
      id: "mil-centrale",
      name: "Milano Centrale (rail)",
      mode: "rail",
      lat: 45.4859,
      lng: 9.2037,
    },
    {
      id: "mil-duomo",
      name: "Duomo (M1/M3)",
      mode: "rail",
      lat: 45.4642,
      lng: 9.19,
    },
    {
      id: "mil-garibaldi",
      name: "Milano Porta Garibaldi (rail)",
      mode: "rail",
      lat: 45.4847,
      lng: 9.1874,
    },
  ],
  touristAnchors: [
    {
      id: "mil-duomo-anchor",
      label: "Duomo / Galleria core",
      lat: 45.4642,
      lng: 9.19,
    },
  ],
};
