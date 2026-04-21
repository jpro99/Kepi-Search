import { Suspense } from "react";
import { HomeMapLoader } from "./HomeMapLoader";

/** Needed so client hooks like `useSearchParams()` resolve instead of hanging on a static shell. */
export const dynamic = "force-dynamic";

export default function Home() {
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "";
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-slate-950 text-cyan-300">
          <p className="text-sm font-medium">Starting Kepi Search…</p>
        </div>
      }
    >
      <HomeMapLoader maptilerKey={maptilerKey} />
    </Suspense>
  );
}
