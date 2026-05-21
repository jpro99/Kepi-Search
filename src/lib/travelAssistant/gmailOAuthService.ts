import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { kvStoreDel, kvStoreGet, kvStoreSet } from "@/lib/travelAssistant/kvStore";

const GMAIL_CONNECT_STATE_KEY = "travel/gmail/connect-state";
const GMAIL_CONNECTION_KEY = "travel/gmail/connection";
const GMAIL_STATE_TTL_MS = 10 * 60 * 1000;
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

interface GmailConnectStateRecord {
  state: string;
  returnTo: string;
  expiresAt: string;
}

export interface GmailConnectionRecord {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  scope: string | null;
  expiryDateMs: number | null;
  emailAddress: string | null;
  updatedAt: string;
}

export interface GmailConnectionStatus {
  connected: boolean;
  emailAddress: string | null;
  updatedAt: string | null;
}

export function resolveGmailOAuthConfig(): { clientId: string; clientSecret: string; redirectUri: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || process.env.GMAIL_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || process.env.GMAIL_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

function createOAuthClient(config: { clientId: string; clientSecret: string; redirectUri: string }) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export async function readGmailConnectionRecord(userId: string): Promise<GmailConnectionRecord | null> {
  return kvStoreGet<GmailConnectionRecord>(GMAIL_CONNECTION_KEY, { userId });
}

export async function getGmailConnectionStatus(userId: string): Promise<GmailConnectionStatus> {
  const record = await readGmailConnectionRecord(userId);
  return {
    connected: Boolean(record && (record.refreshToken || record.accessToken)),
    emailAddress: record?.emailAddress ?? null,
    updatedAt: record?.updatedAt ?? null,
  };
}

async function writeConnectState(userId: string, returnTo: string): Promise<string> {
  const state = randomUUID();
  const expiresAt = new Date(Date.now() + GMAIL_STATE_TTL_MS).toISOString();
  await kvStoreSet<GmailConnectStateRecord>(
    GMAIL_CONNECT_STATE_KEY,
    {
      state,
      returnTo,
      expiresAt,
    },
    { userId },
  );
  return state;
}

async function consumeConnectState(userId: string, state: string): Promise<{ ok: true; returnTo: string } | { ok: false }> {
  const record = await kvStoreGet<GmailConnectStateRecord>(GMAIL_CONNECT_STATE_KEY, { userId });
  await kvStoreDel(GMAIL_CONNECT_STATE_KEY, { userId });
  if (!record || record.state !== state) {
    return { ok: false };
  }
  if (Date.parse(record.expiresAt) < Date.now()) {
    return { ok: false };
  }
  return { ok: true, returnTo: record.returnTo };
}

export async function buildGmailAuthUrl(args: { userId: string; returnTo: string }): Promise<string | null> {
  const oauthConfig = resolveGmailOAuthConfig();
  if (!oauthConfig) {
    return null;
  }
  const oauthClient = createOAuthClient(oauthConfig);
  const state = await writeConnectState(args.userId, args.returnTo);
  return oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
    state,
    include_granted_scopes: false,
  });
}

export async function finishGmailOAuth(args: {
  userId: string;
  state: string;
  code: string;
}): Promise<{ ok: true; returnTo: string; emailAddress: string | null } | { ok: false; reason: "invalid-state" | "oauth-config-missing" | "token-exchange-failed"; returnTo: string }> {
  const stateResolution = await consumeConnectState(args.userId, args.state);
  const fallbackReturnTo = "/travel-assistant?tab=more";
  if (!stateResolution.ok) {
    return { ok: false, reason: "invalid-state", returnTo: fallbackReturnTo };
  }

  const oauthConfig = resolveGmailOAuthConfig();
  if (!oauthConfig) {
    return { ok: false, reason: "oauth-config-missing", returnTo: stateResolution.returnTo };
  }

  const oauthClient = createOAuthClient(oauthConfig);
  try {
    const tokenResponse = await oauthClient.getToken(args.code);
    oauthClient.setCredentials(tokenResponse.tokens);
    const gmailClient = google.gmail({
      version: "v1",
      auth: oauthClient,
    });
    const profile = await gmailClient.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress?.trim() || null;

    await kvStoreSet<GmailConnectionRecord>(
      GMAIL_CONNECTION_KEY,
      {
        accessToken: tokenResponse.tokens.access_token ?? null,
        refreshToken: tokenResponse.tokens.refresh_token ?? null,
        tokenType: tokenResponse.tokens.token_type ?? null,
        scope: tokenResponse.tokens.scope ?? null,
        expiryDateMs: tokenResponse.tokens.expiry_date ?? null,
        emailAddress,
        updatedAt: new Date().toISOString(),
      },
      { userId: args.userId },
    );
    return { ok: true, returnTo: stateResolution.returnTo, emailAddress };
  } catch {
    return { ok: false, reason: "token-exchange-failed", returnTo: stateResolution.returnTo };
  }
}

export async function disconnectGmail(userId: string): Promise<void> {
  const record = await readGmailConnectionRecord(userId);
  const oauthConfig = resolveGmailOAuthConfig();
  if (record && oauthConfig) {
    const oauthClient = createOAuthClient(oauthConfig);
    oauthClient.setCredentials({
      access_token: record.accessToken ?? undefined,
      refresh_token: record.refreshToken ?? undefined,
    });
    try {
      if (record.refreshToken) {
        await oauthClient.revokeToken(record.refreshToken);
      } else if (record.accessToken) {
        await oauthClient.revokeToken(record.accessToken);
      }
    } catch {
      // Best-effort revoke; clear local credentials regardless.
    }
  }
  await kvStoreDel(GMAIL_CONNECTION_KEY, { userId });
  await kvStoreDel(GMAIL_CONNECT_STATE_KEY, { userId });
}
