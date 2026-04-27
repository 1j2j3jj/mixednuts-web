/**
 * Impersonation cookie: mn_impersonate
 *
 * Set only while an admin is viewing a client workspace as Owner.
 * Signed with the same HMAC-SHA256 mechanism as mn_session, but separate
 * so the admin session itself is never mutated.
 *
 * Payload: { slug: string, exp: number }
 * TTL: 2 hours (shorter than session — impersonation should be intentional).
 */

const SECRET =
  process.env.AUTH_SESSION_SECRET ||
  "dev-only-fallback-change-me-in-production-via-env";

export const IMPERSONATE_COOKIE_NAME = "mn_impersonate";
const TTL_SECONDS = 2 * 60 * 60; // 2 hours

export interface ImpersonatePayload {
  slug: string;
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

export async function signImpersonate(slug: string): Promise<string> {
  const payload = { slug, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const raw = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(raw);
  return `${raw}.${sig}`;
}

export async function verifyImpersonate(
  token: string | undefined | null
): Promise<ImpersonatePayload | null> {
  if (!token) return null;
  const [raw, sig] = token.split(".");
  if (!raw || !sig) return null;
  const expected = await hmacSign(raw);
  if (!constantTimeEqual(sig, expected)) return null;
  let payload: { slug?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(raw)));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (typeof payload.slug !== "string") return null;
  return { slug: payload.slug };
}
