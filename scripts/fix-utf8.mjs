import fs from "node:fs";
import path from "node:path";

const paths = [
  "src/components/venice/VeniceMapClient.tsx",
  "src/data/cities/registry.ts",
  "src/data/cities/new-york.ts",
  "src/data/cities/los-angeles.ts",
  "src/data/cities/chicago.ts",
  "src/lib/session/serializeArea.ts",
  "src/lib/session/searchSession.ts",
  "scripts/fetch-hotels-overpass.mjs",
];

function looksUtf16Le(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return true;
  const n = Math.min(64, buf.length);
  let z = 0;
  let pairs = 0;
  for (let i = 1; i < n; i += 2) {
    pairs++;
    if (buf[i] === 0) z++;
  }
  return pairs >= 4 && z / pairs > 0.7;
}

function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (looksUtf16Le(buf)) return buf.toString("utf16le");
  return buf.toString("utf8");
}

const root = path.join(import.meta.dirname, "..");
for (const rel of paths) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const buf = fs.readFileSync(p);
  if (looksUtf16Le(buf) || (buf[0] === 0xff && buf[1] === 0xfe)) {
    fs.writeFileSync(p, decode(buf), "utf8");
    console.log("utf8", rel);
  }
}
