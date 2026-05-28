"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/maplibreCspWorker";
import { useEffect, useRef, useCallback, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

interface LocationPoint {
  lat: number;
  lon: number;
  updatedAt: string;
  memberId: string;
  label?: string;
  accuracy?: number;
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

export function FamilyMap({ members, locations, maptilerKey, onMemberClick }: FamilyMapProps) {
  const inlineEl = useRef<HTMLDivElement>(null);
  const fullscreenEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [satellite, setSatellite] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const createPinEl = useCallback((member: FamilyMember, loc: LocationPoint): HTMLElement => {
    const stale = isStale(loc.updatedAt);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;";

    const avatar = document.createElement("div");
    avatar.style.cssText = `
      width:48px;height:48px;border-radius:50%;
      background:${stale ? "#64748b" : member.color};
      border:3px solid white;
      box-shadow:0 2px 12px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;font-weight:800;color:white;
      font-family:system-ui,sans-serif;position:relative;
    `;
    avatar.textContent = member.name.charAt(0).toUpperCase();

    if (!stale) {
      const ring = document.createElement("div");
      ring.style.cssText = `
        position:absolute;inset:-5px;border-radius:50%;
        border:2.5px solid ${member.color};
        animation:kepi-pulse 2s ease-out infinite;
      `;
      avatar.appendChild(ring);
    }

    const tail = document.createElement("div");
    tail.style.cssText = `width:3px;height:8px;background:${stale ? "#64748b" : member.color};border-radius:0 0 2px 2px;`;

    const label = document.createElement("div");
    label.style.cssText = `
      background:white;border-radius:8px;padding:2px 7px;
      font-size:11px;font-weight:700;color:#0f172a;
      box-shadow:0 1px 5px rgba(0,0,0,0.15);
      white-space:nowrap;max-width:80px;overflow:hidden;text-overflow:ellipsis;
    `;
    label.textContent = member.name;

    wrapper.appendChild(avatar);
    wrapper.appendChild(tail);
    wrapper.appendChild(label);

    wrapper.addEventListener("click", () => {
      setSelected(prev => prev === member.id ? null : member.id);
      onMemberClick?.(member.id);
    });

    return wrapper;
  }, [onMemberClick]);

  const syncMarkers = useCallback(async (map: MapLibreMap) => {
    const maplibre = await import("maplibre-gl");
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
    members.forEach(member => {
      const loc = locations[member.id];
      if (!loc) return;
      const el = createPinEl(member, loc);
      const marker = new maplibre.Marker({ element: el, anchor: "bottom" })
        .setLngLat([loc.lon, loc.lat])
        .addTo(map);
      markersRef.current.set(member.id, marker);
    });
  }, [members, locations, createPinEl]);

  // Init map into inline container
  useEffect(() => {
    if (!inlineEl.current || mapRef.current || !maptilerKey) return;
    let destroyed = false;
    void (async () => {
      const maplibre = await import("maplibre-gl");
      if (destroyed || !inlineEl.current) return;

      const knownLocs = members.map(m => locations[m.id]).filter(Boolean);
      const center: [number, number] = knownLocs.length > 0
        ? [
            knownLocs.reduce((s, l) => s + l.lon, 0) / knownLocs.length,
            knownLocs.reduce((s, l) => s + l.lat, 0) / knownLocs.length,
          ]
        : [-118.2437, 34.0522];
      const zoom = knownLocs.length === 1 ? 14 : knownLocs.length > 1 ? 10 : 4;

      const map = new maplibre.Map({
        container: inlineEl.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(maptilerKey)}`,
        center,
        zoom,
        attributionControl: false,
      });

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");
      map.on("load", () => { setMapReady(true); void syncMarkers(map); });
      mapRef.current = map;
    })();

    return () => {
      destroyed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maptilerKey]);

  // When entering fullscreen: move map canvas into fullscreen container
  // When leaving: move it back to inline container
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const canvas = map.getCanvas().parentElement; // the maplibre container div
    if (!canvas) return;

    if (fullscreen && fullscreenEl.current) {
      fullscreenEl.current.appendChild(canvas);
      map.resize();
    } else if (!fullscreen && inlineEl.current) {
      inlineEl.current.appendChild(canvas);
      map.resize();
    }
  }, [fullscreen]);

  // Update markers on data change
  useEffect(() => {
    if (mapReady && mapRef.current) void syncMarkers(mapRef.current);
  }, [syncMarkers, mapReady]);

  // Satellite toggle
  useEffect(() => {
    if (!mapRef.current || !maptilerKey) return;
    const style = satellite
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(maptilerKey)}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(maptilerKey)}`;
    mapRef.current.setStyle(style);
    mapRef.current.once("styledata", () => {
      if (mapRef.current) void syncMarkers(mapRef.current);
    });
  }, [satellite, maptilerKey, syncMarkers]);

  const fitBounds = useCallback(() => {
    if (!mapRef.current) return;
    const locs = members.map(m => locations[m.id]).filter(Boolean);
    if (locs.length === 0) return;
    if (locs.length === 1) {
      mapRef.current.flyTo({ center: [locs[0].lon, locs[0].lat], zoom: 14, duration: 800 });
      return;
    }
    import("maplibre-gl").then(({ LngLatBounds }) => {
      const bounds = new LngLatBounds();
      locs.forEach(l => bounds.extend([l.lon, l.lat]));
      mapRef.current?.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 });
    }).catch(() => null);
  }, [members, locations]);

  const selectedMember = selected ? members.find(m => m.id === selected) : null;
  const selectedLoc = selected ? locations[selected] : null;

  const Controls = () => (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setSatellite(v => !v)}
        className={`rounded-xl px-3 py-1.5 text-xs font-bold shadow-md transition ${
          satellite ? "bg-sky-600 text-white" : "bg-white text-slate-700"
        }`}
      >
        {satellite ? "🛰 Satellite" : "🗺 Streets"}
      </button>
      {Object.keys(locations).length > 0 && (
        <button
          type="button"
          onClick={fitBounds}
          className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-md"
        >
          👁 Fit all
        </button>
      )}
      <button
        type="button"
        onClick={() => setFullscreen(v => !v)}
        className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-md"
      >
        {fullscreen ? "✕ Close" : "⛶ Expand"}
      </button>
    </div>
  );

  const MemberCard = () => selectedMember && selectedLoc ? (
    <div className="rounded-2xl bg-white shadow-xl p-3 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: selectedMember.color }}
        >
          {selectedMember.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{selectedMember.name}</p>
          <p className="text-xs text-slate-500">
            {isStale(selectedLoc.updatedAt)
              ? `⚠ ${timeAgo(selectedLoc.updatedAt)} — may be outdated`
              : `🟢 Live · ${timeAgo(selectedLoc.updatedAt)}`}
          </p>
        </div>
        <button type="button" onClick={() => setSelected(null)} className="ml-auto text-slate-400 shrink-0 text-lg leading-none">✕</button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <style>{`
        @keyframes kepi-pulse {
          0% { transform:scale(0.9); opacity:0.7; }
          100% { transform:scale(1.8); opacity:0; }
        }
      `}</style>

      {/* Inline map (always rendered so map canvas exists) */}
      <div className={`relative ${fullscreen ? "hidden" : "block"}`}>
        <div
          ref={inlineEl}
          className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
          style={{ height: 300 }}
        />
        {/* Inline controls */}
        <div className="absolute top-3 left-3 z-10">
          <Controls />
        </div>
        {selectedMember && selectedLoc && (
          <div className="absolute bottom-3 left-3 right-14 z-10">
            <MemberCard />
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div
            ref={fullscreenEl}
            className="absolute inset-0"
            style={{ width: "100dvw", height: "100dvh" }}
          />
          {/* Fullscreen controls — always on top */}
          <div className="absolute top-4 left-4 z-[10000]">
            <Controls />
          </div>
          {selectedMember && selectedLoc && (
            <div className="absolute bottom-4 left-4 right-4 z-[10000]">
              <MemberCard />
            </div>
          )}
        </div>
      )}
    </>
  );
}
