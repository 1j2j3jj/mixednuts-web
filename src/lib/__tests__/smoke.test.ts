import { describe, it, expect } from "vitest";
import { canInviteMembers, type OrgRole } from "@/lib/org-role";
import { isRptSupported, RPT_SUPPORTED } from "@/lib/sources/bq-rpt";

/**
 * Batch0 smoke tests — a minimal, deterministic safety net over two pure
 * authorisation/isolation predicates. No DB, BigQuery, or network is touched:
 * both functions are synchronous pure functions of their arguments.
 *
 *  - canInviteMembers  … org-role.ts:84  (who may invite/uninvite members)
 *  - isRptSupported    … bq-rpt.ts:154   (cross-tenant clientId allow-list)
 */

describe("org-role.canInviteMembers", () => {
  // The requirement's two anchor cases: viewer (member) cannot invite,
  // editor can.
  it("returns false for member (viewer)", () => {
    expect(canInviteMembers("member")).toBe(false);
  });

  it("returns true for editor", () => {
    expect(canInviteMembers("editor")).toBe(true);
  });

  // Full role table (org-role.ts:29 OrgRole union), so a future change to the
  // predicate that widens or narrows privilege is caught.
  it.each<[OrgRole, boolean]>([
    ["mixednuts-admin", true],
    ["owner", true],
    ["admin", true],
    ["editor", true],
    ["member", false],
  ])("role %s -> canInvite %s", (role, expected) => {
    expect(canInviteMembers(role)).toBe(expected);
  });
});

describe("bq-rpt.isRptSupported (cross-tenant clientId guard)", () => {
  // Only these five client datasets exist (RPT_SUPPORTED, bq-rpt.ts:105).
  it.each(["dozo", "hs", "msec", "ogc", "ogp"])(
    "accepts provisioned tenant %s",
    (clientId) => {
      expect(isRptSupported(clientId)).toBe(true);
    },
  );

  // A clientId outside the allow-list must be rejected — this is the gate that
  // stops a caller from templating an arbitrary `{clientId}_marts` dataset into
  // a BigQuery FROM clause (buildSql, bq-rpt.ts:346). Inherited Object.prototype
  // keys (`__proto__`, `constructor`, `toString`, `hasOwnProperty`) are included
  // because they are not provisioned tenants: the guard uses `Object.hasOwn`
  // (not `in`), so they must be rejected like any other unknown clientId.
  it.each([
    "",
    "unknown",
    "dozo_marts",
    "DOZO",
    "; DROP TABLE",
    "trans",
    "__proto__",
    "constructor",
    "toString",
    "hasOwnProperty",
  ])("rejects unprovisioned/hostile clientId %j", (clientId) => {
    expect(isRptSupported(clientId)).toBe(false);
  });

  it("allow-list narrows the type to a key of RPT_SUPPORTED", () => {
    const candidate = "hs";
    if (isRptSupported(candidate)) {
      // Type-narrowed to RptClientId; RPT_SUPPORTED lookup is total.
      expect(RPT_SUPPORTED[candidate].overallCvLabel).toBe("EC-CUBE CV");
    } else {
      throw new Error("expected 'hs' to be supported");
    }
  });
});
