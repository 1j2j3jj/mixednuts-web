/**
 * Audit log writer utility.
 *
 * Inserts an immutable row into the audit_log table. Called from server
 * actions and Route Handlers wherever admin-relevant events occur:
 *   - invitation.created / invitation.revoked
 *   - member.removed
 *   - impersonation.started / impersonation.ended
 *   - quota.updated
 *   - role.changed
 *
 * Never throws — a failed audit write should not block the primary
 * operation. Errors are logged to console for observability.
 */
import { insertAuditLogRow } from "@/db/phase-f-columns";

export interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  targetOrgId?: string;
  targetOrgSlug?: string;
  action: string;
  metadata?: Record<string, unknown>;
  /**
   * F-4 (2026-07-25): slug of the client being impersonated when this
   * action happened, or undefined/null when the admin acted directly.
   * Requires drizzle/0003_phase_f_invitation_hardening.sql (NOT YET RUN)
   * — until that migration runs, this column doesn't exist in the live
   * DB. Callers should source this from resolveAdminActor()
   * (src/lib/admin-actor.ts), which returns null for the (large) common
   * case of a direct, non-impersonating admin action.
   *
   * CORRECTION (2026-07-25, post-audit fix): this file previously only
   * included this key in the INSERT `.values()` object when truthy, on
   * the theory that "the common case (not impersonating) never
   * references the new column, so ordinary admin writes keep working
   * pre-migration." That reasoning does not hold for this ORM/driver:
   * `db.insert(table).values({...})` lists EVERY column configured on
   * the table object in the generated SQL (using the keyword DEFAULT for
   * any omitted key) — confirmed via `.toSQL()` — so the column was
   * referenced, and every audit write 42703'd, regardless of whether
   * this key was present. The try/catch below meant that failure was
   * silently swallowed rather than surfaced: audit logging was fully
   * dark for every action (not just impersonation ones) until migration
   * 0003 landed. insertAuditLogRow (src/db/phase-f-columns.ts) now
   * routes the write through a narrower pre-migration table object
   * instead, so this actually succeeds pre-migration (impersonatedOrgSlug
   * silently dropped, exactly like a column that doesn't exist yet) and
   * upgrades automatically once the migration runs.
   */
  impersonatedOrgSlug?: string | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await insertAuditLogRow({
      id: crypto.randomUUID(),
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      targetOrgId: entry.targetOrgId ?? null,
      targetOrgSlug: entry.targetOrgSlug ?? null,
      action: entry.action,
      metadata: entry.metadata ?? null,
      impersonatedOrgSlug: entry.impersonatedOrgSlug ?? null,
    });
  } catch (e) {
    // Non-blocking: log the failure but don't propagate.
    console.error("[audit] Failed to write audit log:", e);
  }
}
