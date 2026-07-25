import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Source-level regression guard, complementary to phase-f-columns.test.ts.
 * That file proves the query-building MECHANISM in
 * src/db/phase-f-columns.ts is correct; this file guards against a FUTURE
 * call site bypassing that mechanism and reaching for
 * `invitation`/`invitationTable`/`auditLog` directly again — the exact
 * mistake that caused the Item 1 release blocker (2026-07-25 Phase F
 * verifier finding: application code referenced
 * drizzle/0003_phase_f_invitation_hardening.sql's new columns
 * unconditionally, and that migration is deliberately NOT YET run).
 *
 * Follows the source-text guard precedent in
 * src/lib/sources/__tests__/mock-leak-guard.test.ts: a plain string/regex
 * scan rather than a runtime test, because the two patterns below (a bare
 * `.select()` chained to one of these tables, and a direct `.insert()`
 * into one of these tables) are reliable to detect textually and are
 * exactly what caused 42703s pre-migration for every call site that used
 * them — see src/db/phase-f-columns.ts's module doc comment for why.
 *
 * What this guards: every current call site that reads or writes
 * `invitation`/`auditLog` routes through src/db/phase-f-columns.ts instead
 * of querying those tables in a way that references every configured
 * column regardless of migration state.
 *
 * What this does NOT guard: an UPDATE call site inlining `revokedAt`/
 * `emailStatus`/etc. directly into a `.set({...})` outside the helpers.
 * That pattern isn't banned textually because `.update(invitation).set(...)`
 * is safe by construction as long as the `.set()` object never
 * unconditionally includes a Phase F key — verified for UPDATE (unlike
 * INSERT) in phase-f-columns.test.ts's "underlying drizzle-orm behaviour"
 * block. Distinguishing "key present via an unconditional literal" from
 * "key present via the existing safe conditional" is not something text
 * matching can reliably do without a real parser; reviewer judgement
 * remains required for new UPDATE call sites on these two tables.
 */

const CALL_SITE_FILES = [
  "app/(dashboard)/dashboard/[slug]/settings/members/actions.ts",
  "app/(dashboard)/dashboard/admin/invites/actions.ts",
  "app/api/auth/accept-invitation/route.ts",
  "app/(dashboard)/dashboard/admin/audit/page.tsx",
  "lib/audit.ts",
  "app/api/cron/audit-log-purge/route.ts",
  "app/api/auth/delete-account/route.ts",
];

const BARE_SELECT_RE =
  /\.select\(\)\s*\.from\(\s*(invitation\b|invitationTable\b|auditLog\b)/;
const DIRECT_INSERT_RE =
  /\.insert\(\s*(invitation\b|invitationTable\b|auditLog\b)/;

function readSrc(relPath: string): string {
  // 2 levels up from src/db/__tests__/ reaches src/, matching the
  // mock-leak-guard.test.ts convention (relPath is relative to src/).
  const url = new URL(`../../${relPath}`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

describe("self-test: the detection regexes actually have teeth", () => {
  it("BARE_SELECT_RE matches the exact pre-fix pattern (would have caught the original bug)", () => {
    const badExampleA =
      "const rows = await db\n  .select()\n  .from(invitation)\n  .where(eq(invitation.id, id));";
    const badExampleB = "await db.select().from(invitationTable).where(...)";
    const badExampleC = "await db.select().from(auditLog).orderBy(...)";
    expect(badExampleA).toMatch(BARE_SELECT_RE);
    expect(badExampleB).toMatch(BARE_SELECT_RE);
    expect(badExampleC).toMatch(BARE_SELECT_RE);
    // Must NOT false-positive on the fixed pattern (explicit projection).
    const goodExample =
      "await db.select({ id: invitation.id, email: invitation.email }).from(invitation)";
    expect(goodExample).not.toMatch(BARE_SELECT_RE);
  });

  it("DIRECT_INSERT_RE matches the exact pre-fix pattern (would have caught the original bug)", () => {
    expect("await db.insert(invitation).values({ id, tokenHash })").toMatch(
      DIRECT_INSERT_RE,
    );
    expect(
      "await db.insert(invitationTable).values({ id, tokenHash })",
    ).toMatch(DIRECT_INSERT_RE);
    expect("await db.insert(auditLog).values({ id })").toMatch(
      DIRECT_INSERT_RE,
    );
    // Must NOT false-positive on the fixed pattern (routed through the
    // safe helper, which itself legitimately calls .insert() internally).
    const goodExample = "await insertInvitationRow(db, { id, tokenHash })";
    expect(goodExample).not.toMatch(DIRECT_INSERT_RE);
  });
});

describe("phase-f column guard — call sites must not reference invitation/audit_log unconditionally", () => {
  it.each(CALL_SITE_FILES)(
    "%s: no bare `.select()` chained to invitation/invitationTable/auditLog",
    (relPath) => {
      const src = readSrc(relPath);
      expect(src).not.toMatch(BARE_SELECT_RE);
    },
  );

  it.each(CALL_SITE_FILES)(
    "%s: no direct .insert() into invitation/invitationTable/auditLog (must go through src/db/phase-f-columns.ts)",
    (relPath) => {
      const src = readSrc(relPath);
      expect(src).not.toMatch(DIRECT_INSERT_RE);
    },
  );
});

describe("phase-f-columns.ts itself is exempt (it's where the narrow pre-migration table objects and helpers legitimately live)", () => {
  it("sanity check: the module does contain direct .insert() calls (into the narrow objects), proving the guard above is meaningfully scoped to call sites, not everything", () => {
    const src = readSrc("db/phase-f-columns.ts");
    expect(src).toMatch(DIRECT_INSERT_RE);
  });
});
