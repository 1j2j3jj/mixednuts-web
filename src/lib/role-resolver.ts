import "server-only";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";

/**
 * Google OAuth → internal role mapping.
 *
 * Ownership model:
 *   - Admin       — email in env ADMIN_EMAILS (comma-separated list).
 *   - Client      — email matches exactly one CLIENT_EMAILS_<ID> list.
 *   - Multi-client— email matches two or more CLIENT_EMAILS_<ID> lists.
 *                   Triggers the /dashboard/select client-picker flow.
 *   - Deny        — email not recognised. Login page shows "access denied,
 *                   contact admin" with a support link.
 *
 * Better Auth verifies the Google identity owns the email; this
 * resolver maps the verified email to our tenant model. Future:
 * once invitation flow (Better Auth Organization plugin) is live for
 * Chakin etc., the env-based CLIENT_EMAILS_<ID> lookup will be
 * superseded by a DB-backed `member` table query.
 */

export type ClientMatch = { clientId: string; slug: string };

export type RoleResolution =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
  | { kind: "multi-client"; matches: ClientMatch[] }
  | { kind: "deny"; email: string };

function parseEmailList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveRoleByEmail(email: string | null | undefined): RoleResolution {
  const normalised = (email ?? "").trim().toLowerCase();
  if (!normalised) return { kind: "deny", email: "" };

  const adminList = parseEmailList(process.env.ADMIN_EMAILS);
  if (adminList.includes(normalised)) return { kind: "admin" };

  const matches: ClientMatch[] = [];
  for (const id of CLIENT_IDS) {
    const list = parseEmailList(process.env[`CLIENT_EMAILS_${id.toUpperCase()}`]);
    if (list.includes(normalised)) {
      matches.push({ clientId: id, slug: CLIENTS[id].slug });
    }
  }

  if (matches.length === 0) return { kind: "deny", email: normalised };
  if (matches.length === 1) return { kind: "client", clientId: matches[0].clientId, slug: matches[0].slug };
  return { kind: "multi-client", matches };
}
