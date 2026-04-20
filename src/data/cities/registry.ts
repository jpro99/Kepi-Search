import type { CityCatalog } from "@/data/cities/types";
import citySeedsJson from "@/data/city-seeds.json";
import { berlinCatalog } from "@/data/cities/berlin";
import { bolognaCatalog } from "@/data/cities/bologna";
import { chicagoCatalog } from "@/data/cities/chicago";
import { cologneCatalog } from "@/data/cities/cologne";
import { florenceCatalog } from "@/data/cities/florence";
import { frankfurtCatalog } from "@/data/cities/frankfurt";
import { hamburgCatalog } from "@/data/cities/hamburg";
import { londonCatalog } from "@/data/cities/london";
import { losAngelesCatalog } from "@/data/cities/los-angeles";
import { milanCatalog } from "@/data/cities/milan";
import { newYorkCatalog } from "@/data/cities/new-york";
import { munichCatalog } from "@/data/cities/munich";
import { naplesCatalog } from "@/data/cities/naples";
import { romeCatalog } from "@/data/cities/rome";
import { turinCatalog } from "@/data/cities/turin";
import { veniceCatalog } from "@/data/cities/venice";
import type { CitySeedJson } from "@/lib/cities/seedToCatalog";
import { seedsFileToCatalogs } from "@/lib/cities/seedToCatalog";

/** Bulk coverage from `city-seeds.json` (regenerate: `npm run seed:generate`). */
const seededCatalogs = seedsFileToCatalogs(
  citySeedsJson as unknown as { cities: CitySeedJson[] },
);

/**
 * Hand-curated catalogs override seeds for the same `id` (richer hotels / links).
 */
export const cityCatalogs: Record<string, CityCatalog> = {
  ...seededCatalogs,
  venice: veniceCatalog,
  london: londonCatalog,
  rome: romeCatalog,
  florence: florenceCatalog,
  milan: milanCatalog,
  naples: naplesCatalog,
  bologna: bolognaCatalog,
  turin: turinCatalog,
  berlin: berlinCatalog,
  munich: munichCatalog,
  hamburg: hamburgCatalog,
  frankfurt: frankfurtCatalog,
  cologne: cologneCatalog,
  "new-york": newYorkCatalog,
  "los-angeles": losAngelesCatalog,
  chicago: chicagoCatalog,
};

export const defaultCityId = "venice";

export function getCityCatalog(id: string): CityCatalog | undefined {
  return cityCatalogs[id];
}

export function listCitySummaries() {
  return Object.values(cityCatalogs)
    .map((c) => ({ id: c.id, label: c.label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}

/** Lightweight list for client search (no full hotel payloads). */
export function listCitySummariesWithRegion() {
  return Object.values(cityCatalogs)
    .map((c) => ({
      id: c.id,
      label: c.label,
      region: cityRegion(c),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}

export type CityRegion =
  | "Italy"
  | "Germany"
  | "United Kingdom"
  | "United States"
  | "Europe"
  | "Asia Pacific";

export function cityRegion(catalog: CityCatalog): CityRegion {
  const l = catalog.label;
  if (l.endsWith("Italy")) return "Italy";
  if (l.endsWith("Germany")) return "Germany";
  if (l.endsWith("United Kingdom")) return "United Kingdom";
  if (l.endsWith("United States")) return "United States";
  if (
    l.endsWith("Japan") ||
    l.endsWith("South Korea") ||
    l.endsWith("Philippines") ||
    l.endsWith("Vietnam") ||
    l.endsWith("Thailand") ||
    l.endsWith("Australia") ||
    l.endsWith("New Zealand")
  ) {
    return "Asia Pacific";
  }
  return "Europe";
}

export function listCitySummariesGrouped(): {
  region: CityRegion;
  cities: { id: string; label: string }[];
}[] {
  const byRegion: Record<CityRegion, { id: string; label: string }[]> = {
    Italy: [],
    Germany: [],
    "United Kingdom": [],
    "United States": [],
    Europe: [],
    "Asia Pacific": [],
  };
  for (const c of Object.values(cityCatalogs)) {
    const region = cityRegion(c);
    byRegion[region].push({ id: c.id, label: c.label });
  }
  (Object.keys(byRegion) as CityRegion[]).forEach((r) => {
    byRegion[r].sort((a, b) => a.label.localeCompare(b.label, "en"));
  });
  return [
    { region: "Italy", cities: byRegion.Italy },
    { region: "Germany", cities: byRegion.Germany },
    { region: "United Kingdom", cities: byRegion["United Kingdom"] },
    { region: "United States", cities: byRegion["United States"] },
    { region: "Europe", cities: byRegion.Europe },
    { region: "Asia Pacific", cities: byRegion["Asia Pacific"] },
  ];
}
