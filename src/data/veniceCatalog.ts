import type { HotelRecord, TouristAnchor, TransitStop } from "@/lib/search/types";

export const VENICE_HOTELS: HotelRecord[] = [
  {
    id: "marriott-gritti",
    chain: "marriott",
    name: "The Gritti Palace, a Luxury Collection Hotel, Venice",
    lat: 45.43162,
    lng: 12.33738,
    bookUrl: "https://www.marriott.com/en-us/hotels/vcegl-the-gritti-palace-a-luxury-collection-hotel-venice/overview/",
  },
  {
    id: "marriott-danieli",
    chain: "marriott",
    name: "Hotel Danieli, a Luxury Collection Hotel, Venice",
    lat: 45.43338,
    lng: 12.34252,
    bookUrl: "https://www.marriott.com/en-us/hotels/vcedes-hotel-danieli-a-luxury-collection-hotel-venice/overview/",
  },
  {
    id: "marriott-st-regis",
    chain: "marriott",
    name: "The St. Regis Venice",
    lat: 45.43125,
    lng: 12.33485,
    bookUrl: "https://www.marriott.com/en-us/hotels/vcexr-the-st-regis-venice/overview/",
  },
  {
    id: "marriott-jw-isola",
    chain: "marriott",
    name: "JW Marriott Venice Resort and Spa",
    lat: 45.41425,
    lng: 12.34885,
    bookUrl: "https://www.marriott.com/en-us/hotels/vcejw-jw-marriott-venice-resort-and-spa/overview/",
  },
  {
    id: "hilton-molino",
    chain: "hilton",
    name: "Hilton Molino Stucky Venice",
    lat: 45.42565,
    lng: 12.32185,
    bookUrl: "https://www.hilton.com/en/hotels/vcehihi-hilton-molino-stucky-venice/",
  },
  {
    id: "hyatt-centric-murano",
    chain: "hyatt",
    name: "Hyatt Centric Murano Venice",
    lat: 45.45785,
    lng: 12.35625,
    bookUrl: "https://www.hyatt.com/en-US/hotel/italy/hyatt-centric-murano-venice/vcexc",
  },
];

export const VENICE_TRANSIT: TransitStop[] = [
  { id: "sm-sz", name: "San Marco Giardinetti (vaporetto)", mode: "vaporetto", lat: 45.43355, lng: 12.34645 },
  { id: "rialto", name: "Rialto (vaporetto)", mode: "vaporetto", lat: 45.43805, lng: 12.33585 },
  { id: "ferrovia", name: "Venezia Santa Lucia (rail)", mode: "rail", lat: 45.44145, lng: 12.32145 },
  { id: "tronchetto", name: "Tronchetto (people mover / bus)", mode: "people_mover", lat: 45.43755, lng: 12.30565 },
  { id: "zattere", name: "Zattere (vaporetto)", mode: "vaporetto", lat: 45.43105, lng: 12.32785 },
];

export const VENICE_TOURIST_ANCHORS: TouristAnchor[] = [
  { id: "san-marco", label: "Piazza San Marco area", lat: 45.43405, lng: 12.33815 },
];
