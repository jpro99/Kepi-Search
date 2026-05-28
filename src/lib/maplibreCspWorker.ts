"use client";

import maplibregl from "maplibre-gl";

/**
 * By default, keep MapLibre's built-in blob worker URL for resilience.
 * This avoids a hard runtime dependency on /maplibre-gl-csp-worker.js.
 *
 * If a deployment needs a strict CSP worker path, opt in with:
 * NEXT_PUBLIC_MAPLIBRE_USE_CSP_WORKER=true
 */
if (typeof window !== "undefined") {
  if (process.env.NEXT_PUBLIC_MAPLIBRE_USE_CSP_WORKER === "true") {
    maplibregl.setWorkerUrl(
      `${window.location.origin}/maplibre-gl-csp-worker.js`,
    );
  }
}
