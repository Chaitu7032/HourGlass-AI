import { cookies } from "next/headers";
import type { CalendarAvailabilitySnapshot, GoogleCalendarConnectionStatus } from "@/types/calendar";

const ACCESS_COOKIE = "hg_gc_access";
const REFRESH_COOKIE = "hg_gc_refresh";
const EXPIRY_COOKIE = "hg_gc_expiry";
const EMAIL_COOKIE = "hg_gc_email";
const CALENDARS_COOKIE = "hg_gc_cals";
const OAUTH_STATE_COOKIE = "hg_gc_state";
const SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.readonly"];

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type CalendarListResponse = {
  items?: Array<{ id: string; summary?: string; primary?: boolean }>;
};

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function getRedirectUri() {
  return getRequiredEnv("GOOGLE_CALENDAR_REDIRECT_URI");
}

function getClientId() {
  return getRequiredEnv("GOOGLE_CALENDAR_CLIENT_ID");
}

function getClientSecret() {
  return getRequiredEnv("GOOGLE_CALENDAR_CLIENT_SECRET");
}

function encodeCalendars(value: GoogleCalendarConnectionStatus["calendars"] = []) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCalendars(value?: string | null): NonNullable<GoogleCalendarConnectionStatus["calendars"]> {
  if (!value) return [];
  try {
    return (JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as NonNullable<GoogleCalendarConnectionStatus["calendars"]>) ?? [];
  } catch {
    return [];
  }
}

function decodeJwtPayload(token?: string) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isExpired(expiryIso?: string | null) {
  if (!expiryIso) return true;
  return new Date(expiryIso).getTime() <= Date.now() + 60_000;
}

async function googleTokenRequest(params: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google token exchange failed: ${message}`);
  }

  return (await response.json()) as TokenResponse;
}

async function listCalendars(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Unable to read Google calendars: ${message}`);
  }

  const payload = (await response.json()) as CalendarListResponse;
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? item.id,
    primary: Boolean(item.primary),
  }));
}

export function buildGoogleAuthUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function persistGoogleCalendarTokens(code: string) {
  const params = new URLSearchParams({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });

  const token = await googleTokenRequest(params);
  const expiry = new Date(Date.now() + token.expires_in * 1000).toISOString();
  const payload = decodeJwtPayload(token.id_token);
  const email = typeof payload?.email === "string" ? payload.email : undefined;
  const calendars = await listCalendars(token.access_token);

  const store = await cookies();
  store.set(ACCESS_COOKIE, token.access_token, cookieOptions);
  if (token.refresh_token) {
    store.set(REFRESH_COOKIE, token.refresh_token, cookieOptions);
  }
  store.set(EXPIRY_COOKIE, expiry, cookieOptions);
  if (email) {
    store.set(EMAIL_COOKIE, email, cookieOptions);
  }
  store.set(CALENDARS_COOKIE, encodeCalendars(calendars), cookieOptions);

  return { email, calendars, expiresAt: expiry };
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarConnectionStatus> {
  const token = await getValidGoogleAccessToken();
  const store = await cookies();
  return {
    connected: Boolean(token),
    email: store.get(EMAIL_COOKIE)?.value,
    calendars: decodeCalendars(store.get(CALENDARS_COOKIE)?.value),
    expiresAt: store.get(EXPIRY_COOKIE)?.value,
  };
}

export async function clearGoogleCalendarTokens() {
  const store = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EXPIRY_COOKIE, EMAIL_COOKIE, CALENDARS_COOKIE, OAUTH_STATE_COOKIE]) {
    store.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
}

export async function storeOAuthState(state: string) {
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, { ...cookieOptions, maxAge: 600 });
}

export async function readOAuthState() {
  const store = await cookies();
  return store.get(OAUTH_STATE_COOKIE)?.value;
}

export async function getValidGoogleAccessToken() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  const expiry = store.get(EXPIRY_COOKIE)?.value;

  if (accessToken && !isExpired(expiry)) {
    return accessToken;
  }

  if (!refreshToken) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const token = await googleTokenRequest(params);
  const nextExpiry = new Date(Date.now() + token.expires_in * 1000).toISOString();
  store.set(ACCESS_COOKIE, token.access_token, cookieOptions);
  store.set(EXPIRY_COOKIE, nextExpiry, cookieOptions);
  return token.access_token;
}

export async function fetchCalendarAvailability(rangeStart: string, rangeEnd: string, timezone: string): Promise<CalendarAvailabilitySnapshot | null> {
  const accessToken = await getValidGoogleAccessToken();
  const store = await cookies();
  const calendars = decodeCalendars(store.get(CALENDARS_COOKIE)?.value);
  const calendarIds = calendars.length > 0 ? calendars.map((calendar) => calendar.id) : ["primary"];

  if (!accessToken) {
    return null;
  }

  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: rangeStart,
      timeMax: rangeEnd,
      timeZone: timezone,
      items: calendarIds.map((id) => ({ id })),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Unable to read Google Calendar availability: ${message}`);
  }

  const payload = (await response.json()) as FreeBusyResponse;
  const busyBlocks = Object.values(payload.calendars ?? {})
    .flatMap((calendar) => calendar.busy ?? [])
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    connected: true,
    timezone,
    rangeStart,
    rangeEnd,
    busyBlocks,
    selectedCalendarIds: calendarIds,
    fetchedAt: new Date().toISOString(),
  };
}
