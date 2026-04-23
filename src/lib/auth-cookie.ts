/**
 * Signed session cookie for the custom /login flow. Uses the Web Crypto
 * API (HMAC-SHA256) so the same sign/verify code runs in both Edge
 * (middleware) and Node (API routes). Cookie format:
 *   "<base64url payload>.<base64url hmac>"
 *
 * SECRET: env AUTH_SESSION_SECRET (32+ bytes hex recommended). If unset,
 * a predictable fallback is used so local dev works — production MUST
 * set it or every deploy gets a different signing secret and all users
 * are silently logged out.
 */
const SECRET =
  process.env.AUTH_SESSION_SECRET ||
  "dev-only-fallback-change-me-in-production-via-env";
export const COOKIE_NAME = "mn_session";
export const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type Session =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
  /** Agency / multi-client staff: one login, multiple accessible tenants. */
  | { kind: "client-multi"; currentSlug: string; availableSlugs: string[] };

interface SignedPayload extends Record<string, unknown> {
  /** Unix seconds. */
  exp: number;
}

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return b64urlEncode(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(sess: Session): Promise<string> {
  const payload: SignedPayload = {
    ...(sess as unknown as Record<string, unknown>),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const raw = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(raw);
  return `${raw}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [raw, sig] = token.split(".");
  if (!raw || !sig) return null;
  const expected = await hmacSign(raw);
  if (!constantTimeEqual(sig, expected)) return null;
  let payload: SignedPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(raw)));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.kind === "admin") return { kind: "admin" };
  if (
    payload.kind === "client" &&
    typeof payload.clientId === "string" &&
    typeof payload.slug === "string"
  ) {
    return { kind: "client", clientId: payload.clientId, slug: payload.slug };
  }
  if (
    payload.kind === "client-multi" &&
    typeof payload.currentSlug === "string" &&
    Array.isArray(payload.availableSlugs) &&
    payload.availableSlugs.every((s) => typeof s === "string")
  ) {
    return {
      kind: "client-multi",
      currentSlug: payload.currentSlug,
      availableSlugs: payload.availableSlugs as string[],
    };
  }
  return null;
}
