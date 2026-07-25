import "server-only";
import { sql, eq } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { invitation, auditLog } from "@/db/schema";

/**
 * Single point of coherence between the application code and
 * drizzle/0003_phase_f_invitation_hardening.sql — a migration that adds 7
 * columns to `invitation` and 1 to `audit_log`, and is DELIBERATELY NOT YET
 * RUN (needs CEO approval; see that file's header comment). Every read or
 * write anywhere in the app that touches one of those 8 columns must go
 * through this module instead of querying `invitation`/`auditLog` directly,
 * so the branch behaves correctly whether or not that migration has landed
 * on the connected database — and upgrades itself automatically the moment
 * it does, with no second code change.
 *
 * Why this needs to be a shared module rather than "just make the column
 * access conditional" at each call site: this project's drizzle-orm
 * (0.45.2, node-postgres driver) has two behaviours that make the obvious
 * per-call-site fix silently wrong, confirmed empirically via `.toSQL()`
 * against this exact schema (see phase-f-columns.test.ts):
 *
 *   1. `db.select().from(invitation)` (bare, no explicit projection) lists
 *      EVERY column configured on the `invitation` table object in the
 *      generated SQL — it is not a literal `SELECT *`. A caller that only
 *      ever reads `.status` still 42703s pre-migration if it uses a bare
 *      `.select()`. Fix: never use a bare `.select()` on `invitation` or
 *      `auditLog`; always pass an explicit projection object naming only
 *      the columns actually needed.
 *
 *   2. `db.insert(invitation).values({...})` ALSO lists every column
 *      configured on the table object passed to `.insert()`, using the SQL
 *      keyword DEFAULT for any key the JS object omitted. Postgres still
 *      resolves that DEFAULT against a real column name, so an insert that
 *      never mentions `tokenHash` in its JS object still emits
 *      `"token_hash"` in the SQL text and still 42703s pre-migration. This
 *      is why the "conditionally spread the key into `.values()` only when
 *      truthy" pattern (as originally written in audit.ts for
 *      impersonatedOrgSlug) does NOT guard an INSERT the way it guards an
 *      UPDATE — see point 3.
 *
 *      The fix used below (`invitationPreF` / `auditLogPreF`): a second
 *      pgTable object bound to the SAME physical table name but mapping
 *      only the columns that exist BEFORE migration 0003. Drizzle derives
 *      the referenced-column list from the JS table object passed to
 *      `.insert()`, not from the table name, so inserting through the
 *      narrower object never mentions a Phase F column at all. These two
 *      objects are hand-kept in sync with the "base" fields of
 *      `invitation`/`auditLog` in schema.ts — drift would surface as a
 *      failing `.toSQL()` assertion in phase-f-columns.test.ts (wrong
 *      column list), not a silent bug.
 *
 *   3. By contrast, `db.update(invitation).set({...})` only ever
 *      references the keys actually present in the `.set()` object — an
 *      update that never mentions `revokedAt` never emits `"revoked_at"`
 *      in the SQL. UPDATE call sites are therefore fixed in place with a
 *      plain conditional on the `.set()` object, no parallel table object
 *      needed (see markInvitationRevoked / recordInvitationEmailResult
 *      below). DELETE behaves the same way (no fix needed anywhere in this
 *      codebase — verified: neither of the two DELETE call sites on these
 *      tables references a Phase F column in WHERE/RETURNING).
 *
 * Every write helper below is split into a synchronous `buildXQuery(...,
 * columnsAvailable)` (pure query construction — safe to unit-test via
 * `.toSQL()` with no DB connection) and an async wrapper that resolves
 * `phaseFColumnsAvailable()` and awaits the built query. Read call sites use
 * the small field-fragment helpers at the bottom the same way.
 */

// ---------------------------------------------------------------------------
// Capability probe
// ---------------------------------------------------------------------------

let cached: Promise<boolean> | null = null;

/**
 * Whether migration 0003 has been applied to the connected database.
 * Checks BOTH the `invitation` and `audit_log` additions (the migration
 * file applies both in one script, normally inside a single transaction —
 * see its header — so in practice they land together; checking both rather
 * than just one is a cheap extra guard against a hand-run, partially
 * applied migration).
 *
 * Cached for the lifetime of the process after the first successful probe:
 * schema doesn't change under a running instance, only a fresh deploy after
 * the migration runs would flip this, and that naturally gets a fresh
 * process (new Vercel function instance). A FAILED probe (e.g. a transient
 * connectivity hiccup) is deliberately NOT cached, so the next caller
 * retries instead of getting stuck reporting "not migrated" forever because
 * of one bad connection attempt.
 */
export function phaseFColumnsAvailable(): Promise<boolean> {
  if (!cached) {
    cached = probeColumnsExist().catch((err: unknown) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}

async function probeColumnsExist(): Promise<boolean> {
  const result = await db.execute<{
    invitation_ok: boolean;
    audit_log_ok: boolean;
  }>(sql`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'invitation'
          AND column_name = 'token_hash'
      ) AS invitation_ok,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'audit_log'
          AND column_name = 'impersonated_org_slug'
      ) AS audit_log_ok
  `);
  const row = result.rows[0];
  return row?.invitation_ok === true && row?.audit_log_ok === true;
}

/**
 * Test-only seam: force the next `phaseFColumnsAvailable()` call to a known
 * value without touching a real DB. Pass `null` to reset back to "unprobed"
 * (the next call will attempt a real probe again).
 */
export function __setPhaseFColumnsAvailableForTests(
  value: boolean | null,
): void {
  cached = value === null ? null : Promise.resolve(value);
}

// ---------------------------------------------------------------------------
// Narrow "pre-migration" table objects — INSERT only (see point 2 above)
// ---------------------------------------------------------------------------

/**
 * Mirrors `invitation` in schema.ts MINUS the Phase F columns — i.e. exactly
 * drizzle/0000_init_better_auth.sql's shape. Used only for INSERT (see
 * module doc comment point 2). Keep in sync by hand with schema.ts's base
 * `invitation` columns; a mismatch is caught by phase-f-columns.test.ts.
 */
const invitationPreF = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id").notNull(),
});

/**
 * Mirrors `auditLog` in schema.ts MINUS `impersonatedOrgSlug`. Used only for
 * INSERT. Keep in sync by hand with schema.ts's base `auditLog` columns.
 */
const auditLogPreF = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  targetOrgId: text("target_org_id"),
  targetOrgSlug: text("target_org_slug"),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Executor type — helpers below run either against top-level `db` or inside
// an in-flight `db.transaction(async (tx) => ...)` (createTenantInvites'
// bulk path locks the org row FOR UPDATE and does its inserts/updates on
// `tx`, not `db`).
// ---------------------------------------------------------------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = typeof db | Tx;

// ---------------------------------------------------------------------------
// Invitation writes
// ---------------------------------------------------------------------------

export interface NewInvitationRow {
  id: string;
  organizationId: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  inviterId: string;
  /**
   * F-3 raw-token hash. Always pass the real hash — callers never need to
   * branch on migration state themselves; buildInsertInvitationQuery drops
   * it pre-migration, which leaves the row indistinguishable from a legacy
   * pre-hardening row (tokenHash === null). That is not a workaround, it is
   * the documented fallback: invite-token.ts / accept-invitation route.ts
   * already treat a null tokenHash as "match by id alone."
   */
  tokenHash: string;
}

export function buildInsertInvitationQuery(
  exec: DbOrTx,
  row: NewInvitationRow,
  columnsAvailable: boolean,
) {
  if (columnsAvailable) {
    return exec.insert(invitation).values(row);
  }
  return exec.insert(invitationPreF).values({
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt,
    inviterId: row.inviterId,
  });
}

/** Insert a new invitation row. Safe whether or not migration 0003 has run. */
export async function insertInvitationRow(
  exec: DbOrTx,
  row: NewInvitationRow,
): Promise<void> {
  const columnsAvailable = await phaseFColumnsAvailable();
  await buildInsertInvitationQuery(exec, row, columnsAvailable);
}

export function buildMarkInvitationRevokedQuery(
  exec: DbOrTx,
  id: string,
  columnsAvailable: boolean,
) {
  return exec
    .update(invitation)
    .set(
      columnsAvailable
        ? { status: "cancelled", revokedAt: new Date() }
        : { status: "cancelled" },
    )
    .where(eq(invitation.id, id));
}

/**
 * Mark an invitation cancelled (the "revoke" shape used by revoke / resend /
 * reissue / re-invite-replaces-pending paths). Sets revokedAt only when the
 * column exists; status='cancelled' alone already blocks reuse either way
 * (see schema.ts's revokedAt doc comment — revokedAt only adds *when*, for
 * audit/debug, it never gates access by itself).
 */
export async function markInvitationRevoked(
  exec: DbOrTx,
  id: string,
): Promise<void> {
  const columnsAvailable = await phaseFColumnsAvailable();
  await buildMarkInvitationRevokedQuery(exec, id, columnsAvailable);
}

export interface InvitationEmailResultInput {
  emailStatus: "accepted" | "failed" | "not_configured";
  emailProviderMessageId?: string | null;
  emailLastError?: string | null;
}

export function buildRecordInvitationEmailResultQuery(
  id: string,
  result: InvitationEmailResultInput,
  columnsAvailable: boolean,
) {
  if (!columnsAvailable) return null;
  return db
    .update(invitation)
    .set({
      emailStatus: result.emailStatus,
      emailProviderMessageId: result.emailProviderMessageId ?? null,
      emailAttemptCount: 1,
      emailLastAttemptAt: new Date(),
      emailLastError: result.emailLastError ?? null,
    })
    .where(eq(invitation.id, id));
}

/**
 * Persist the honest email-send outcome (F-2) onto an invitation row.
 * No-ops pre-migration — there is nowhere to persist it yet, which matches
 * pre-Phase-F behaviour exactly (no email-status persistence existed at
 * all before this phase). Always called post-transaction with plain `db` at
 * every current call site, so unlike the two helpers above this does not
 * need a DbOrTx parameter.
 */
export async function recordInvitationEmailResult(
  id: string,
  result: InvitationEmailResultInput,
): Promise<void> {
  const columnsAvailable = await phaseFColumnsAvailable();
  const query = buildRecordInvitationEmailResultQuery(
    id,
    result,
    columnsAvailable,
  );
  if (query) await query;
}

// ---------------------------------------------------------------------------
// audit_log writes
// ---------------------------------------------------------------------------

export interface NewAuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  targetOrgId: string | null;
  targetOrgSlug: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  /** Null when the write happened outside an active impersonation session. */
  impersonatedOrgSlug: string | null;
}

export function buildInsertAuditLogQuery(
  row: NewAuditLogRow,
  columnsAvailable: boolean,
) {
  if (columnsAvailable) {
    return db.insert(auditLog).values(row);
  }
  return db.insert(auditLogPreF).values({
    id: row.id,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    targetOrgId: row.targetOrgId,
    targetOrgSlug: row.targetOrgSlug,
    action: row.action,
    metadata: row.metadata,
    // impersonatedOrgSlug silently dropped — no column to write it to yet.
  });
}

/** Insert an audit_log row. Safe whether or not migration 0003 has run. */
export async function insertAuditLogRow(row: NewAuditLogRow): Promise<void> {
  const columnsAvailable = await phaseFColumnsAvailable();
  await buildInsertAuditLogQuery(row, columnsAvailable);
}

// ---------------------------------------------------------------------------
// Read-side field fragments — spread into an explicit `.select({...})`
// projection (never a bare `.select()` — see module doc comment point 1).
// When unavailable, each fragment is a literal SQL NULL/0, so the column
// itself is never referenced; when available, it's the real column, so the
// hardening lights up automatically once the migration lands.
// ---------------------------------------------------------------------------

export function invitationTokenHashField(columnsAvailable: boolean) {
  return columnsAvailable ? invitation.tokenHash : sql<string | null>`NULL`;
}

export function invitationEmailStatusFields(columnsAvailable: boolean) {
  return columnsAvailable
    ? {
        emailStatus: invitation.emailStatus,
        emailAttemptCount: invitation.emailAttemptCount,
        emailLastAttemptAt: invitation.emailLastAttemptAt,
      }
    : {
        emailStatus: sql<string | null>`NULL`,
        emailAttemptCount: sql<number>`0`,
        emailLastAttemptAt: sql<Date | null>`NULL`,
      };
}
