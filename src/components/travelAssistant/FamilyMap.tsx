"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useCallback } from "react";

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
  onMemberClick?: (memberId: string) => void;
}

function isStale(iso: string): boolean {
  return Date.now() - Date.parse(iso) > 10 * 60_000;
}

export function FamilyMap({ members, locations, maptilerKey, onMemberClick }: FamilyMapProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());

  const initMap = useCallback(async () => {
    if (!mapEl.current || mapRef.current || !maptilerKey) return;
    const maplibre = await import("maplibre-gl");
    // Find center — average of all known locations or default world view
    const knownLocs = members.map(m => locations[m.id]).filter(Boolean);
    const center: [number, number] = knownLocs.length > 0
      ? [
          knownLocs.reduce((s, l) => s + l.lon, 0) / knownLocs.length,
          knownLocs.reduce((s, l) => s + l.lat, 0) / knownLocs.length,
        ]
      : [0, 20];
    const zoom = knownLocs.length > 0 ? 11 : 1;

    const map = new maplibre.default.Map({
      container: mapEl.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(maptilerKey)}`,
      center,
      zoom,
    });

    map.addControl(new maplibre.default.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      updateMarkers(map, maplibre.default, members, locations, onMemberClick);
    });
  }, [members, locations, maptilerKey, onMemberClick]);

  function updateMarkers(
    map: unknown,
    maplibre: { Marker: new (opts: unknown) => { setLngLat: (c: [number,number]) => unknown; addTo: (m: unknown) => unknown; remove: () => void; getElement: () => HTMLElement } },
    members: FamilyMember[],
    locations: Record<string, LocationPoint>,
    onMemberClick?: (id: string) => void
  ) {
    // Remove old markers
    markersRef.current.forEach((marker) => {
      (marker as { remove: () => void }).remove();
    });
    markersRef.current.clear();

    members.forEach(member => {
      const loc = locations[member.id];
      if (!loc) return;

      const stale = isStale(loc.updatedAt);

      // Create custom marker element
      const el = document.createElement("div");
      el.style.cssText = `
        width: 44px; height: 52px; cursor: pointer;
        display: flex; flex-direction: column; align-items: center;
      `;

      // Pin head
      const pin = document.createElement("div");
      pin.style.cssText = `
        width: 40px; height: 40px; border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg); background: ${stale ? "#94a3b8" : member.color};
        border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        position: relative;
      `;

      // Initial inside pin
      const initial = document.createElement("div");
      initial.style.cssText = `
        transform: rotate(45deg); color: white; font-weight: 800;
        font-size: 14px; font-family: system-ui, sans-serif;
      `;
      initial.textContent = member.name.charAt(0).toUpperCase();
      pin.appendChild(initial);

      // Pulse ring for fresh location
      if (!stale) {
        const pulse = document.createElement("div");
        pulse.style.cssText = `
          position: absolute; inset: -6px; border-radius: 50%;
          border: 2px solid ${member.color}; opacity: 0.5;
          animation: pulse-ring 2s ease-out infinite;
        `;
        pin.appendChild(pulse);
      }

      el.appendChild(pin);

      // Name label
      const label = document.createElement("div");
      label.style.cssText = `
        background: white; border-radius: 4px; padding: 2px 6px;
        font-size: 11px; font-weight: 700; color: #0f172a;
        box-shadow: 0 1px 4px rgba(0,0,0,0.2); margin-top: 2px;
        white-space: nowrap; max-width: 80px; overflow: hidden;
        text-overflow: ellipsis;
      `;
      label.textContent = member.name;
      el.appendChild(label);

      if (onMemberClick) {
        el.addEventListener("click", () => onMemberClick(member.id));
      }

      const marker = new maplibre.Marker({ element: el, anchor: "bottom" })
        .setLngLat([loc.lon, loc.lat])
        .addTo(map as Parameters<typeof marker.addTo>[0]);

      markersRef.current.set(member.id, marker);
    });
  }

  // Init map on mount
  useEffect(() => {
    void initMap();
    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current) return;
    import("maplibre-gl").then((maplibre: typeof import("maplibre-gl")) => {
      updateMarkers(
        mapRef.current!,
        maplibre.default as Parameters<typeof updateMarkers>[1],
        members,
        locations,
        onMemberClick
      );
    }).catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, members]);

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
      <div
        ref={mapEl}
        className="h-64 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
        style={{ minHeight: 260 }}
      />
    </>
  );
}
