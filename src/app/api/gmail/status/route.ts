import { NextResponse } from "next/server";
import { resolveAuthenticatedUserId } from "@/lib/admin/adminAccess";
import { disconnectGmail, getGmailConnectionStatus } from "@/lib/travelAssistant/gmailOAuthService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getGmailConnectionStatus(userId);
  return NextResponse.json(status);
}

export async function DELETE() {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await disconnectGmail(userId);
  return NextResponse.json({ ok: true });
}
