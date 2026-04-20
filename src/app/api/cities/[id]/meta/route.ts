import { NextResponse } from "next/server";
import { getCityCatalog } from "@/data/cities/registry";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw);
  const catalog = getCityCatalog(id);
  if (!catalog) {
    return NextResponse.json({ error: "Unknown city" }, { status: 404 });
  }
  return NextResponse.json({
    id: catalog.id,
    label: catalog.label,
    map: catalog.map,
  });
}
