import { NextResponse } from "next/server";
import {
  defaultCityId,
  listCitySummariesWithRegion,
} from "@/data/cities/registry";

export async function GET() {
  return NextResponse.json({
    cities: listCitySummariesWithRegion(),
    defaultCityId,
  });
}
