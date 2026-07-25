import { describe, it, expect } from "vitest";
import {
  absenceCopy,
  resolveAbsence,
  permissionDeniedCopy,
  type AbsenceReason,
} from "@/lib/absence";

/**
 * Phase D — the shared absence vocabulary (WORKTREE task item: "cover the
 * vocabulary selection rule (which state applies for which input)").
 */

describe("resolveAbsence — precedence order", () => {
  it("permission/fetch_failed and not_configured are mutually exclusive inputs from the caller — notConfigured wins when both are somehow set", () => {
    expect(
      resolveAbsence({
        notConfigured: true,
        fetchReason: "permission",
        rowCount: 0,
      }),
    ).toBe("not_configured");
  });

  it("fetchReason (permission/fetch_failed) beats a plain row-count check", () => {
    expect(resolveAbsence({ fetchReason: "permission", rowCount: 5 })).toBe(
      "permission",
    );
    expect(resolveAbsence({ fetchReason: "fetch_failed", rowCount: 0 })).toBe(
      "fetch_failed",
    );
  });

  it("rowCount === 0 with no other signal resolves to no_data_period", () => {
    expect(resolveAbsence({ rowCount: 0 })).toBe("no_data_period");
  });

  it("a present row count with no failure/config signal resolves to null (render the real value — MEASURED_ZERO/real data, not an absence state)", () => {
    expect(resolveAbsence({ rowCount: 1 })).toBeNull();
    expect(resolveAbsence({ rowCount: 42 })).toBeNull();
  });
});

describe("absenceCopy — every reason has distinct, non-empty copy", () => {
  const reasons: AbsenceReason[] = [
    "permission",
    "fetch_failed",
    "not_configured",
    "no_data_period",
  ];

  it.each(reasons)("%s produces a non-empty title and body", (reason) => {
    const copy = absenceCopy(reason);
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.body.length).toBeGreaterThan(0);
  });

  it("permission and fetch_failed are tone=warning; not_configured and no_data_period are tone=neutral (proposedVocabulary: NOT_CONFIGURED must not alarm)", () => {
    expect(absenceCopy("permission").tone).toBe("warning");
    expect(absenceCopy("fetch_failed").tone).toBe("warning");
    expect(absenceCopy("not_configured").tone).toBe("neutral");
    expect(absenceCopy("no_data_period").tone).toBe("neutral");
  });

  it("permission/fetch_failed copy matches the report tab's existing reviewed strings verbatim (reuse, not a second vocabulary)", () => {
    expect(absenceCopy("permission").title).toBe(
      "データにアクセスできません（権限エラー）",
    );
    expect(absenceCopy("fetch_failed").title).toBe(
      "データの取得に失敗しました",
    );
  });

  it("no_data_period includes a concrete sinceDate when supplied, instead of a vague 'try another period'", () => {
    const withDate = absenceCopy("no_data_period", { sinceDate: "2024-01-01" });
    expect(withDate.body).toContain("2024-01-01");
    const withoutDate = absenceCopy("no_data_period");
    expect(withoutDate.body).not.toContain("undefined");
  });

  it("not_configured appends the caller's detail clause when supplied", () => {
    const withDetail = absenceCopy(
      "not_configured",
      "このクライアントは自社ECを持たないため",
    );
    expect(withDetail.body).toContain("自社ECを持たないため");
  });
});

describe("permissionDeniedCopy — state 5 (viewer role on editor-only surface)", () => {
  it("names the surface in the body for both targets and members", () => {
    expect(permissionDeniedCopy("targets").body).toContain("目標設定");
    expect(permissionDeniedCopy("members").body).toContain("メンバー管理");
  });

  it("is neutral tone — a designed access boundary, not an error", () => {
    expect(permissionDeniedCopy("targets").tone).toBe("neutral");
  });
});
