const GOOGLE_SECURETOKEN_JWKS =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export const SESSION_COOKIE_NAME = "hg_session";

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

interface JwkResponse {
  keys: Jwk[];
}

export interface VerifiedFirebaseSession {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  exp: number;
  iat: number;
  authTime: number;
}

let cachedKeys: Map<string, Jwk> | null = null;
let cachedKeysAt = 0;

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeJwtPart<T>(value: string): T {
  const bytes = base64UrlToUint8Array(value);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
}

async function getGoogleSigningKeys() {
  const now = Date.now();
  if (cachedKeys && now - cachedKeysAt < 60 * 60 * 1000) {
    return cachedKeys;
  }

  const response = await fetch(GOOGLE_SECURETOKEN_JWKS, {
    headers: { Accept: "application/json" },
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error("Unable to load Firebase signing keys.");
  }

  const payload = (await response.json()) as JwkResponse;
  const keys = new Map<string, Jwk>();

  for (const key of payload.keys) {
    if (key.kid) keys.set(key.kid, key);
  }

  cachedKeys = keys;
  cachedKeysAt = now;
  return keys;
}

function getFirebaseProjectId() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }
  return projectId;
}

export async function verifyFirebaseToken(token: string): Promise<VerifiedFirebaseSession | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart<{ alg?: string; kid?: string; typ?: string }>(encodedHeader);
  const payload = decodeJwtPart<Record<string, unknown>>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) return null;

  const projectId = getFirebaseProjectId();
  const issuer = `https://securetoken.google.com/${projectId}`;
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (
    payload.aud !== projectId ||
    payload.iss !== issuer ||
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.auth_time !== "number" ||
    payload.exp <= nowInSeconds
  ) {
    return null;
  }

  const keys = await getGoogleSigningKeys();
  const jwk = keys.get(header.kid);
  if (!jwk) return null;

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlToUint8Array(encodedSignature);
  const isValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, data);

  if (!isValid) return null;

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    exp: payload.exp,
    iat: payload.iat,
    authTime: payload.auth_time,
  };
}
