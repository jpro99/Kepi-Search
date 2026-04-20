/**
 * Fetch hotel-like nodes/ways from OpenStreetMap via Overpass API.
 * Outputs JSON snippets you can merge into city seed `hotels` arrays or TS catalogs.
 *
 * Usage:
 *   node scripts/fetch-hotels-overpass.mjs <south> <west> <north> <east>
 * Example (Midtown Manhattan):
 *   node scripts/fetch-hotels-overpass.mjs 40.74 -74.00 40.77 -73.96
 *
 * Respect OSM usage policy: https://operations.osmfoundation.org/policies/overpass/
 */
const endpoint = "https://overpass-api.de/api/interpreter";

const [,, s, w, n, e] = process.argv;
const south = Number(s);
const west = Number(w);
const north = Number(n);
const east = Number(e);
if (![south, west, north, east].every(Number.isFinite)) {
  console.error(
    "Usage: node scripts/fetch-hotels-overpass.mjs <south> <west> <north> <east>",
  );
  process.exit(1);
}

const q = `
[out:json][timeout:60];
(
  node["tourism"="hotel"](${south},${west},${north},${east});
  way["tourism"="hotel"](${south},${west},${north},${east});
);
out center tags;
`;

const res = await fetch(endpoint, {
  method: "POST",
  body: `data=${encodeURIComponent(q)}`,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});
if (!res.ok) {
  console.error("Overpass HTTP", res.status);
  process.exit(1);
}
const data = await res.json();

const brand = (name = "") => {
  const t = name.toLowerCase();
  if (t.includes("marriott") || t.includes("westin") || t.includes("sheraton"))
    return "marriott";
  if (t.includes("hilton") || t.includes("conrad") || t.includes("waldorf"))
    return "hilton";
  if (t.includes("hyatt") || t.includes("andaz")) return "hyatt";
  return null;
};

const rows = [];
for (const el of data.elements ?? []) {
  const name = el.tags?.name;
  if (!name) continue;
  const chain = brand(name);
  if (!chain) continue;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const id = `${el.type}-${el.id}`.replace(/[^a-z0-9-]/gi, "-");
  rows.push({
    id: `osm-${id}`,
    chain,
    name,
    lat,
    lng: lon,
    bookUrl:
      chain === "marriott"
        ? `https://www.marriott.com/search/findHotels.mi?searchType=InCity&query=${encodeURIComponent(name)}`
        : chain === "hilton"
          ? `https://www.hilton.com/en/search/?query=${encodeURIComponent(name)}`
          : `https://www.hyatt.com/search?term=${encodeURIComponent(name)}`,
  });
}

console.log(JSON.stringify(rows, null, 2));
console.error(`Wrote ${rows.length} brand-matched hotels (inspect before committing).`);
