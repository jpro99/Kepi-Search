import { NextResponse } from "next/server";
import { getCityCatalog } from "@/data/cities/registry";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/utils/generateId";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const requestId = _request.headers.get("x-request-id")?.trim() || generateId();
  const routeLogger = logger.withContext({ requestId, route: "/api/cities/[id]/meta" });
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const catalog = getCityCatalog(id);
  if (!catalog) {
    routeLogger.warn("Unknown city metadata request.", { cityId: id });
    return NextResponse.json({ error: "Unknown city" }, { status: 404 });
  }
  routeLogger.info("Returning city metadata.", { cityId: id });
  return NextResponse.json({
    id: catalog.id,
    label: catalog.label,
    map: catalog.map,
  });
}
