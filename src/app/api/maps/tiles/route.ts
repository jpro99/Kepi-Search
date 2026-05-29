import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TileQuerySchema = z.object({
  style: z.enum(["streets-v2", "hybrid"]).default("streets-v2"),
  z: z.coerce.number().int().min(0).max(22),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
  scale: z.enum(["1", "2"]).default("1"),
  format: z.enum(["png", "jpg", "jpeg"]).optional(),
});

function resolveTileFormat(
  style: z.infer<typeof TileQuerySchema>["style"],
  format: z.infer<typeof TileQuerySchema>["format"],
): "png" | "jpg" | "jpeg" {
  if (format) {
    return format;
  }
  return style === "hybrid" ? "jpg" : "png";
}

export async function GET(request: Request) {
  const apiKey = process.env.MAPTILER_KEY?.trim();
  if (!apiKey) {
    return new NextResponse("Map tile proxy unavailable: MAPTILER_KEY is missing.", { status: 503 });
  }

  const url = new URL(request.url);
  const parsed = TileQuerySchema.safeParse({
    style: url.searchParams.get("style") ?? undefined,
    z: url.searchParams.get("z") ?? undefined,
    x: url.searchParams.get("x") ?? undefined,
    y: url.searchParams.get("y") ?? undefined,
    scale: url.searchParams.get("scale") ?? undefined,
    format: url.searchParams.get("format") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tile query." }, { status: 400 });
  }

  const { style, z, x, y, scale } = parsed.data;
  const maxTileIndex = 2 ** z - 1;
  if (x > maxTileIndex || y > maxTileIndex) {
    return new NextResponse("Tile index out of range for zoom level.", { status: 400 });
  }

  const format = resolveTileFormat(style, parsed.data.format);
  const hdSuffix = scale === "2" ? "@2x" : "";
  const upstreamUrl =
    `https://api.maptiler.com/maps/${style}/${z}/${x}/${y}${hdSuffix}.${format}?key=${encodeURIComponent(apiKey)}`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 3600 },
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*",
      },
    });
  } catch {
    return new NextResponse("Unable to reach map tile provider.", { status: 502 });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    const errorText = await upstreamResponse.text().catch(() => "Tile fetch failed.");
    return new NextResponse(errorText, {
      status: upstreamResponse.status || 502,
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    upstreamResponse.headers.get("content-type") ?? (format === "png" ? "image/png" : "image/jpeg"),
  );
  headers.set("cache-control", "public, s-maxage=3600, stale-while-revalidate=86400");
  headers.set("x-kepi-map-proxy", "maptiler");

  return new Response(upstreamResponse.body, {
    status: 200,
    headers,
  });
}
