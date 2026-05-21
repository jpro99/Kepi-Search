import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { finishGmailOAuth } from "@/lib/travelAssistant/gmailOAuthService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appendStatusParam(returnTo: string, status: "connected" | "error"): string {
  const separator = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${separator}gmail=${status}`;
}

export async function GET(req: Request) {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const state = requestUrl.searchParams.get("state")?.trim();
  if (!code || !state) {
    return NextResponse.redirect("/travel-assistant?tab=more&gmail=error");
  }

  const result = await finishGmailOAuth({
    userId,
    code,
    state,
  });
  if (!result.ok) {
    return NextResponse.redirect(appendStatusParam(result.returnTo, "error"));
  }
  return NextResponse.redirect(appendStatusParam(result.returnTo, "connected"));
}
