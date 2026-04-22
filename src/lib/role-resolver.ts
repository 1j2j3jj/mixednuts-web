import "server-only";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";

/**
 * Google OAuth → internal role mapping.
 *
 * Ownership model (Phase 2, with Clerk):
 *   - Admin  — email in env ADMIN_EMAILS (comma-separated list).
 *   - Client — email → clientId lookup via env CLIENT_EMAILS_<ID>=(list).
 *              A single OAuth identity can belong to exactly one client
 *              for now (no multi-client operators); extend to an array
 *              if agency/holding-group use cases arise.
 *   - Deny   — email not recognised. Login page shows "access denied,
 *              contact admin" with a support link.
 *
 * This resolver is Clerk-agnostic; Clerk's role here is only to verify
 * "does this Google identity really own this email". The mapping to
 * our tenant model stays in our code so role changes don't require
 * redeploying Clerk metadata.
 */

export type RoleResolution =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
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

  for (const id of CLIENT_IDS) {
    const list = parseEmailList(process.env[`CLIENT_EMAILS_${id.toUpperCase()}`]);
    if (list.includes(normalised)) {
      return { kind: "client", clientId: id, slug: CLIENTS[id].slug };
    }
  }

  return { kind: "deny", email: normalised };
}
