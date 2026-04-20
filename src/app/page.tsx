"use client";

import dynamic from "next/dynamic";

const VeniceMapClient = dynamic(
  () => import("@/components/venice/VeniceMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-950 text-cyan-300">
        <p className="text-sm font-medium">Loading map...</p>
      </div>
    ),
  },
);

export default function Home() {
  return <VeniceMapClient />;
}
