import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { buildGmailAuthUrl } from "@/lib/travelAssistant/gmailOAuthService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeReturnTo(rawValue: string | null): string {
  if (!rawValue) {
    return "/travel-assistant?tab=more";
  }
  if (!rawValue.startsWith("/")) {
    return "/travel-assistant?tab=more";
  }
  return rawValue;
}

export async function GET(req: Request) {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(req.url);
  const returnTo = sanitizeReturnTo(requestUrl.searchParams.get("returnTo"));
  const authUrl = await buildGmailAuthUrl({
    userId,
    returnTo,
  });
  if (!authUrl) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI." },
      { status: 503 },
    );
  }

  return NextResponse.redirect(authUrl);
}
