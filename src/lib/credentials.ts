import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { db } from "@/db/client";
import { clientCredentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "./password-hash";

/**
 * Shared credential verifier. Used by both middleware (Basic Auth) and
 * /api/auth/login (form POST) so the credential model stays in one place.
 *
 * Resolution order (first match wins):
 *   1. Admin via env BASIC_AUTH_USER / BASIC_AUTH_PASSWORD
 *   2. Per-client credentials in DB (client_credentials table) — admin
 *      can rotate via /dashboard/admin/clients/[id] without redeploy.
 *   3. Per-client credentials in env CLIENT_AUTH_<ID> = "user:pass"
 *      (legacy fallback, kept while orgs migrate to DB-backed model).
 *
 * Note: middleware uses Node runtime (export const config.runtime = 'nodejs'
 * in middleware.ts) so this module's pg-based DB client is reachable.
 */

export type CredentialCheck =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
  | { kind: "deny" };

async function verifyByDb(user: string, pass: string): Promise<CredentialCheck> {
  try {
    const rows = await db
      .select()
      .from(clientCredentials)
      .where(eq(clientCredentials.username, user));
    for (const row of rows) {
      const ok = await verifyPassword(pass, {
        hash: row.passwordHash,
        salt: row.passwordSalt,
        iterations: row.iterations,
      });
      if (ok) {
        const id = row.clientId;
        const meta = CLIENTS[id as keyof typeof CLIENTS];
        if (meta) {
          return { kind: "client", clientId: id, slug: meta.slug };
        }
      }
    }
  } catch (err) {
    console.error("[credentials] DB lookup failed (non-fatal):", err);
  }
  return { kind: "deny" };
}

function verifyByEnv(user: string, pass: string): CredentialCheck {
  const adminUser = process.env.BASIC_AUTH_USER;
  const adminPass = process.env.BASIC_AUTH_PASSWORD;
  if (adminUser && adminPass && user === adminUser && pass === adminPass) {
    return { kind: "admin" };
  }
  for (const id of CLIENT_IDS) {
    const raw = process.env[`CLIENT_AUTH_${id.toUpperCase()}`];
    if (!raw) continue;
    const sep = raw.indexOf(":");
    if (sep === -1) continue;
    const cu = raw.slice(0, sep);
    const cp = raw.slice(sep + 1);
    if (user === cu && pass === cp) {
      return { kind: "client", clientId: id, slug: CLIENTS[id].slug };
    }
  }
  return { kind: "deny" };
}

export async function verifyCredentials(user: string, pass: string): Promise<CredentialCheck> {
  // 1. Admin via env (highest precedence — not stored in DB for safety).
  const adminUser = process.env.BASIC_AUTH_USER;
  const adminPass = process.env.BASIC_AUTH_PASSWORD;
  if (adminUser && adminPass && user === adminUser && pass === adminPass) {
    return { kind: "admin" };
  }

  // 2. DB-backed client credentials.
  const dbCheck = await verifyByDb(user, pass);
  if (dbCheck.kind !== "deny") return dbCheck;

  // 3. Legacy env-based client credentials (fallback during migration).
  return verifyByEnv(user, pass);
}

/**
 * Synchronous variant for legacy callers that haven't been migrated yet.
 * Only checks env. New code should use the async verifyCredentials.
 * @deprecated use verifyCredentials (async) instead.
 */
export function verifyCredentialsSync(user: string, pass: string): CredentialCheck {
  return verifyByEnv(user, pass);
}

/** True if any credential is configured — used by middleware to decide
 *  whether to lock the site (no env = safety fallback open). */
export function anyCredentialConfigured(): boolean {
  if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD) return true;
  for (const id of CLIENT_IDS) {
    if (process.env[`CLIENT_AUTH_${id.toUpperCase()}`]) return true;
  }
  // We could also query DB here, but the safety fallback uses env only —
  // if env has no creds AND DB has none (e.g., fresh deploy), site stays
  // open by design rather than lock-out.
  return false;
}
