import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY ||
  process.env.MAPTILER_KEY ||
  process.env.NEXT_PUBLIC_MAPLIBRE_KEY ||
  process.env.MAPTILER_API_KEY ||
  "";

// Proxy MapTiler requests so the API key never leaves the server.
// MapLibre style URLs are rewritten client-side to route through here.
// Usage: /api/maptiles?url=https://api.maptiler.com/tiles/v3/4/3/7.pbf
export async function GET(req: Request): Promise<Response> {
  // Auth gate — only signed-in users can use the proxy
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Only proxy to MapTiler
  if (target.hostname !== "api.maptiler.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Inject API key server-side — strip any client-supplied key first
  target.searchParams.delete("key");
  target.searchParams.set("key", MAPTILER_KEY);

  const upstream = await fetch(target.toString(), {
    headers: {
      "Accept": req.headers.get("Accept") ?? "*/*",
    },
  });

  if (!upstream.ok) {
    return new Response(`Upstream ${upstream.status}`, { status: upstream.status });
  }

  const ct = upstream.headers.get("content-type") ?? "application/octet-stream";
  const body = await upstream.arrayBuffer();

  // Tiles are immutable per zoom/x/y — cache aggressively
  const isPbf = ct.includes("pbf") || target.pathname.endsWith(".pbf");
  const cacheControl = isPbf
    ? "public, max-age=86400, stale-while-revalidate=604800"
    : "public, max-age=3600";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
