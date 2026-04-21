"use client";

import maplibregl from "maplibre-gl";

let configured = false;

/**
 * MapLibre's default worker uses a `blob:` URL. Some browsers, extensions, and CSPs
 * block that, which yields a black map with no obvious console error. Loading the
 * official CSP worker from our own origin avoids that class of failure.
 */
export function configureMaplibreCspWorker(): void {
  if (typeof window === "undefined" || configured) return;
  configured = true;
  maplibregl.setWorkerUrl(
    `${window.location.origin}/maplibre-gl-csp-worker.js`,
  );
}
