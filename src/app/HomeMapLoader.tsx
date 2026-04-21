"use client";

import VeniceMapClient from "@/components/venice/VeniceMapClient";

export function HomeMapLoader({ maptilerKey }: { maptilerKey: string }) {
  return <VeniceMapClient maptilerKey={maptilerKey} />;
}
