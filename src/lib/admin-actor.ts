import "server-only";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/invite-rate-limit";

/**
 * Resolve the real signed-in admin's email + whether this request is
 * currently impersonating a client tenant, for accurate audit_log
 * attribution (F-4, Phase F security audit, 2026-07-25).
 *
 * Prior state: most admin-scoped writeAuditLog call sites hardcoded
 * actorEmail to `ADMIN_EMAILS.split(",")[0]` — i.e. always the FIRST
 * configured admin, never whoever actually signed in. With multiple
 * admins, every audit_log row for impersonation.started/ended,
 * member.removed, member.activated, quota.updated, and admin-panel
 * invitation actions was attributed to the same static identity, making
 * it impossible to answer "which admin did this" from the audit trail.
 *
 * middleware.ts already forwards the real signed-in admin's email via
 * the `x-viewer-email` header (set from the mn_session payload — see
 * auth-cookie.ts's `Session` type, `kind: "admin"` carries an optional
 * `email`). This mirrors the pattern already used correctly in
 * admin/masters/actions.ts's `requireAdminEmail()`, just without the
 * extra Better Auth session round-trip (the header is enough — it's set
 * at login and forwarded on every request by middleware).
 *
 * Falls back to ADMIN_EMAILS[0] only for sessions that predate
 * email-carrying admin cookies (should be rare/nonexistent in practice,
 * kept for defensive compatibility).
 */
export async function resolveAdminActor(): Promise<{
  actorEmail: string;
  /** Slug of the client currently being impersonated, or null if this admin is acting directly (not impersonating). */
  impersonatedOrgSlug: string | null;
  /** Best-effort caller IP (see getClientIp) — for the per-IP burst limiter, not for authorization. */
  ip: string | null;
}> {
  const h = await headers();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const actorEmail =
    h.get("x-viewer-email") || adminEmails[0] || "admin@mixednuts-inc.com";
  const impersonatedOrgSlug = h.get("x-impersonated-slug");
  return {
    actorEmail,
    impersonatedOrgSlug: impersonatedOrgSlug || null,
    ip: getClientIp(h),
  };
}
