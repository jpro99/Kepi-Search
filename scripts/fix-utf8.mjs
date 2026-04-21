import fs from "node:fs";
import path from "node:path";

const EXT = /\.(tsx?|jsx?|mjs|cjs|css)$/;

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

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, out);
    } else if (EXT.test(ent.name)) {
      out.push(p);
    }
  }
}

const root = path.join(import.meta.dirname, "..");
const files = [];
walk(path.join(root, "src"), files);
walk(path.join(root, "scripts"), files);

let fixed = 0;
for (const abs of files) {
  const buf = fs.readFileSync(abs);
  if (looksUtf16Le(buf) || (buf[0] === 0xff && buf[1] === 0xfe)) {
    const text = decode(buf).replace(/\r\n/g, "\n");
    fs.writeFileSync(abs, text, "utf8");
    console.log("utf8", path.relative(root, abs));
    fixed++;
  }
}
if (fixed === 0) {
  console.log("fix-utf8: no UTF-16 sources found");
}
