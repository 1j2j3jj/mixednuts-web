import "server-only";

/**
 * Invite token generation/hashing (F-3, Phase F security audit, 2026-07-25).
 *
 * Previously the invitation row's `id` (a crypto.randomUUID() primary key)
 * doubled as the bearer secret embedded in the accept URL
 * (`?id=<id>`), and was looked up with a plain `WHERE id = ?` — i.e. the
 * "password" for the invite was stored in plaintext, readable by anyone
 * with DB read access (backups, replicas, another admin, a future
 * analytics export).
 *
 * Fix: split the identifier from the secret.
 *   - `id`        — non-secret DB primary key, safe to log/query by.
 *   - raw token   — a separate high-entropy secret, generated here,
 *                   embedded in the URL, NEVER persisted.
 *   - `tokenHash` — SHA-256 of the raw token; THIS is what we store and
 *                   compare against on accept.
 *
 * Legacy rows created before the `token_hash` migration (see
 * drizzle/0003_phase_f_invitation_hardening.sql, NOT YET RUN) have
 * `tokenHash === null`. The accept route treats a null tokenHash as
 * "pre-migration row, fall back to id-only matching" so in-flight
 * invitations don't break the moment this code deploys ahead of the
 * migration — see accept-invitation/route.ts for that fallback. Once the
 * migration has run and all legacy rows have expired (max 14 days), every
 * row will have a hash and the fallback becomes dead code that can be
 * removed.
 */

const encoder = new TextEncoder();

/**
 * Generate a new high-entropy invite secret: 256 bits from the platform
 * CSPRNG, base64url-encoded. Independent of `id` — a UUID is a fine
 * non-secret primary key but was never meant to double as a bearer
 * credential.
 */
export function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 of the raw token, hex-encoded. This — never the raw token — is what we persist. */
export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison (hash vs. hash) — avoids timing side-channels on the lookup. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Build the accept-invitation URL for a single invitation: id (non-secret) + raw token (secret, query-only). */
export function buildInviteUrl(
  baseURL: string,
  id: string,
  token: string,
): string {
  return `${baseURL}/api/auth/accept-invitation?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
}

/** Build the accept-invitation URL for a combined multi-org batch: ids + tokens, position-aligned. */
export function buildCombinedInviteUrl(
  baseURL: string,
  entries: Array<{ id: string; token: string }>,
): string {
  const ids = entries.map((e) => encodeURIComponent(e.id)).join(",");
  const tokens = entries.map((e) => encodeURIComponent(e.token)).join(",");
  return `${baseURL}/api/auth/accept-invitation?ids=${ids}&tokens=${tokens}`;
}
