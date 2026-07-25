/**
 * Impersonation cookie: mn_impersonate
 *
 * Set only while an admin is viewing a client workspace as Owner.
 * Signed with the same HMAC-SHA256 KEY as mn_session (see F-4 note below
 * on why that's a known, documented limitation, not a full fix), but
 * domain-separated so a valid mn_session token can never verify as a
 * valid mn_impersonate token or vice versa (cross-protocol confusion).
 *
 * Payload (F-4, 2026-07-25 hardening): { slug, exp, iss, nonce }
 *   - slug:  target org being impersonated (unchanged)
 *   - exp:   Unix seconds expiry (unchanged, 2h TTL)
 *   - iss:   issuing admin's email — binds the token to WHO started the
 *            session, so it's self-describing for audit purposes even if
 *            separated from its originating request (previously the
 *            payload carried no issuer at all)
 *   - nonce: random per-token identifier. Not currently checked against
 *            a revocation list (see the deferred gap below) but present
 *            so that capability can be added later without another
 *            payload-shape migration.
 *
 * TTL: 2 hours (shorter than session — impersonation should be
 * intentional, not a standing elevated state).
 *
 * ── F-4 audit findings this hardens ──────────────────────────────────
 * 1. Domain separation: previously this file signed the SAME message
 *    shape family as auth-cookie.ts using the SAME secret with no
 *    separator — now hashed with a fixed "mn_impersonate:v1:" prefix
 *    mixed into the signed message, so cross-protocol replay (a session
 *    token being misparsed as an impersonation token or vice versa) is
 *    not possible even though the key material is shared.
 * 2. Issuer binding: the token is now self-describing — a copied token
 *    can be attributed to the admin who issued it without needing a
 *    separate DB lookup, and route.ts / exit-impersonation route.ts use
 *    this issuer for audit_log.actorEmail instead of always
 *    ADMIN_EMAILS[0] (see admin-actor.ts and those routes' own changes).
 *
 * ── Deferred, NOT fixed this phase (reported per task instructions) ──
 * - No independent signing secret: mn_impersonate still derives its key
 *   from AUTH_SESSION_SECRET, same as mn_session. Domain separation
 *   (above) prevents cross-protocol confusion, but rotating the
 *   impersonation secret specifically (e.g. to force-expire all
 *   outstanding impersonation tokens after a suspected leak) is not
 *   possible without also invalidating every client/admin session,
 *   since it's the same underlying secret. Needs its own env var.
 * - No server-side revocation: `nonce` is generated but not yet checked
 *   against a revocation list. exit-impersonation only deletes the
 *   client-side cookie — a copied token stays valid for up to its full
 *   2h TTL regardless of clicking "閲覧を終了". A real fix needs a
 *   DB-backed revocation table checked on verify, which (a) requires a
 *   schema migration and (b) adds a DB round-trip to every
 *   impersonation-gated request in middleware — out of scope for this
 *   phase; flagged in the Phase F report as a follow-up.
 */

const SECRET =
  process.env.AUTH_SESSION_SECRET ||
  "dev-only-fallback-change-me-in-production-via-env";

/** Domain-separation prefix mixed into the signed message — see doc comment above. */
const DOMAIN = "mn_impersonate:v1:";

export const IMPERSONATE_COOKIE_NAME = "mn_impersonate";
const TTL_SECONDS = 2 * 60 * 60; // 2 hours

export interface ImpersonatePayload {
  slug: string;
  /** Email of the admin who started this impersonation session. May be absent for tokens issued before this field existed. */
  issuer?: string;
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

// F-4: the domain prefix is mixed INTO the signed message (not just
// prepended to the token string), so it cannot be stripped by a caller —
// it changes what gets HMAC'd, not just what gets displayed.
async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(DOMAIN + message),
  );
  return b64urlEncode(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Random per-token identifier (F-4). Not yet checked against a revocation list — see the deferred-gap note in this file's doc comment. */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return b64urlEncode(bytes);
}

/**
 * @param slug   Target org slug being impersonated.
 * @param issuer Email of the admin starting the session — binds the
 *               token to who issued it (F-4). Required going forward;
 *               callers migrating from the old 1-arg signature should
 *               pass the real signed-in admin's email, resolved via
 *               resolveAdminActor() (src/lib/admin-actor.ts).
 */
export async function signImpersonate(
  slug: string,
  issuer: string,
): Promise<string> {
  const payload = {
    slug,
    issuer,
    nonce: generateNonce(),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const raw = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSign(raw);
  return `${raw}.${sig}`;
}

export async function verifyImpersonate(
  token: string | undefined | null,
): Promise<ImpersonatePayload | null> {
  if (!token) return null;
  const [raw, sig] = token.split(".");
  if (!raw || !sig) return null;
  const expected = await hmacSign(raw);
  if (!constantTimeEqual(sig, expected)) return null;
  let payload: { slug?: unknown; exp?: unknown; issuer?: unknown };
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(raw)));
  } catch {
    return null;
  }
  if (
    typeof payload.exp !== "number" ||
    payload.exp < Math.floor(Date.now() / 1000)
  )
    return null;
  if (typeof payload.slug !== "string") return null;
  return {
    slug: payload.slug,
    ...(typeof payload.issuer === "string" ? { issuer: payload.issuer } : {}),
  };
}
