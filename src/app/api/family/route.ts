import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { kvStoreGet, kvStoreSet } from "@/lib/travelAssistant/kvStore";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/utils/generateId";
import { getResendClient, getResendFromEmail } from "@/lib/email/resendClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FAMILY_GROUP_KEY = "family:group";
const FAMILY_LOCATION_KEY = (memberId: string) => `family:location:${memberId}`;
const FAMILY_INVITE_INDEX_KEY = (inviteCode: string) => `family:invite-index:${inviteCode}`;
const FAMILY_MEMBERSHIP_KEY = "family:membership"; // stores { ownerId, inviteCode } for non-owner members
const FAMILY_GROUP_EMAIL_INVITES_KEY = "family:email-invites";
const FAMILY_EMAIL_INVITE_NAMESPACE = "family-email-invite-queue";
const FAMILY_EMAIL_INVITE_QUEUE_KEY = (email: string) => `family:email-invite:${email.trim().toLowerCase()}`;

const MemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  email: z.string().email().optional().nullable(),
  role: z.enum(["organizer", "adult", "teen", "child"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sharingEnabled: z.boolean().default(true),
  visibility: z.enum(["all-members", "organizer-only"]).default("all-members"),
  joinedAt: z.string(),
});

const FamilyGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  members: z.array(MemberSchema),
  inviteCode: z.string(),
  createdAt: z.string(),
});

const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  updatedAt: z.string(),
  memberId: z.string(),
  label: z.string().optional(),
});

const FamilyEmailInviteSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  inviteCode: z.string(),
  invitedEmail: z.string().email(),
  invitedName: z.string().nullable(),
  inviterName: z.string().nullable(),
  createdAt: z.string(),
  status: z.enum(["pending", "accepted", "declined", "cancelled"]),
  respondedAt: z.string().nullable(),
});

const MEMBER_COLORS = [
  "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

function nextColor(members: z.infer<typeof MemberSchema>[]): string {
  const used = new Set(members.map(m => m.color));
  return MEMBER_COLORS.find(c => !used.has(c)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length];
}

async function resolveUserPrimaryEmail(userId: string): Promise<string | null> {
  try {
    const clerkServer = await import("@clerk/nextjs/server");
    const client = await clerkServer.clerkClient();
    const user = await client.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const primaryAddress =
      user.emailAddresses.find((entry) => entry.id === primaryId) ?? user.emailAddresses[0] ?? null;
    const address = primaryAddress?.emailAddress?.trim();
    return address && address.length > 0 ? address.toLowerCase() : null;
  } catch (error) {
    logger.warn("Unable to resolve user email for family invite flow.", {
      scope: "api/family",
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/gu, "");
}

async function joinGroupByInviteCode(args: {
  userId: string;
  inviteCode: string;
  name?: string | null;
}): Promise<
  | { ok: true; group: z.infer<typeof FamilyGroupSchema>; alreadyMember?: boolean; joined?: boolean; ownerId: string; normalizedInviteCode: string }
  | { ok: false; status: number; error: string }
> {
  const normalizedInviteCode = normalizeInviteCode(args.inviteCode);
  if (!normalizedInviteCode) {
    return { ok: false, status: 400, error: "inviteCode required" };
  }

  const ownerUserId = await kvStoreGet<string>(FAMILY_INVITE_INDEX_KEY(normalizedInviteCode), { userId: args.userId });
  if (!ownerUserId) {
    return { ok: false, status: 404, error: "Invalid invite code. Ask the group organizer for the correct code." };
  }
  if (ownerUserId === args.userId) {
    return { ok: false, status: 400, error: "You created this group — you're already in it." };
  }

  const ownerGroup = await kvStoreGet<z.infer<typeof FamilyGroupSchema>>(FAMILY_GROUP_KEY, { userId: ownerUserId });
  if (!ownerGroup) {
    return { ok: false, status: 404, error: "Group not found." };
  }

  if (ownerGroup.members.some(m => m.id === args.userId)) {
    await kvStoreSet(FAMILY_MEMBERSHIP_KEY, { ownerId: ownerUserId, inviteCode: normalizedInviteCode }, { userId: args.userId });
    return { ok: true, group: ownerGroup, alreadyMember: true, ownerId: ownerUserId, normalizedInviteCode };
  }

  const newMember: z.infer<typeof MemberSchema> = {
    id: args.userId,
    name: args.name?.trim() || "Family Member",
    email: null,
    role: "adult",
    color: nextColor(ownerGroup.members),
    sharingEnabled: true,
    visibility: "all-members",
    joinedAt: new Date().toISOString(),
  };
  ownerGroup.members.push(newMember);
  await kvStoreSet(FAMILY_GROUP_KEY, ownerGroup, { userId: ownerUserId });
  await kvStoreSet(FAMILY_MEMBERSHIP_KEY, { ownerId: ownerUserId, inviteCode: normalizedInviteCode }, { userId: args.userId });

  logger.info("User joined family group.", { userId: args.userId, ownerId: ownerUserId });
  return { ok: true, group: ownerGroup, joined: true, ownerId: ownerUserId, normalizedInviteCode };
}

// GET - fetch group and all member locations
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUserEmail = await resolveUserPrimaryEmail(userId);
  const pendingEmailInvites = currentUserEmail
    ? (await kvStoreGet<Array<z.infer<typeof FamilyEmailInviteSchema>>>(FAMILY_EMAIL_INVITE_QUEUE_KEY(currentUserEmail), {
        userId: FAMILY_EMAIL_INVITE_NAMESPACE,
      })) ?? []
    : [];
  const activePendingEmailInvites = pendingEmailInvites.filter((invite) => invite.status === "pending");

  let group = await kvStoreGet<z.infer<typeof FamilyGroupSchema>>(FAMILY_GROUP_KEY, { userId });

  // Create default group if none exists
  if (!group) {
    group = {
      id: generateId(),
      name: "My Family",
      ownerId: userId,
      members: [{
        id: userId,
        name: "Me",
        email: null,
        role: "organizer",
        color: MEMBER_COLORS[0],
        sharingEnabled: true,
        visibility: "all-members",
        joinedAt: new Date().toISOString(),
      }],
      inviteCode: generateId().slice(0, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    await kvStoreSet(FAMILY_GROUP_KEY, group, { userId });
    // Register invite code → owner mapping so other users can join
    await kvStoreSet(FAMILY_INVITE_INDEX_KEY(group.inviteCode), userId, { userId });
  }

  // Check if this user is a member of someone else's group (not the owner)
  const membership = await kvStoreGet<{ ownerId: string; inviteCode: string }>(FAMILY_MEMBERSHIP_KEY, { userId });
  if (membership && membership.ownerId !== userId) {
    const memberGroup = await kvStoreGet<z.infer<typeof FamilyGroupSchema>>(FAMILY_GROUP_KEY, { userId: membership.ownerId });
    if (memberGroup) {
      const memberLocationEntries = await Promise.all(
        memberGroup.members.map(async (member) => {
          const loc = await kvStoreGet<z.infer<typeof LocationSchema>>(
            FAMILY_LOCATION_KEY(member.id), { userId: membership.ownerId }
          );
          return [member.id, loc] as const;
        })
      );
      const memberLocations = Object.fromEntries(memberLocationEntries.filter(([, v]) => v !== null));
      return NextResponse.json({
        group: memberGroup,
        locations: memberLocations,
        role: "member",
        currentUserId: userId,
        pendingEmailInvites: activePendingEmailInvites,
      });
    }
  }

  // Fetch locations for all members of own group
  const locationEntries = await Promise.all(
    group.members.map(async (member) => {
      const loc = await kvStoreGet<z.infer<typeof LocationSchema>>(
        FAMILY_LOCATION_KEY(member.id), { userId }
      );
      return [member.id, loc] as const;
    })
  );
  const locations = Object.fromEntries(locationEntries.filter(([, v]) => v !== null));

  return NextResponse.json({
    group,
    locations,
    role: "owner",
    currentUserId: userId,
    pendingEmailInvites: activePendingEmailInvites,
  });
}

// POST - update own location
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = z.object({
    action: z.enum([
      "update-location",
      "add-member",
      "remove-member",
      "update-member",
      "update-group",
      "join-group",
      "leave-group",
      "send-email-invite",
      "accept-email-invite",
      "decline-email-invite",
    ]),
    lat: z.number().optional(),
    lon: z.number().optional(),
    accuracy: z.number().optional(),
    label: z.string().max(60).optional(),
    memberId: z.string().optional(),
    name: z.string().max(60).optional(),
    email: z.string().email().nullable().optional(),
    role: z.enum(["organizer", "adult", "teen", "child"]).optional(),
    sharingEnabled: z.boolean().optional(),
    visibility: z.enum(["all-members", "organizer-only"]).optional(),
    groupName: z.string().max(60).optional(),
    inviteCode: z.string().optional(),
    inviteId: z.string().optional(),
    invitedEmail: z.string().email().optional(),
    invitedName: z.string().max(60).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { action } = parsed.data;
  if (action === "join-group") {
    const joinResult = await joinGroupByInviteCode({
      userId,
      inviteCode: parsed.data.inviteCode ?? "",
      name: parsed.data.name ?? null,
    });
    if (!joinResult.ok) {
      return NextResponse.json({ error: joinResult.error }, { status: joinResult.status });
    }
    return NextResponse.json({
      ok: true,
      group: joinResult.group,
      alreadyMember: Boolean(joinResult.alreadyMember),
      joined: Boolean(joinResult.joined),
    });
  }

  if (action === "accept-email-invite" || action === "decline-email-invite") {
    const inviteId = parsed.data.inviteId?.trim();
    if (!inviteId) {
      return NextResponse.json({ error: "inviteId required" }, { status: 400 });
    }
    const currentUserEmail = await resolveUserPrimaryEmail(userId);
    if (!currentUserEmail) {
      return NextResponse.json({ error: "No verified email found on this account." }, { status: 400 });
    }

    const inviteQueue = (await kvStoreGet<Array<z.infer<typeof FamilyEmailInviteSchema>>>(
      FAMILY_EMAIL_INVITE_QUEUE_KEY(currentUserEmail),
      { userId: FAMILY_EMAIL_INVITE_NAMESPACE },
    )) ?? [];
    const targetInvite = inviteQueue.find((invite) => invite.id === inviteId);
    if (!targetInvite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    if (targetInvite.status !== "pending") {
      return NextResponse.json({ error: "Invite has already been handled." }, { status: 409 });
    }

    if (action === "accept-email-invite") {
      const joinResult = await joinGroupByInviteCode({
        userId,
        inviteCode: targetInvite.inviteCode,
        name: parsed.data.name ?? targetInvite.invitedName ?? null,
      });
      if (!joinResult.ok) {
        return NextResponse.json({ error: joinResult.error }, { status: joinResult.status });
      }

      const respondedAt = new Date().toISOString();
      const updatedQueue = inviteQueue.map((invite) =>
        invite.id === inviteId
          ? { ...invite, status: "accepted", respondedAt }
          : invite
      );
      await kvStoreSet(FAMILY_EMAIL_INVITE_QUEUE_KEY(currentUserEmail), updatedQueue, {
        userId: FAMILY_EMAIL_INVITE_NAMESPACE,
      });

      const ownerInvites = (await kvStoreGet<Array<z.infer<typeof FamilyEmailInviteSchema>>>(
        FAMILY_GROUP_EMAIL_INVITES_KEY,
        { userId: targetInvite.ownerId },
      )) ?? [];
      const updatedOwnerInvites = ownerInvites.map((invite) =>
        invite.id === inviteId
          ? { ...invite, status: "accepted", respondedAt }
          : invite
      );
      await kvStoreSet(FAMILY_GROUP_EMAIL_INVITES_KEY, updatedOwnerInvites, { userId: targetInvite.ownerId });

      return NextResponse.json({
        ok: true,
        group: joinResult.group,
        joined: Boolean(joinResult.joined),
        alreadyMember: Boolean(joinResult.alreadyMember),
      });
    }

    const respondedAt = new Date().toISOString();
    const updatedQueue = inviteQueue.map((invite) =>
      invite.id === inviteId
        ? { ...invite, status: "declined", respondedAt }
        : invite
    );
    await kvStoreSet(FAMILY_EMAIL_INVITE_QUEUE_KEY(currentUserEmail), updatedQueue, {
      userId: FAMILY_EMAIL_INVITE_NAMESPACE,
    });

    const ownerInvites = (await kvStoreGet<Array<z.infer<typeof FamilyEmailInviteSchema>>>(
      FAMILY_GROUP_EMAIL_INVITES_KEY,
      { userId: targetInvite.ownerId },
    )) ?? [];
    const updatedOwnerInvites = ownerInvites.map((invite) =>
      invite.id === inviteId
        ? { ...invite, status: "declined", respondedAt }
        : invite
    );
    await kvStoreSet(FAMILY_GROUP_EMAIL_INVITES_KEY, updatedOwnerInvites, { userId: targetInvite.ownerId });

    return NextResponse.json({ ok: true, declined: true });
  }

  const membership = await kvStoreGet<{ ownerId: string; inviteCode: string }>(FAMILY_MEMBERSHIP_KEY, { userId });
  const groupNamespaceUserId =
    membership && membership.ownerId !== userId ? membership.ownerId : userId;
  const group = await kvStoreGet<z.infer<typeof FamilyGroupSchema>>(FAMILY_GROUP_KEY, { userId: groupNamespaceUserId });
  if (!group) return NextResponse.json({ error: "No family group found" }, { status: 404 });

  if (action === "send-email-invite") {
    if (group.ownerId !== userId) {
      return NextResponse.json({ error: "Only group owners can send email invites." }, { status: 403 });
    }
    const invitedEmail = parsed.data.invitedEmail?.trim().toLowerCase();
    if (!invitedEmail) {
      return NextResponse.json({ error: "invitedEmail required" }, { status: 400 });
    }
    const ownerEmail = await resolveUserPrimaryEmail(userId);
    if (ownerEmail && ownerEmail === invitedEmail) {
      return NextResponse.json({ error: "You cannot invite your own email." }, { status: 400 });
    }

    const inviterName = group.members.find((member) => member.id === userId)?.name ?? null;
    const inviteRecord: z.infer<typeof FamilyEmailInviteSchema> = {
      id: generateId(),
      ownerId: userId,
      groupId: group.id,
      groupName: group.name,
      inviteCode: group.inviteCode,
      invitedEmail,
      invitedName: parsed.data.invitedName?.trim() || null,
      inviterName,
      createdAt: new Date().toISOString(),
      status: "pending",
      respondedAt: null,
    };

    const ownerInvites = (await kvStoreGet<Array<z.infer<typeof FamilyEmailInviteSchema>>>(
      FAMILY_GROUP_EMAIL_INVITES_KEY,
      { userId },
    )) ?? [];
    const existingPendingForEmail = ownerInvites.find(
      (invite) =>
        invite.invitedEmail.toLowerCase() === invitedEmail &&
        invite.status === "pending",
    );
    if (existingPendingForEmail) {
      return NextResponse.json({ error: "There is already a pending invite for this email." }, { status: 409 });
    }
    const nextOwnerInvites = [inviteRecord, ...ownerInvites].slice(0, 100);
    await kvStoreSet(FAMILY_GROUP_EMAIL_INVITES_KEY, nextOwnerInvites, { userId });

    const recipientQueue = (await kvStoreGet<Array<z.infer<typeof FamilyEmailInviteSchema>>>(
      FAMILY_EMAIL_INVITE_QUEUE_KEY(invitedEmail),
      { userId: FAMILY_EMAIL_INVITE_NAMESPACE },
    )) ?? [];
    const nextRecipientQueue = [inviteRecord, ...recipientQueue].slice(0, 100);
    await kvStoreSet(FAMILY_EMAIL_INVITE_QUEUE_KEY(invitedEmail), nextRecipientQueue, {
      userId: FAMILY_EMAIL_INVITE_NAMESPACE,
    });

    const appBase =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
      "http://localhost:3000";
    const normalizedBase = appBase.startsWith("http") ? appBase.replace(/\/$/u, "") : `https://${appBase.replace(/\/$/u, "")}`;
    const inviteUrl = `${normalizedBase}/travel-assistant?tab=family&familyInvite=${encodeURIComponent(group.inviteCode)}`;

    let emailSent = false;
    let warning: string | null = null;
    const resend = getResendClient();
    if (resend) {
      const subject = `${inviterName ?? "A family member"} invited you to ${group.name} on Kepi`;
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
          <h2 style="margin-bottom:8px;color:#0c4a6e">You're invited to a family travel group</h2>
          <p><strong>${inviterName ?? "A family member"}</strong> invited you to join <strong>${group.name}</strong> on Kepi.</p>
          <p>When you log in, Kepi will show an in-app popup to accept or deny this invitation.</p>
          <p style="margin:16px 0">
            <a href="${inviteUrl}" style="background:#0284c7;color:white;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700">Open invite</a>
          </p>
          <p>Invite code: <strong style="font-family:monospace;letter-spacing:0.08em">${group.inviteCode}</strong></p>
          <p style="font-size:12px;color:#475569">If the button doesn't open the app directly, log in to Kepi and open Family tab.</p>
        </div>
      `;
      try {
        const { error } = await resend.emails.send({
          from: getResendFromEmail(),
          to: invitedEmail,
          subject,
          html,
        });
        if (error) {
          warning = error.message;
        } else {
          emailSent = true;
        }
      } catch (error) {
        warning = error instanceof Error ? error.message : "unknown";
      }
    } else {
      warning = "RESEND_API_KEY not configured. Invite is queued and will appear on recipient login.";
    }

    return NextResponse.json({
      ok: true,
      invite: inviteRecord,
      emailSent,
      warning,
    });
  }

  if (action === "update-location") {
    const { lat, lon, accuracy, label } = parsed.data;
    if (lat === undefined || lon === undefined) {
      return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
    }
    const ownerNamespaceUserId =
      membership && membership.ownerId !== userId ? membership.ownerId : userId;
    const location: z.infer<typeof LocationSchema> = {
      lat, lon,
      accuracy: accuracy ?? undefined,
      updatedAt: new Date().toISOString(),
      memberId: userId,
      label: label ?? undefined,
    };
    await kvStoreSet(FAMILY_LOCATION_KEY(userId), location, { userId: ownerNamespaceUserId });
    return NextResponse.json({ ok: true, location });
  }

  if (action === "add-member") {
    if (group.ownerId !== userId) {
      return NextResponse.json({ error: "Only group owners can add members." }, { status: 403 });
    }
    const { name, email, role } = parsed.data;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const newMember: z.infer<typeof MemberSchema> = {
      id: generateId(),
      name,
      email: email ?? null,
      role: role ?? "adult",
      color: nextColor(group.members),
      sharingEnabled: true,
      visibility: "all-members",
      joinedAt: new Date().toISOString(),
    };
    group.members.push(newMember);
    await kvStoreSet(FAMILY_GROUP_KEY, group, { userId: groupNamespaceUserId });
    return NextResponse.json({ ok: true, member: newMember, group });
  }

  if (action === "remove-member") {
    if (group.ownerId !== userId) {
      return NextResponse.json({ error: "Only group owners can remove members." }, { status: 403 });
    }
    const { memberId } = parsed.data;
    if (!memberId || memberId === userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }
    group.members = group.members.filter(m => m.id !== memberId);
    await kvStoreSet(FAMILY_GROUP_KEY, group, { userId: groupNamespaceUserId });
    return NextResponse.json({ ok: true, group });
  }

  if (action === "update-member") {
    const { memberId, sharingEnabled, visibility, name, role } = parsed.data;
    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
    const isOwner = group.ownerId === userId;
    const isSelfUpdate = memberId === userId;
    if (!isOwner && !isSelfUpdate) {
      return NextResponse.json({ error: "Only owners can update other members." }, { status: 403 });
    }
    group.members = group.members.map(m => {
      if (m.id !== memberId) return m;
      return {
        ...m,
        ...(name !== undefined ? { name } : {}),
        ...(sharingEnabled !== undefined ? { sharingEnabled } : {}),
        ...(visibility !== undefined ? { visibility } : {}),
        ...(isOwner && role !== undefined ? { role } : {}),
      };
    });
    await kvStoreSet(FAMILY_GROUP_KEY, group, { userId: groupNamespaceUserId });
    return NextResponse.json({ ok: true, group });
  }

  if (action === "update-group") {
    if (group.ownerId !== userId) {
      return NextResponse.json({ error: "Only group owners can update group settings." }, { status: 403 });
    }
    const { groupName } = parsed.data;
    if (groupName) group.name = groupName;
    await kvStoreSet(FAMILY_GROUP_KEY, group, { userId: groupNamespaceUserId });
    return NextResponse.json({ ok: true, group });
  }

  if (action === "leave-group") {
    // Remove self from owner's group
    if (!membership) return NextResponse.json({ error: "Not in a group." }, { status: 400 });

    const ownerGroup = await kvStoreGet<z.infer<typeof FamilyGroupSchema>>(FAMILY_GROUP_KEY, { userId: membership.ownerId });
    if (ownerGroup) {
      ownerGroup.members = ownerGroup.members.filter(m => m.id !== userId);
      await kvStoreSet(FAMILY_GROUP_KEY, ownerGroup, { userId: membership.ownerId });
    }
    // Clear membership key
    await kvStoreSet(FAMILY_MEMBERSHIP_KEY, null, { userId });
    return NextResponse.json({ ok: true, left: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
