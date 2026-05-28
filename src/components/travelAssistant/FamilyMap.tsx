"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreCspWorker";
import { useEffect, useRef, useCallback, useState } from "react";

interface LocationPoint {
  lat: number;
  lon: number;
  updatedAt: string;
  memberId: string;
  label?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  color: string;
  sharingEnabled: boolean;
}

interface FamilyMapProps {
  members: FamilyMember[];
  locations: Record<string, LocationPoint>;
  maptilerKey: string;
  height?: number;
  onMemberClick?: (memberId: string) => void;
}

function isStale(iso: string): boolean {
  return Date.now() - Date.parse(iso) > 10 * 60_000;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export function FamilyMap({ members, locations, maptilerKey, height = 300, onMemberClick }: FamilyMapProps) {
  const FALLBACK_STYLE_URL = "https://demotiles.maplibre.org/style.json";
  const MAP_LOAD_TIMEOUT_MS = 12_000;
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const fallbackAppliedRef = useRef(false);
  const [satellite, setSatellite] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapWarning, setMapWarning] = useState<string | null>(null);
  const [usingMaptilerStyle, setUsingMaptilerStyle] = useState(Boolean(maptilerKey));
  const [ready, setReady] = useState(false);

  const createPinEl = useCallback((member: FamilyMember, loc: LocationPoint): HTMLElement => {
    const stale = isStale(loc.updatedAt);
    const wrap = document.createElement("div");
    wrap.style.cssText = "cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;";

    const av = document.createElement("div");
    av.style.cssText = `width:46px;height:46px;border-radius:50%;background:${stale ? "#64748b" : member.color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:white;font-family:system-ui,sans-serif;position:relative;`;
    av.textContent = member.name.charAt(0).toUpperCase();

    if (!stale) {
      const ring = document.createElement("div");
      ring.style.cssText = `position:absolute;inset:-6px;border-radius:50%;border:2px solid ${member.color};animation:kpulse 2s ease-out infinite;`;
      av.appendChild(ring);
    }

    const lbl = document.createElement("div");
    lbl.style.cssText = "background:white;border-radius:6px;padding:2px 7px;font-size:11px;font-weight:700;color:#0f172a;box-shadow:0 1px 4px rgba(0,0,0,0.15);white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;";
    lbl.textContent = member.name;

    wrap.appendChild(av);
    wrap.appendChild(lbl);
    wrap.addEventListener("click", () => {
      setSelected(p => p === member.id ? null : member.id);
      onMemberClick?.(member.id);
    });
    return wrap;
  }, [onMemberClick]);

  const syncMarkers = useCallback(async () => {
    if (!mapRef.current || !ready) return;
    const ml = await import("maplibre-gl");
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    members.forEach(member => {
      const loc = locations[member.id];
      if (!loc) return;
      const el = createPinEl(member, loc);
      const marker = new ml.Marker({ element: el, anchor: "bottom" })
        .setLngLat([loc.lon, loc.lat])
        .addTo(mapRef.current);
      markersRef.current.set(member.id, marker);
    });
  }, [members, locations, createPinEl, ready]);

  // Init map - single instance, never move it
  useEffect(() => {
    const el = mapEl.current;
    if (!el || mapRef.current) return;
    // Allow empty string key - just try and show error if it fails
    let cancelled = false;
    let loadTimeout: ReturnType<typeof window.setTimeout> | undefined;
    fallbackAppliedRef.current = false;
    setUsingMaptilerStyle(Boolean(maptilerKey));

    void (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !mapEl.current) return;

        const knownLocs = members
          .map((member) => locations[member.id])
          .filter((location): location is LocationPoint => Boolean(location));
        const center: [number, number] = knownLocs.length > 0
          ? [
              knownLocs.reduce((sum, location) => sum + location.lon, 0) / knownLocs.length,
              knownLocs.reduce((sum, location) => sum + location.lat, 0) / knownLocs.length,
            ]
          : [-118.2437, 34.0522];
        const zoom = knownLocs.length === 1 ? 14 : knownLocs.length > 1 ? 10 : 4;

        const styleUrl = maptilerKey
          ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(maptilerKey)}`
          : FALLBACK_STYLE_URL; // free fallback

        const map = new ml.Map({
          container: mapEl.current,
          style: styleUrl,
          center,
          zoom,
          attributionControl: false,
        });

        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new ml.AttributionControl({ compact: true }), "bottom-right");

        map.on("load", () => {
          if (!cancelled) {
            window.clearTimeout(loadTimeout);
            setReady(true);
            setMapError(null);
          }
        });

        map.on("error", (event: unknown) => {
          const eventRecord = event && typeof event === "object" ? (event as Record<string, unknown>) : null;
          const nestedError =
            eventRecord?.error && typeof eventRecord.error === "object"
              ? (eventRecord.error as Record<string, unknown>)
              : null;
          const msg = String(nestedError?.message ?? eventRecord?.message ?? "");
          const status = Number(nestedError?.status ?? 0);
          const maptilerFailure =
            maptilerKey.length > 0 &&
            (status === 401 ||
              status === 403 ||
              msg.includes("401") ||
              msg.includes("403") ||
              msg.includes("Unauthorized") ||
              msg.toLowerCase().includes("maptiler"));
          if (maptilerFailure && !fallbackAppliedRef.current) {
            fallbackAppliedRef.current = true;
            setUsingMaptilerStyle(false);
            setMapWarning("MapTiler tiles unavailable — showing fallback map style.");
            setMapError(null);
            map.setStyle(FALLBACK_STYLE_URL);
            return;
          }
          if (!cancelled && msg) {
            setMapError(`Map tiles failed to load: ${msg}`);
          }
        });

        loadTimeout = window.setTimeout(() => {
          if (cancelled || map.loaded()) return;
          if (maptilerKey.length > 0 && !fallbackAppliedRef.current) {
            fallbackAppliedRef.current = true;
            setUsingMaptilerStyle(false);
            setMapWarning("Map startup stalled — switching to fallback map style.");
            setMapError(null);
            map.setStyle(FALLBACK_STYLE_URL);
            return;
          }
          setMapError(
            "Map is taking too long to load. Verify network access to map tiles and refresh.",
          );
        }, MAP_LOAD_TIMEOUT_MS);

        mapRef.current = map;
      } catch (err) {
        setMapError(`Map init failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();

    return () => {
      cancelled = true;
      if (loadTimeout !== undefined) {
        window.clearTimeout(loadTimeout);
      }
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [FALLBACK_STYLE_URL, maptilerKey]); // init once per mount/config

  // Sync markers after load and when locations change
  useEffect(() => { void syncMarkers(); }, [syncMarkers]);

  // Satellite
  useEffect(() => {
    if (!mapRef.current || !maptilerKey || !ready || !usingMaptilerStyle) return;
    const style = satellite
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(maptilerKey)}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(maptilerKey)}`;
    mapRef.current.setStyle(style);
    mapRef.current.once("styledata", () => {
      setMapWarning(null);
      void syncMarkers();
    });
  }, [satellite, maptilerKey, syncMarkers, ready, usingMaptilerStyle]);

  // Resize when fullscreen changes
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 80);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const fitAll = useCallback(() => {
    if (!mapRef.current) return;
    const locs = members.map(m => locations[m.id]).filter(Boolean) as LocationPoint[];
    if (locs.length === 0) return;
    if (locs.length === 1) { mapRef.current.flyTo({ center: [locs[0].lon, locs[0].lat], zoom: 14 }); return; }
    import("maplibre-gl").then(({ LngLatBounds }) => {
      const b = new LngLatBounds();
      locs.forEach(l => b.extend([l.lon, l.lat]));
      mapRef.current?.fitBounds(b, { padding: 60, maxZoom: 14 });
    }).catch(() => null);
  }, [members, locations]);

  const selMember = selected ? members.find(m => m.id === selected) : null;
  const selLoc = selected ? locations[selected] : null;

  const mapH = fullscreen ? "100dvh" : height;

  return (
    <>
      <style>{`@keyframes kpulse{0%{transform:scale(0.9);opacity:0.7}100%{transform:scale(1.9);opacity:0}}`}</style>

      {/* Single map container - changes height for fullscreen */}
      <div
        className={fullscreen ? "fixed inset-0 z-[9000]" : "relative w-full"}
        style={{ height: mapH }}
      >
        {/* The actual map div */}
        <div
          ref={mapEl}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Error overlay */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 p-4 text-center z-10">
            <p className="text-xs text-red-300 max-w-xs">{mapError}</p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          {maptilerKey && usingMaptilerStyle && (
            <button
              type="button"
              onClick={() => setSatellite(v => !v)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold shadow-md ${satellite ? "bg-sky-600 text-white" : "bg-white text-slate-800"}`}
            >
              {satellite ? "🛰 Satellite" : "🗺 Streets"}
            </button>
          )}
          {Object.keys(locations).length > 0 && (
            <button type="button" onClick={fitAll} className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
              👁 Fit all
            </button>
          )}
          <button
            type="button"
            onClick={() => setFullscreen(v => !v)}
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md"
          >
            {fullscreen ? "✕ Close" : "⛶ Expand"}
          </button>
        </div>
        {mapWarning ? (
          <div className="absolute right-3 top-3 z-10 max-w-[230px] rounded-lg bg-amber-500/90 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950 shadow-md">
            {mapWarning}
          </div>
        ) : null}

        {/* Selected member card */}
        {selMember && selLoc && (
          <div className="absolute bottom-3 left-3 right-14 z-10 rounded-2xl bg-white p-3 shadow-xl dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: selMember.color }}>
                {selMember.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selMember.name}</p>
                <p className="text-xs text-slate-500">
                  {isStale(selLoc.updatedAt) ? `⚠ ${timeAgo(selLoc.updatedAt)} — may be outdated` : `🟢 Live · ${timeAgo(selLoc.updatedAt)}`}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="ml-auto shrink-0 text-slate-400 text-lg">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Spacer so page doesn't collapse when fullscreen */}
      {fullscreen && <div style={{ height: 300 }} />}
    </>
  );
}
