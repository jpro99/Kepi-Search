"use strict";

const fs = require("node:fs");
const path = require("node:path");

const distPath = path.join(
  __dirname,
  "../node_modules/maplibre-gl/dist/maplibre-gl.js",
);

const anchorOld =
  'e=this.getImage(r)),e?o[r]={data:e.data.clone(),pixelRatio:e.pixelRatio,sdf:e.sdf,version:e.version,stretchX:e.stretchX,stretchY:e.stretchY,content:e.content,textFitWidth:e.textFitWidth,textFitHeight:e.textFitHeight,hasRenderCallback:Boolean(null===(i=e.userImage)||void 0===i?void 0:i.render)}:t.w(`Image "${r}" could not be loaded.';

const anchorNew =
  'e=this.getImage(r)),(!r.length||!/[^\\s\\u00a0\\u200b-\\u200f\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]/.test(r))&&!e&&((function(){try{this.addImage(r,{data:new t.R({width:1,height:1},new Uint8Array(4)),pixelRatio:1,sdf:!1,version:0})}catch(t){}}.call(this)),e=this.getImage(r)),e?o[r]={data:e.data.clone(),pixelRatio:e.pixelRatio,sdf:e.sdf,version:e.version,stretchX:e.stretchX,stretchY:e.stretchY,content:e.content,textFitWidth:e.textFitWidth,textFitHeight:e.textFitHeight,hasRenderCallback:Boolean(null===(i=e.userImage)||void 0===i?void 0:i.render)}:t.w(`Image "${r}" could not be loaded.';

let s = fs.readFileSync(distPath, "utf8");

if (s.includes(anchorNew)) {
  console.log("patch-maplibre-dist: already applied");
  process.exit(0);
}
if (!s.includes(anchorOld)) {
  console.error(
    "patch-maplibre-dist: anchor not found (maplibre-gl dist layout changed?)",
  );
  process.exit(1);
}
s = s.replace(anchorOld, anchorNew);
fs.writeFileSync(distPath, s, "utf8");
console.log("patch-maplibre-dist: updated", distPath);
