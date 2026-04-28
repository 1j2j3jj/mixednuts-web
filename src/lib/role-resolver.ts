import "server-only";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { db } from "@/db/client";
import {
  user as userTable,
  member as memberTable,
  organization as organizationTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Google OAuth → internal role mapping.
 *
 * Resolution order (first match wins):
 *   1. Admin       — email in env ADMIN_EMAILS (comma-separated list).
 *   2. Client (env) — email matches CLIENT_EMAILS_<ID> list.
 *   3. Client (DB)  — Better Auth Organization member row exists for this email,
 *                     and the org.slug maps to a known ClientId. Multi-org →
 *                     multi-client. Added 2026-04-28 to make invitation flow
 *                     persistent across logins (post invitation accept, the
 *                     env-based lookup alone deny'd returning users).
 *   4. Multi-client— email matches two or more sources combined (env + DB).
 *                     Triggers /dashboard/select picker.
 *   5. Deny         — email not recognised. Login page shows "access denied".
 *
 * Better Auth verifies the Google identity owns the email; this resolver
 * maps the verified email to our tenant model.
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

/**
 * Look up Organization memberships for this email and map each membership's
 * org slug to a ClientId via the CLIENTS config. Returns deduped ClientMatch
 * rows. A user can be a member of multiple orgs → multi-client login.
 */
async function resolveByDbMembership(normalisedEmail: string): Promise<ClientMatch[]> {
  // Single round-trip: user → member → organization
  const rows = await db
    .select({
      orgSlug: organizationTable.slug,
    })
    .from(userTable)
    .innerJoin(memberTable, eq(memberTable.userId, userTable.id))
    .innerJoin(organizationTable, eq(organizationTable.id, memberTable.organizationId))
    .where(eq(userTable.email, normalisedEmail));

  if (rows.length === 0) return [];

  const matches: ClientMatch[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.orgSlug) continue;
    // Org slug is intentionally aligned with client slug at invitation time
    // (see admin/actions.ts ensureOrgForClient). Find the matching ClientId.
    const matchedId = CLIENT_IDS.find((id) => CLIENTS[id].slug === row.orgSlug);
    if (!matchedId) continue;
    if (seen.has(matchedId)) continue;
    seen.add(matchedId);
    matches.push({ clientId: matchedId, slug: CLIENTS[matchedId].slug });
  }
  return matches;
}

export async function resolveRoleByEmail(
  email: string | null | undefined
): Promise<RoleResolution> {
  const normalised = (email ?? "").trim().toLowerCase();
  if (!normalised) return { kind: "deny", email: "" };

  // 1. Admin via env (highest precedence)
  const adminList = parseEmailList(process.env.ADMIN_EMAILS);
  if (adminList.includes(normalised)) return { kind: "admin" };

  // 2-3. Collect client matches from env (legacy) + DB (post-invitation)
  const matches: ClientMatch[] = [];
  const seen = new Set<string>();

  for (const id of CLIENT_IDS) {
    const list = parseEmailList(process.env[`CLIENT_EMAILS_${id.toUpperCase()}`]);
    if (list.includes(normalised) && !seen.has(id)) {
      seen.add(id);
      matches.push({ clientId: id, slug: CLIENTS[id].slug });
    }
  }

  try {
    const dbMatches = await resolveByDbMembership(normalised);
    for (const m of dbMatches) {
      if (!seen.has(m.clientId)) {
        seen.add(m.clientId);
        matches.push(m);
      }
    }
  } catch (err) {
    // DB error must not block env-based resolution. Log and continue.
    console.error("[role-resolver] DB membership lookup failed:", err);
  }

  if (matches.length === 0) return { kind: "deny", email: normalised };
  if (matches.length === 1) {
    return { kind: "client", clientId: matches[0].clientId, slug: matches[0].slug };
  }
  return { kind: "multi-client", matches };
}
