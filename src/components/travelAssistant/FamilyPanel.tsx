"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FamilyMap } from "@/components/travelAssistant/FamilyMap";
import { QRCodeSVG } from "qrcode.react";

interface LocationPoint {
  lat: number;
  lon: number;
  accuracy?: number;
  updatedAt: string;
  memberId: string;
  label?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  role: "organizer" | "adult" | "teen" | "child";
  color: string;
  sharingEnabled: boolean;
  visibility: "all-members" | "organizer-only";
  joinedAt: string;
}

interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: FamilyMember[];
  inviteCode: string;
  createdAt: string;
}

interface PendingFamilyEmailInvite {
  id: string;
  ownerId: string;
  groupId: string;
  groupName: string;
  inviteCode: string;
  invitedEmail: string;
  invitedName: string | null;
  inviterName: string | null;
  createdAt: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  respondedAt: string | null;
}

interface FamilyPanelProps {
  isPremium: boolean;
  onUpgrade: () => void;
  maptilerKey?: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function isStale(iso: string): boolean {
  return Date.now() - Date.parse(iso) > 10 * 60_000;
}

const INVITE_QUERY_PARAM = "familyInvite";
const LIVE_SHARING_STORAGE_KEY = "kepi-family-live-sharing-enabled";
const LOCATION_SYNC_THROTTLE_MS = 15_000;

function toUpperInviteCode(value: string): string {
  return value.trim().toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
}

function readInviteCodeFromUrl(): string {
  if (typeof window === "undefined") return "";
  const currentUrl = new URL(window.location.href);
  return toUpperInviteCode(currentUrl.searchParams.get(INVITE_QUERY_PARAM) ?? "");
}

export function FamilyPanel({ isPremium, onUpgrade, maptilerKey }: FamilyPanelProps) {
  const inviteCodeFromUrl = readInviteCodeFromUrl();
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Record<string, LocationPoint>>({});
  const [loading, setLoading] = useState<boolean>(isPremium);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    inviteCodeFromUrl ? `You've been invited to join family group ${inviteCodeFromUrl}.` : null,
  );
  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"adult" | "teen" | "child">("adult");
  const [sharingLocation, setSharingLocation] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [groupRole, setGroupRole] = useState<"owner" | "member" | null>(null);
  const [hasGroup, setHasGroup] = useState(false);
  const [, setSelectedMemberId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [inviteByEmail, setInviteByEmail] = useState("");
  const [inviteByName, setInviteByName] = useState("");
  const [inviteByEmailBusy, setInviteByEmailBusy] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [joinCode, setJoinCode] = useState(inviteCodeFromUrl);
  const [joinName, setJoinName] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [incomingInviteCode, setIncomingInviteCode] = useState<string | null>(inviteCodeFromUrl || null);
  const [pendingEmailInvites, setPendingEmailInvites] = useState<PendingFamilyEmailInvite[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const lastLocationSentAtRef = useRef<number>(0);
  const geolocationSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation);
  const [liveSharingEnabled, setLiveSharingEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LIVE_SHARING_STORAGE_KEY) === "true";
  });
  const inviteJoinUrl = group?.inviteCode
    ? typeof window === "undefined"
      ? `/travel-assistant?tab=family&${INVITE_QUERY_PARAM}=${group.inviteCode}`
      : `${window.location.origin}/travel-assistant?tab=family&${INVITE_QUERY_PARAM}=${group.inviteCode}`
    : "";
  const activePendingEmailInvite = pendingEmailInvites.find((invite) => invite.status === "pending") ?? null;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/family", { cache: "no-store" });
      const data = await res.json() as {
        group: FamilyGroup;
        locations: Record<string, LocationPoint>;
        role?: "owner" | "member";
        currentUserId?: string;
        pendingEmailInvites?: PendingFamilyEmailInvite[];
      };
      setGroup(data.group);
      setLocations(data.locations ?? {});
      setGroupRole(data.role ?? "owner");
      setCurrentUserId(data.currentUserId ?? null);
      setGroupNameDraft(data.group?.name ?? "");
      const nextPendingInvites = Array.isArray(data.pendingEmailInvites) ? data.pendingEmailInvites : [];
      setPendingEmailInvites(nextPendingInvites);
      // Non-premium users can access family only when invited into an existing group.
      setHasGroup((data.role ?? "owner") === "member" || nextPendingInvites.length > 0);
    } catch {
      setMessage("Could not load family group.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && geolocationSupported) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [geolocationSupported]);

  const clearInviteQueryParam = useCallback(() => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has(INVITE_QUERY_PARAM)) return;
    currentUrl.searchParams.delete(INVITE_QUERY_PARAM);
    window.history.replaceState({}, "", currentUrl.toString());
  }, []);

  const joinGroupByCode = useCallback(async (inviteCodeRaw: string) => {
    const inviteCode = toUpperInviteCode(inviteCodeRaw);
    if (!inviteCode) {
      setMessage("Enter the invite code from the group organizer.");
      return false;
    }
    setJoinBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join-group",
          inviteCode,
          name: joinName.trim() || "Family Member",
        }),
      });
      const data = await res.json() as { ok?: boolean; group?: FamilyGroup; error?: string; joined?: boolean; alreadyMember?: boolean };
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Invalid invite code.");
        return false;
      }
      if (data.group) {
        setGroup(data.group);
        setGroupNameDraft(data.group.name);
      }
      setGroupRole("member");
      setJoiningGroup(false);
      setIncomingInviteCode(null);
      setJoinCode("");
      clearInviteQueryParam();
      setMessage(data.alreadyMember ? "You're already in this group." : "✅ Joined the group! You can now share your location.");
      await load();
      return true;
    } catch {
      setMessage("Failed to join group.");
      return false;
    } finally {
      setJoinBusy(false);
    }
  }, [clearInviteQueryParam, joinName, load]);

  const handleJoinGroup = useCallback(async () => {
    await joinGroupByCode(joinCode);
  }, [joinCode, joinGroupByCode]);

  const handleLeaveGroup = useCallback(async () => {
    if (!confirm("Leave this family group?")) return;
    setBusy(true);
    try {
      if (watchIdRef.current !== null && geolocationSupported) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLiveSharingEnabled(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LIVE_SHARING_STORAGE_KEY, "false");
      }
      const leaveRes = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave-group" }),
      });
      const leavePayload = await leaveRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!leaveRes.ok || !leavePayload.ok) {
        setMessage(leavePayload.error ?? "Failed to leave group.");
        return;
      }
      setGroupRole("owner");
      setGroup(null);
      setMessage("You've left the group.");
      await load();
    } catch {
      setMessage("Failed to leave group.");
    } finally {
      setBusy(false);
    }
  }, [geolocationSupported, load]);

  const handleToggleSharing = useCallback(async (memberId: string, current: boolean) => {
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-member", memberId, sharingEnabled: !current }),
    });
    const data = await res.json() as { group?: FamilyGroup; error?: string };
    if (!res.ok || !data.group) {
      setMessage(data.error ?? "Could not update sharing.");
      return;
    }
    setGroup(data.group);
  }, []);

  const handleUpdateMemberRole = useCallback(async (
    memberId: string,
    role: "organizer" | "adult" | "teen" | "child",
  ) => {
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-member", memberId, role }),
    });
    const data = await res.json() as { group?: FamilyGroup; error?: string };
    if (!res.ok || !data.group) {
      setMessage(data.error ?? "Could not update role.");
      return;
    }
    setGroup(data.group);
  }, []);

  const pushLocationUpdate = useCallback(async (position: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastLocationSentAtRef.current < LOCATION_SYNC_THROTTLE_MS) {
      return true;
    }
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-location",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
    });
    const payload = await res.json().catch(() => ({})) as { ok?: boolean; location?: LocationPoint; error?: string };
    if (!res.ok || !payload.ok || !payload.location) {
      throw new Error(payload.error ?? "Failed to sync location");
    }
    const syncedLocation = payload.location;
    lastLocationSentAtRef.current = now;
    setLocations((previous) => ({
      ...previous,
      [syncedLocation.memberId]: syncedLocation,
    }));
    return true;
  }, []);

  const stopLiveLocationSharing = useCallback(async (showMessage = true) => {
    if (watchIdRef.current !== null && geolocationSupported) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLiveSharingEnabled(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LIVE_SHARING_STORAGE_KEY, "false");
    }
    if (currentUserId) {
      await handleToggleSharing(currentUserId, true).catch(() => undefined);
    }
    if (showMessage) {
      setMessage("Location sharing paused. You can turn it back on any time.");
    }
  }, [currentUserId, geolocationSupported, handleToggleSharing]);

  const startLiveLocationSharing = useCallback(async (silent = false) => {
    if (!geolocationSupported) {
      setMessage("Geolocation is unavailable on this device/browser.");
      return false;
    }
    setSharingLocation(true);
    if (!silent) {
      setMessage("Requesting location permission...");
    }

    const onPermissionDenied = async () => {
      await stopLiveLocationSharing(false);
      setSharingLocation(false);
      setMessage("Location permission denied. Enable location for browser/app and tap 'Share live'.");
    };

    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await pushLocationUpdate(position);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 3_000 },
        );
      });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? Number((error as GeolocationPositionError).code) : 0;
      if (code === 1) {
        await onPermissionDenied();
        return false;
      }
      setSharingLocation(false);
      setMessage("Unable to get your live location. Move to an open area and try again.");
      return false;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void pushLocationUpdate(position).catch(() => undefined);
      },
      (error) => {
        if (error.code === 1) {
          void onPermissionDenied();
          return;
        }
        setMessage("Live location interrupted. Tap 'Share live' to retry.");
      },
      { enableHighAccuracy: true, timeout: 18_000, maximumAge: 8_000 },
    );

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LIVE_SHARING_STORAGE_KEY, "true");
    }
    setLiveSharingEnabled(true);
    setSharingLocation(false);
    if (currentUserId) {
      await handleToggleSharing(currentUserId, false).catch(() => undefined);
    }
    if (!silent) {
      setMessage("✅ Live location sharing is on for your group.");
    }
    return true;
  }, [currentUserId, geolocationSupported, handleToggleSharing, pushLocationUpdate, stopLiveLocationSharing]);

  const toggleLiveLocationSharing = useCallback(async () => {
    if (liveSharingEnabled) {
      await stopLiveLocationSharing(true);
      return;
    }
    await startLiveLocationSharing(false);
  }, [liveSharingEnabled, startLiveLocationSharing, stopLiveLocationSharing]);

  useEffect(() => {
    if (!liveSharingEnabled) return;
    if (!group || loading) return;
    if (watchIdRef.current !== null) return;
    void startLiveLocationSharing(true);
  }, [group, liveSharingEnabled, loading, startLiveLocationSharing]);

  useEffect(() => {
    if (!group) return;
    const interval = window.setInterval(() => {
      void load();
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [group, load]);

  const handleAddMember = useCallback(async () => {
    if (!newMemberName.trim()) { setMessage("Enter a name."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-member",
          name: newMemberName.trim(),
          email: newMemberEmail.trim() || null,
          role: newMemberRole,
        }),
      });
      const data = await res.json() as { group?: FamilyGroup; error?: string };
      if (!res.ok || !data.group) {
        setMessage(data.error ?? "Failed to add member.");
        return;
      }
      setGroup(data.group);
      setNewMemberName("");
      setNewMemberEmail("");
      setAddingMember(false);
      setMessage(`✅ ${newMemberName} added to your group.`);
    } catch {
      setMessage("Failed to add member.");
    } finally {
      setBusy(false);
    }
  }, [newMemberName, newMemberEmail, newMemberRole]);

  const handleRemoveMember = useCallback(async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from your family group?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-member", memberId }),
      });
      const data = await res.json() as { group?: FamilyGroup; error?: string };
      if (!res.ok || !data.group) {
        setMessage(data.error ?? "Failed to remove member.");
        return;
      }
      setGroup(data.group);
      setMessage(`${name} removed.`);
    } catch {
      setMessage("Failed to remove member.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleUpdateGroupName = useCallback(async () => {
    const nextName = groupNameDraft.trim();
    if (!nextName || !group || nextName === group.name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-group", groupName: nextName }),
      });
      const data = await res.json() as { group?: FamilyGroup; error?: string };
      if (!res.ok || !data.group) {
        setMessage(data.error ?? "Could not rename family group.");
      } else {
        setGroup(data.group);
        setGroupNameDraft(data.group.name);
        setMessage("✅ Group name updated.");
      }
    } catch {
      setMessage("Could not rename family group.");
    } finally {
      setBusy(false);
    }
  }, [group, groupNameDraft]);

  const handleSendEmailInvite = useCallback(async () => {
    const email = inviteByEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setMessage("Enter a valid email address to invite.");
      return;
    }
    setInviteByEmailBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-email-invite",
          invitedEmail: email,
          invitedName: inviteByName.trim() || undefined,
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        emailSent?: boolean;
        warning?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Could not send email invite.");
        return;
      }
      setInviteByEmail("");
      setInviteByName("");
      setMessage(
        data.emailSent
          ? "✅ Invite sent. They will see an accept/deny popup on next login."
          : `✅ Invite queued. ${data.warning ?? "They will still see an in-app popup on login."}`,
      );
      await load();
    } catch {
      setMessage("Could not send email invite.");
    } finally {
      setInviteByEmailBusy(false);
    }
  }, [inviteByEmail, inviteByName, load]);

  const handleAcceptIncomingInvite = useCallback(async () => {
    if (activePendingEmailInvite) {
      setJoinBusy(true);
      try {
        const response = await fetch("/api/family", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "accept-email-invite",
            inviteId: activePendingEmailInvite.id,
            name: joinName.trim() || undefined,
          }),
        });
        const payload = await response.json() as { ok?: boolean; error?: string };
        if (!response.ok || !payload.ok) {
          setMessage(payload.error ?? "Could not accept invite.");
          return;
        }
        setIncomingInviteCode(null);
        clearInviteQueryParam();
        setMessage("✅ Joined family group.");
        await load();
      } catch {
        setMessage("Could not accept invite.");
      } finally {
        setJoinBusy(false);
      }
      return;
    }
    if (!incomingInviteCode) return;
    await joinGroupByCode(incomingInviteCode);
  }, [activePendingEmailInvite, clearInviteQueryParam, incomingInviteCode, joinGroupByCode, joinName, load]);

  const handleDenyIncomingInvite = useCallback(async () => {
    if (activePendingEmailInvite) {
      setJoinBusy(true);
      try {
        const response = await fetch("/api/family", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "decline-email-invite",
            inviteId: activePendingEmailInvite.id,
          }),
        });
        const payload = await response.json() as { ok?: boolean; error?: string };
        if (!response.ok || !payload.ok) {
          setMessage(payload.error ?? "Could not dismiss invite.");
          return;
        }
        setIncomingInviteCode(null);
        clearInviteQueryParam();
        await load();
        setMessage("Invite declined.");
      } catch {
        setMessage("Could not dismiss invite.");
      } finally {
        setJoinBusy(false);
      }
      return;
    }
    setIncomingInviteCode(null);
    clearInviteQueryParam();
    setMessage("Invite dismissed. You can still join later with the code.");
  }, [activePendingEmailInvite, clearInviteQueryParam, load]);

  const copyInviteCode = useCallback(async () => {
    if (!group?.inviteCode) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [group]);

  const copyInviteLink = useCallback(async () => {
    if (!inviteJoinUrl) return;
    await navigator.clipboard.writeText(inviteJoinUrl);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2000);
  }, [inviteJoinUrl]);

  const shareInviteViaText = useCallback(() => {
    if (!inviteJoinUrl || !group?.inviteCode) return;
    const body = encodeURIComponent(
      `Join my Kepi family group (${group.inviteCode}) so we can share live locations while traveling: ${inviteJoinUrl}`,
    );
    window.location.href = `sms:?&body=${body}`;
  }, [group, inviteJoinUrl]);

  const shareInvite = useCallback(async () => {
    if (!inviteJoinUrl || !group?.inviteCode) return;
    const shareText = `Join my Kepi family group (${group.inviteCode}) so we can share live locations while traveling.`;
    if (navigator.share) {
      await navigator.share({
        title: "Join my Kepi family group",
        text: shareText,
        url: inviteJoinUrl,
      }).catch(() => undefined);
      return;
    }
    await copyInviteLink();
    setMessage("Invite link copied. Send it in any chat.");
  }, [copyInviteLink, group, inviteJoinUrl]);

  // Premium gate — only block if user has no group. Members of invited groups can always see.
  if (!isPremium && !hasGroup) {
    return (
      <article className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-sky-500/30 dark:from-sky-500/10 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👨‍👩‍👧</span>
          <div>
            <h2 className="font-semibold">Family Tracker</h2>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">Pro</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          See where every family member is in real time during your trip. Share locations, assign roles, and keep everyone on the same timeline — like Life360, built into your trip.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>📍 Real-time location sharing — consent-based, always in control</li>
          <li>👤 Add family members — organizer, adult, teen, child roles</li>
          <li>🔒 Per-member privacy controls — share with all or organizer only</li>
          <li>🔔 Location alerts when members arrive at hotel or airport</li>
        </ul>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500"
        >
          Upgrade to Pro to create a Family group
        </button>
      </article>
    );
  }

  if (loading) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 animate-pulse">Loading family group...</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <span>👨‍👩‍👧</span>
            {group?.name ?? "My Family"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{group?.members.length ?? 0} members</p>
        </div>
        <button
          type="button"
          onClick={() => void toggleLiveLocationSharing()}
          disabled={sharingLocation}
          className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${
            liveSharingEnabled ? "bg-emerald-600 hover:bg-emerald-500" : "bg-sky-600 hover:bg-sky-500"
          }`}
        >
          {sharingLocation
            ? "Connecting..."
            : liveSharingEnabled
              ? "🟢 Sharing live (tap to stop)"
              : "📍 Share live location"}
        </button>
      </div>

      {activePendingEmailInvite || incomingInviteCode ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">You were invited to a family group</p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {activePendingEmailInvite ? (
              <>
                <span className="font-semibold">{activePendingEmailInvite.inviterName ?? "A family member"}</span> invited you to{" "}
                <span className="font-semibold">{activePendingEmailInvite.groupName}</span>. Invite code{" "}
                <span className="font-mono font-bold">{activePendingEmailInvite.inviteCode}</span>.
              </>
            ) : (
              <>
                Invite code <span className="font-mono font-bold">{incomingInviteCode}</span>.
              </>
            )}{" "}
            Accept to start premium live tracking together.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleAcceptIncomingInvite()}
              disabled={joinBusy}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {joinBusy ? "Joining..." : "Accept invite"}
            </button>
            <button
              type="button"
              onClick={handleDenyIncomingInvite}
              className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            >
              Deny
            </button>
          </div>
        </div>
      ) : null}

      {/* Map toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {Object.keys(locations).length > 0 ? `${Object.keys(locations).length} location${Object.keys(locations).length !== 1 ? "s" : ""} live` : "No locations shared yet"}
        </p>
        <button
          type="button"
          onClick={() => setShowMap(v => !v)}
          className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
        >
          {showMap ? "Hide map" : "Show map"}
        </button>
      </div>

      {/* Live map */}
      {showMap && (
        <FamilyMap
          members={group?.members ?? []}
          locations={locations}
          maptilerKey={maptilerKey ?? ""}
          height={300}
          onMemberClick={setSelectedMemberId}
        />
      )}


      {/* Invite code */}
      {group && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">Group invite code</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="font-mono text-lg font-bold tracking-widest text-sky-900 dark:text-sky-100">{group.inviteCode}</p>
            <button
              type="button"
              onClick={() => void copyInviteCode()}
              className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:text-sky-300"
            >
              {copiedCode ? "Code copied" : "Copy code"}
            </button>
            <button
              type="button"
              onClick={() => void copyInviteLink()}
              className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:text-sky-300"
            >
              {copiedInviteLink ? "Link copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => void shareInvite()}
              className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:text-sky-300"
            >
              Share
            </button>
            <button
              type="button"
              onClick={shareInviteViaText}
              className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:text-sky-300"
            >
              Text invite
            </button>
          </div>
          {inviteJoinUrl ? (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-sky-200 bg-white p-2 dark:border-sky-700 dark:bg-slate-900">
                <QRCodeSVG value={inviteJoinUrl} size={120} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-sky-700 dark:text-sky-300">Scan QR or open this invite link:</p>
                <p className="mt-1 break-all font-mono text-[11px] text-sky-700 dark:text-sky-300">{inviteJoinUrl}</p>
              </div>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-sky-600 dark:text-sky-400">
            Invite opens an in-app accept/deny prompt automatically. Sharing stays on until member switches it off.
          </p>
        </div>
      )}

      {groupRole === "owner" ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Group management</p>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={groupNameDraft}
              onChange={(event) => setGroupNameDraft(event.target.value)}
              placeholder="Family group name"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => void handleUpdateGroupName()}
              disabled={busy || !groupNameDraft.trim() || groupNameDraft.trim() === group?.name}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            >
              Save
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-700 dark:bg-sky-900/20">
            <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">Invite family by email</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                type="email"
                value={inviteByEmail}
                onChange={(event) => setInviteByEmail(event.target.value)}
                placeholder="daughter@email.com"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                type="text"
                value={inviteByName}
                onChange={(event) => setInviteByName(event.target.value)}
                placeholder="Name (optional)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSendEmailInvite()}
              disabled={inviteByEmailBusy || !inviteByEmail.trim()}
              className="mt-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {inviteByEmailBusy ? "Sending invite..." : `Send invite to ${groupNameDraft.trim() || group?.name || "group"}`}
            </button>
            <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">
              On next login, they will automatically see an accept/deny popup in Family tab.
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Manage roles, remove members, and keep one private group for your travel crew.
          </p>
        </div>
      ) : null}

      {/* Member list */}
      <div className="space-y-2">
        {group?.members.map((member) => {
          const loc = locations[member.id];
          const stale = loc ? isStale(loc.updatedAt) : true;
          const hasLocation = Boolean(loc);
          const canToggleMember = groupRole === "owner" || member.id === currentUserId;
          return (
            <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${hasLocation && !stale ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="font-medium text-sm">{member.name}</span>
                  {groupRole === "owner" ? (
                    <select
                      value={member.role}
                      onChange={(event) => {
                        void handleUpdateMemberRole(
                          member.id,
                          event.target.value as "organizer" | "adult" | "teen" | "child",
                        );
                      }}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs capitalize dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="organizer">organizer</option>
                      <option value="adult">adult</option>
                      <option value="teen">teen</option>
                      <option value="child">child</option>
                    </select>
                  ) : (
                    <span className="text-xs text-slate-500 capitalize">{member.role}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleToggleSharing(member.id, member.sharingEnabled)}
                    disabled={!canToggleMember}
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      member.sharingEnabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    } ${!canToggleMember ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {member.sharingEnabled ? "Sharing on" : "Sharing off"}
                  </button>
                  {groupRole === "owner" && member.id !== group?.ownerId && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member.id, member.name)}
                      disabled={busy}
                      className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {/* Location status */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {hasLocation ? (
                  <>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${stale ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span>{stale ? "Location stale — " : "Live — "}</span>
                    <span>{timeAgo(loc!.updatedAt)}</span>
                    {loc?.label && <span>· {loc.label}</span>}
                  </>
                ) : (
                  <>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>No location shared yet</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Join/Leave for non-owners */}
      {groupRole === "member" && (
        <button
          type="button"
          onClick={() => void handleLeaveGroup()}
          disabled={busy}
          className="w-full rounded-xl border border-dashed border-rose-300 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400"
        >
          Leave this group
        </button>
      )}

      {/* Add member (owner only) */}
      {groupRole === "owner" ? (
        !addingMember ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddingMember(true)}
              className="flex-1 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400"
            >
              + Add family member
            </button>
            {!joiningGroup && (
              <button
                type="button"
                onClick={() => setJoiningGroup(true)}
                className="rounded-xl border border-dashed border-sky-300 px-3 py-2.5 text-sm font-semibold text-sky-600 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-400"
              >
                Join a group
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2 dark:border-sky-500/30 dark:bg-sky-500/10">
            <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">Add family member</p>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Name (e.g. Sarah)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Email (optional — for invite)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as "adult" | "teen" | "child")}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="adult">Adult</option>
              <option value="teen">Teen</option>
              <option value="child">Child</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleAddMember()}
                disabled={busy || !newMemberName.trim()}
                className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {busy ? "Adding..." : "Add member"}
              </button>
              <button
                type="button"
                onClick={() => { setAddingMember(false); setNewMemberName(""); setNewMemberEmail(""); }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      ) : null}

      {joiningGroup && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2 dark:border-sky-500/30 dark:bg-sky-500/10">
          <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">Join a family group</p>
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Your name (e.g. Sarah)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(toUpperInviteCode(e.target.value))}
            placeholder="Group invite code (e.g. A1B2C3D4)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase tracking-widest dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleJoinGroup()}
              disabled={joinBusy || !joinCode.trim()}
              className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {joinBusy ? "Joining..." : "Join group"}
            </button>
            <button
              type="button"
              onClick={() => { setJoiningGroup(false); setJoinCode(""); setJoinName(""); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.startsWith("✅") ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"}`}>
          {message}
        </p>
      )}

      <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <p className="font-semibold text-slate-600 dark:text-slate-300">Permission + privacy</p>
        <p className="mt-1">
          Sharing is consent-based. Once location permission is granted, members can pause/resume sharing from this screen without extra prompts in most browsers.
        </p>
        {!geolocationSupported ? (
          <p className="mt-1 text-rose-600 dark:text-rose-400">
            This browser does not support geolocation. Use Safari/Chrome mobile with HTTPS.
          </p>
        ) : null}
      </div>
    </article>
  );
}
