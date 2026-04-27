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
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";

export interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  targetOrgId?: string;
  targetOrgSlug?: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      targetOrgId: entry.targetOrgId ?? null,
      targetOrgSlug: entry.targetOrgSlug ?? null,
      action: entry.action,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    // Non-blocking: log the failure but don't propagate.
    console.error("[audit] Failed to write audit log:", e);
  }
}
