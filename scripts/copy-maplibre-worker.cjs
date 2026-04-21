"use strict";

const fs = require("node:fs");
const path = require("node:path");

const src = path.join(
  __dirname,
  "../node_modules/maplibre-gl/dist/maplibre-gl-csp-worker.js",
);
const destDir = path.join(__dirname, "../public");
const dest = path.join(destDir, "maplibre-gl-csp-worker.js");

if (!fs.existsSync(src)) {
  console.error("copy-maplibre-worker: missing", src);
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("copy-maplibre-worker: copied to public/maplibre-gl-csp-worker.js");
