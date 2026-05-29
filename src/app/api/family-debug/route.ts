import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { kvStoreGet } from "@/lib/travelAssistant/kvStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAMILY_GROUPS_KEY = "family:groups:v2";
const FAMILY_MEMBERSHIP_KEY = "family:membership";
const FAMILY_INVITE_INDEX_KEY = (code: string) => `family:invite-index:${code}`;

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const [myGroups, myMembership] = await Promise.all([
    kvStoreGet(FAMILY_GROUPS_KEY, { userId }),
    kvStoreGet(FAMILY_MEMBERSHIP_KEY, { userId }),
  ]);

  const result: Record<string, unknown> = {
    userId,
    myGroups,
    myMembership,
  };

  if (code) {
    const inviteRaw = await kvStoreGet(FAMILY_INVITE_INDEX_KEY(code.toUpperCase()), { userId: "global" });
    result.inviteCode = code.toUpperCase();
    result.inviteIndexRaw = inviteRaw;
    result.inviteIndexType = typeof inviteRaw;

    if (inviteRaw && typeof inviteRaw === "object" && "ownerId" in (inviteRaw as object)) {
      const owner = inviteRaw as { ownerId: string; groupId?: string };
      const ownerGroups = await kvStoreGet(FAMILY_GROUPS_KEY, { userId: owner.ownerId });
      result.ownerGroups = ownerGroups;
      result.ownerUserId = owner.ownerId;
    }
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
