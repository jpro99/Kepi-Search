import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mod = await import(
  pathToFileURL(path.join(__dirname, "data", "us-city-table.mjs")).href,
);
const out = path.join(__dirname, "data", "us-city-table.json");
fs.writeFileSync(out, JSON.stringify(mod.default));
console.log("Wrote", out, mod.default.length, "rows");
