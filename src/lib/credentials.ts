import { CLIENTS, CLIENT_IDS } from "@/config/clients";

/**
 * Shared credential verifier. Used by both middleware (Basic Auth
 * fallback) and /api/auth/login (form POST) so the credential model
 * stays in one place.
 *
 * Env layout:
 *   BASIC_AUTH_USER / BASIC_AUTH_PASSWORD     — admin
 *   CLIENT_AUTH_<ID> = "user:pass"            — per-client (one env var each)
 */

export type CredentialCheck =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
  | { kind: "deny" };

export function verifyCredentials(user: string, pass: string): CredentialCheck {
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

/** True if any credential is configured — used by middleware to decide
 *  whether to lock the site (no env = safety fallback open). */
export function anyCredentialConfigured(): boolean {
  if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD) return true;
  for (const id of CLIENT_IDS) {
    if (process.env[`CLIENT_AUTH_${id.toUpperCase()}`]) return true;
  }
  return false;
}
