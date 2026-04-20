import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Avoid stale HTML that still points at old hashed `_next/static/chunks/*` after deploys.
 * (Chunk names change when client bundles change; cached HTML keeps loading old chunks.)
 */
export function middleware(_request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  res.headers.set("Pragma", "no-cache");
  return res;
}

export const config = {
  matcher: ["/"],
};
