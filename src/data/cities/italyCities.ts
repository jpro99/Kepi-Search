import type { CityCatalog } from "@/data/cities/types";

/** Curated samples — verify coordinates and booking URLs before relying on them. */

export const romeCatalog: CityCatalog = {
  id: "rome",
  label: "Rome, Italy",
  map: {
    center: { lng: 12.4823, lat: 41.9028 },
    zoom: 11.5,
    maxBounds: [[12.35, 41.78], [12.65, 42.08]],
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
      bookUrl: "https://www.hilton.com/en/hotels/romwawa-rome-cavalieri-a-waldorf-astoria-hotel/",
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
    { id: "rome-center", label: "Historic center (Pantheon / Trevi area)", lat: 41.8992, lng: 12.4833 },
  ],
};

export const florenceCatalog: CityCatalog = {
  id: "florence",
  label: "Florence, Italy",
  map: {
    center: { lng: 11.2558, lat: 43.7696 },
    zoom: 12.5,
    maxBounds: [[11.18, 43.72], [11.35, 43.81]],
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
      bookUrl: "https://www.hilton.com/en/hotels/flrmetgi-hilton-florence-metropole/",
    },
  ],
  transit: [
    { id: "fl-smn", name: "Firenze Santa Maria Novella (rail)", mode: "rail", lat: 43.7766, lng: 11.2479 },
    { id: "fl-campo", name: "Piazza della Signoria area", mode: "rail", lat: 43.7696, lng: 11.2558 },
  ],
  touristAnchors: [
    { id: "fl-duomo", label: "Duomo / Piazza del Duomo", lat: 43.7731, lng: 11.256 },
  ],
};

export const milanCatalog: CityCatalog = {
  id: "milan",
  label: "Milan, Italy",
  map: {
    center: { lng: 9.19, lat: 45.4642 },
    zoom: 11.8,
    maxBounds: [[9.05, 45.38], [9.28, 45.52]],
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
      bookUrl: "https://www.hyatt.com/en-US/hotel/italy/hyatt-centric-milan-centrale/milxc",
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
    { id: "mil-centrale", name: "Milano Centrale (rail)", mode: "rail", lat: 45.4859, lng: 9.2037 },
    { id: "mil-duomo", name: "Duomo (M1/M3)", mode: "rail", lat: 45.4642, lng: 9.19 },
    { id: "mil-garibaldi", name: "Milano Porta Garibaldi (rail)", mode: "rail", lat: 45.4847, lng: 9.1874 },
  ],
  touristAnchors: [
    { id: "mil-duomo-anchor", label: "Duomo / Galleria core", lat: 45.4642, lng: 9.19 },
  ],
};

export const naplesCatalog: CityCatalog = {
  id: "naples",
  label: "Naples, Italy",
  map: {
    center: { lng: 14.2681, lat: 40.8518 },
    zoom: 12.2,
    maxBounds: [[14.12, 40.76], [14.38, 40.92]],
  },
  hotels: [
    {
      id: "naples-marriott-coast",
      chain: "marriott",
      name: "Naples Marriott Hotel (Coast)",
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
    { id: "nap-centrale", name: "Napoli Centrale (rail)", mode: "rail", lat: 40.8528, lng: 14.2731 },
    { id: "nap-municipio", name: "Municipio (Metro L1)", mode: "rail", lat: 40.8425, lng: 14.254 },
  ],
  touristAnchors: [
    { id: "nap-historic", label: "Historic center / waterfront", lat: 40.8431, lng: 14.2486 },
  ],
};

export const bolognaCatalog: CityCatalog = {
  id: "bologna",
  label: "Bologna, Italy",
  map: {
    center: { lng: 11.3426, lat: 44.4949 },
    zoom: 12.5,
    maxBounds: [[11.25, 44.42], [11.45, 44.56]],
  },
  hotels: [
    {
      id: "bologna-ac",
      chain: "marriott",
      name: "AC Hotel Bologna by Marriott",
      lat: 44.5142,
      lng: 11.3724,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/blqac-ac-hotel-bologna/overview/",
    },
    {
      id: "bologna-hilton-garden",
      chain: "hilton",
      name: "Hilton Garden Inn Bologna North",
      lat: 44.5511,
      lng: 11.3722,
      bookUrl:
        "https://www.hilton.com/en/hotels/blqbigi-hilton-garden-inn-bologna-north/",
    },
    {
      id: "bologna-courtyard",
      chain: "marriott",
      name: "Courtyard Bologna Airport",
      lat: 44.5269,
      lng: 11.2889,
      bookUrl:
        "https://www.marriott.com/en-us/hotels/blqcy-courtyard-bologna-airport/overview/",
    },
  ],
  transit: [
    { id: "blq-centrale", name: "Bologna Centrale (rail)", mode: "rail", lat: 44.5059, lng: 11.3434 },
    { id: "blq-airport", name: "Bologna Airport (BLQ)", mode: "rail", lat: 44.5294, lng: 11.293 },
  ],
  touristAnchors: [
    { id: "blq-piazza-maggiore", label: "Piazza Maggiore area", lat: 44.4938, lng: 11.3431 },
  ],
};

export const turinCatalog: CityCatalog = {
  id: "turin",
  label: "Turin, Italy",
  map: {
    center: { lng: 7.6869, lat: 45.0703 },
    zoom: 12,
    maxBounds: [[7.55, 44.95], [7.85, 45.15]],
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
      bookUrl: "https://www.hilton.com/en/hotels/trnhiti-hilton-turin-city-centre/",
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
    { id: "tur-porta-nuova", name: "Torino Porta Nuova (rail)", mode: "rail", lat: 45.0619, lng: 7.6787 },
    { id: "tur-re-united", name: "Re Umberto (Metro)", mode: "rail", lat: 45.0636, lng: 7.6765 },
  ],
  touristAnchors: [
    { id: "tur-mole", label: "Mole Antonelliana / centro", lat: 45.0689, lng: 7.6934 },
  ],
};
