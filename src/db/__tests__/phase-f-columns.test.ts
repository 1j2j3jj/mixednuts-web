import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/db/client";
import { invitation, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  buildInsertInvitationQuery,
  buildMarkInvitationRevokedQuery,
  buildRecordInvitationEmailResultQuery,
  buildInsertAuditLogQuery,
  invitationTokenHashField,
  invitationEmailStatusFields,
  phaseFColumnsAvailable,
  __setPhaseFColumnsAvailableForTests,
  type NewInvitationRow,
  type NewAuditLogRow,
} from "@/db/phase-f-columns";

/**
 * Regression suite for the Item 1 release blocker (2026-07-25 Phase F
 * verifier finding): drizzle/0003_phase_f_invitation_hardening.sql adds 7
 * columns to `invitation` and 1 to `audit_log`, and is deliberately NOT YET
 * run. This project's drizzle-orm (0.45.2, node-postgres driver) has two
 * behaviours that make "just reference the new columns, they're nullable"
 * unsafe until that migration lands — both reproduced/proven below via
 * `.toSQL()`, which builds real SQL text WITHOUT opening a DB connection
 * (vitest.config.ts's dummy DATABASE_URL only lets a `pg.Pool` construct,
 * never query — see that file's comment, and the "underlying drizzle-orm
 * behaviour" describe block at the bottom of this file):
 *
 *   1. `db.select().from(invitation)` (bare, no explicit projection) lists
 *      every column configured on the table object in the generated SQL —
 *      it is not a literal `SELECT *`.
 *   2. `db.insert(invitation).values({...})` ALSO lists every configured
 *      column, using SQL DEFAULT for any key the JS object omitted — so
 *      merely omitting a key does not stop it from being referenced.
 *
 * What this suite covers: every write/read helper in
 * src/db/phase-f-columns.ts generates SQL that never mentions a Phase F
 * column when `columnsAvailable=false`, and correctly DOES when `true` —
 * i.e. the "hardening lights up automatically once the migration lands,
 * with no second code change" requirement. It also reproduces the exact
 * reasoning error in audit.ts's original (pre-fix) comment, to document
 * concretely why that pattern doesn't work.
 *
 * What this suite does NOT cover: an actual Postgres connection (none is
 * available in this test environment) — so it cannot observe a real
 * pre-migration `column does not exist` failure or a real post-migration
 * success. It proves the SQL text generated for each code path is correct;
 * that Postgres raises 42703 for a column absent from the schema, and
 * succeeds when present, is standard, well-established Postgres behaviour
 * this suite does not re-verify. It also does not cover whether every call
 * site actually USES these helpers instead of querying `invitation`/
 * `auditLog` directly — see phase-f-unmigrated-column-guard.test.ts for
 * that complementary source-level check.
 */

const NEW_INVITATION_COLUMNS = [
  "token_hash",
  "revoked_at",
  "email_status",
  "email_provider_message_id",
  "email_attempt_count",
  "email_last_attempt_at",
  "email_last_error",
];
const NEW_AUDIT_LOG_COLUMN = "impersonated_org_slug";

afterEach(() => {
  __setPhaseFColumnsAvailableForTests(null);
});

describe("buildInsertInvitationQuery", () => {
  const row: NewInvitationRow = {
    id: "inv-1",
    organizationId: "org-1",
    email: "a@example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date("2026-08-01T00:00:00Z"),
    inviterId: "user-1",
    tokenHash: "deadbeef",
  };

  it("pre-migration: references none of the 7 new columns, but still inserts the base row", () => {
    const { sql } = buildInsertInvitationQuery(db, row, false).toSQL();
    for (const col of NEW_INVITATION_COLUMNS) {
      expect(sql).not.toContain(`"${col}"`);
    }
    expect(sql).toContain('insert into "invitation"');
    expect(sql).toContain('"organization_id"');
    expect(sql).toContain('"inviter_id"');
  });

  it("post-migration: references tokenHash with the real value (hardening takes effect, no second code change)", () => {
    const { sql, params } = buildInsertInvitationQuery(db, row, true).toSQL();
    expect(sql).toContain('"token_hash"');
    expect(params).toContain("deadbeef");
  });
});

describe("buildMarkInvitationRevokedQuery", () => {
  it("pre-migration: sets status but never references revoked_at", () => {
    const { sql } = buildMarkInvitationRevokedQuery(db, "inv-1", false).toSQL();
    expect(sql).toContain('"status"');
    expect(sql).not.toContain("revoked_at");
  });

  it("post-migration: also sets revoked_at", () => {
    const { sql } = buildMarkInvitationRevokedQuery(db, "inv-1", true).toSQL();
    expect(sql).toContain('"status"');
    expect(sql).toContain('"revoked_at"');
  });
});

describe("buildRecordInvitationEmailResultQuery", () => {
  const result = {
    emailStatus: "accepted" as const,
    emailProviderMessageId: "msg-1",
    emailLastError: null,
  };

  it("pre-migration: is a no-op — no query at all, matching pre-Phase-F behaviour (nowhere to persist it yet)", () => {
    expect(
      buildRecordInvitationEmailResultQuery("inv-1", result, false),
    ).toBeNull();
  });

  it("post-migration: writes all five email fields", () => {
    const query = buildRecordInvitationEmailResultQuery("inv-1", result, true);
    expect(query).not.toBeNull();
    const { sql, params } = query!.toSQL();
    expect(sql).toContain('"email_status"');
    expect(sql).toContain('"email_provider_message_id"');
    expect(sql).toContain('"email_attempt_count"');
    expect(sql).toContain('"email_last_attempt_at"');
    expect(sql).toContain('"email_last_error"');
    expect(params).toContain("accepted");
    expect(params).toContain("msg-1");
  });
});

describe("buildInsertAuditLogQuery", () => {
  const row: NewAuditLogRow = {
    id: "audit-1",
    actorId: null,
    actorEmail: "admin@mixednuts-inc.com",
    targetOrgId: null,
    targetOrgSlug: null,
    action: "invitation.created",
    metadata: null,
    impersonatedOrgSlug: "chakin",
  };

  it("pre-migration: never references impersonated_org_slug, and still writes the row", () => {
    const { sql } = buildInsertAuditLogQuery(row, false).toSQL();
    expect(sql).not.toContain(NEW_AUDIT_LOG_COLUMN);
    expect(sql).toContain('insert into "audit_log"');
    expect(sql).toContain('"action"');
  });

  it("post-migration: references impersonated_org_slug with the real value", () => {
    const { sql, params } = buildInsertAuditLogQuery(row, true).toSQL();
    expect(sql).toContain(`"${NEW_AUDIT_LOG_COLUMN}"`);
    expect(params).toContain("chakin");
  });

  it("REGRESSION GUARD: reproduces audit.ts's original (pre-fix) reasoning error — conditionally spreading a key into `.values()` only when truthy does NOT stop an INSERT from referencing that column (unlike UPDATE)", () => {
    // The exact pre-fix pattern: insert straight into the full `auditLog`
    // table object, with impersonatedOrgSlug OMITTED from `.values()` —
    // this is the "common case, not impersonating" the original doc
    // comment claimed "never references the new column at all."
    const commonCaseValues = {
      id: "audit-2",
      actorId: null,
      actorEmail: "admin@mixednuts-inc.com",
      targetOrgId: null,
      targetOrgSlug: null,
      action: "invitation.created",
      metadata: null,
    };
    const { sql } = db.insert(auditLog).values(commonCaseValues).toSQL();
    // Proves the original claim false: the column IS referenced (as
    // `default`) even though the JS object never mentions it — which is
    // exactly why every audit_log write 42703'd pre-migration before this
    // fix, not just ones during an active impersonation session.
    expect(sql).toContain(`"${NEW_AUDIT_LOG_COLUMN}"`);
  });
});

describe("invitationTokenHashField / invitationEmailStatusFields", () => {
  it("pre-migration: projects literal NULL/0 for every Phase F field, never the real column names", () => {
    const { sql } = db
      .select({
        tokenHash: invitationTokenHashField(false),
        ...invitationEmailStatusFields(false),
      })
      .from(invitation)
      .where(eq(invitation.id, "inv-1"))
      .toSQL();
    expect(sql).not.toContain("token_hash");
    expect(sql).not.toContain("email_status");
    expect(sql).not.toContain("email_attempt_count");
    expect(sql).not.toContain("email_last_attempt_at");
  });

  it("post-migration: projects the real columns", () => {
    const { sql } = db
      .select({
        tokenHash: invitationTokenHashField(true),
        ...invitationEmailStatusFields(true),
      })
      .from(invitation)
      .where(eq(invitation.id, "inv-1"))
      .toSQL();
    expect(sql).toContain('"token_hash"');
    expect(sql).toContain('"email_status"');
    expect(sql).toContain('"email_attempt_count"');
    expect(sql).toContain('"email_last_attempt_at"');
  });
});

describe("phaseFColumnsAvailable / __setPhaseFColumnsAvailableForTests (test seam)", () => {
  it("returns the forced value without touching a real DB", async () => {
    __setPhaseFColumnsAvailableForTests(true);
    expect(await phaseFColumnsAvailable()).toBe(true);
    __setPhaseFColumnsAvailableForTests(false);
    expect(await phaseFColumnsAvailable()).toBe(false);
  });

  it("caches the forced value across repeated calls", async () => {
    __setPhaseFColumnsAvailableForTests(true);
    expect(await phaseFColumnsAvailable()).toBe(true);
    expect(await phaseFColumnsAvailable()).toBe(true);
  });
});

describe("underlying drizzle-orm behaviour this module exists to work around (documents the bug class, not a claim about this module's correctness)", () => {
  it("a bare .select().from(invitation) references every configured column, not a literal SELECT *", () => {
    const { sql } = db.select().from(invitation).toSQL();
    for (const col of NEW_INVITATION_COLUMNS) {
      expect(sql).toContain(`"${col}"`);
    }
  });

  it("a bare .select().from(auditLog) references impersonated_org_slug too", () => {
    const { sql } = db.select().from(auditLog).toSQL();
    expect(sql).toContain(`"${NEW_AUDIT_LOG_COLUMN}"`);
  });

  it("db.insert(invitation).values({...}) references token_hash even when the JS object never mentions it", () => {
    const { sql } = db
      .insert(invitation)
      .values({
        id: "inv-2",
        organizationId: "org-1",
        email: "b@example.com",
        status: "pending",
        expiresAt: new Date("2026-08-01T00:00:00Z"),
        inviterId: "user-1",
        // tokenHash deliberately omitted.
      })
      .toSQL();
    expect(sql).toContain('"token_hash"');
  });
});
