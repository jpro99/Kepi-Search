import { NextResponse } from "next/server";
import {
  defaultCityId,
  listCitySummariesWithRegion,
} from "@/data/cities/registry";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/utils/generateId";

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id")?.trim() || generateId();
  logger.withContext({ requestId, route: "/api/cities" }).info("Returning city catalog summaries.");
  return NextResponse.json({
    cities: listCitySummariesWithRegion(),
    defaultCityId,
  });
}
