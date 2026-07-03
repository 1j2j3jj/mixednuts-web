import { describe, it, expect } from "vitest";
import {
  jstTodayIso,
  daysBehindJst,
  isStaleForBanner,
  isStaleForAlert,
  STALE_BANNER_DAYS,
} from "@/lib/freshness";
import { classifyFetchError, tagWarning, hasWarnReason } from "@/lib/fetch-warnings";

/**
 * Batch2 (監査P0 データ鮮度アラート) — pure-function coverage for the shared
 * freshness judgment (StaleDataBanner + /api/cron/freshness-check) and the
 * fetch-warning reason tags (empty-state 3分類). No network / BQ touched.
 */

// 2026-07-03 00:30 JST == 2026-07-02 15:30 UTC — crosses the UTC date line,
// the exact case a naive UTC "today" would get wrong.
const JST_MIDNIGHT_EDGE = new Date("2026-07-02T15:30:00Z");
// Plain mid-day case: 2026-07-03 18:00 JST == 09:00 UTC.
const JST_MIDDAY = new Date("2026-07-03T09:00:00Z");

describe("freshness.jstTodayIso", () => {
  it("uses the JST calendar date, not UTC", () => {
    expect(jstTodayIso(JST_MIDNIGHT_EDGE)).toBe("2026-07-03");
    expect(jstTodayIso(JST_MIDDAY)).toBe("2026-07-03");
  });
});

describe("freshness.daysBehindJst", () => {
  it.each<[string, number]>([
    ["2026-07-03", 0], // data for today
    ["2026-07-02", 1], // yesterday — healthy morning sync
    ["2026-07-01", 2],
    ["2026-06-30", 3],
  ])("maxDate %s -> %s day(s) behind", (maxDate, expected) => {
    expect(daysBehindJst(maxDate, JST_MIDDAY)).toBe(expected);
  });

  it("computes against the JST date across the UTC boundary", () => {
    // At 00:30 JST on 7/3, data through 7/2 is 1 day behind (not 0).
    expect(daysBehindJst("2026-07-02", JST_MIDNIGHT_EDGE)).toBe(1);
  });

  it("returns null for malformed input", () => {
    expect(daysBehindJst("", JST_MIDDAY)).toBeNull();
    expect(daysBehindJst("2026/07/01", JST_MIDDAY)).toBeNull();
    expect(daysBehindJst("not-a-date", JST_MIDDAY)).toBeNull();
  });
});

describe("freshness.isStaleForBanner (dashboard banner, 2+ days)", () => {
  it.each<[string, boolean]>([
    ["2026-07-03", false],
    ["2026-07-02", false], // yesterday = healthy
    ["2026-07-01", true], // 2 days = banner
    ["2026-06-25", true],
  ])("maxDate %s -> banner %s", (maxDate, expected) => {
    expect(isStaleForBanner(maxDate, JST_MIDDAY)).toBe(expected);
  });

  it("stays silent on malformed dates (cannot judge)", () => {
    expect(isStaleForBanner("garbage", JST_MIDDAY)).toBe(false);
  });

  // 敵対検証 2026-07-03: 健全な朝（sync 完了前 00:00〜10:00 JST）に behind==2 で
  // 毎朝バナーが誤表示されるのを防ぐ時刻ガード。10:00 JST 前は behind==2 を
  // 健全扱い、10:00 以降は当日中に検知する。3日以上は時刻に関係なく stale。
  describe("morning grace window (behind == 2)", () => {
    const JST_0730 = new Date("2026-07-02T22:30:00Z"); // 07:30 JST on 7/3
    const JST_1001 = new Date("2026-07-03T01:01:00Z"); // 10:01 JST on 7/3
    it("behind==2 before 10:00 JST -> fresh (sync not landed yet)", () => {
      expect(isStaleForBanner("2026-07-01", JST_0730)).toBe(false);
    });
    it("behind==2 after 10:00 JST -> stale (this morning's sync failed)", () => {
      expect(isStaleForBanner("2026-07-01", JST_1001)).toBe(true);
    });
    it("behind==3 is stale even before 10:00 JST", () => {
      expect(isStaleForBanner("2026-06-30", JST_0730)).toBe(true);
    });
  });

  it("threshold constant matches the documented 2 days", () => {
    expect(STALE_BANNER_DAYS).toBe(2);
  });
});

describe("freshness.isStaleForAlert (cron/Slack, maxDate < today-2)", () => {
  it.each<[string, boolean]>([
    ["2026-07-03", false],
    ["2026-07-02", false],
    ["2026-07-01", false], // exactly today-2 — NOT < today-2, no alert yet
    ["2026-06-30", true], // 3 days behind — alert
  ])("maxDate %s -> alert %s", (maxDate, expected) => {
    expect(isStaleForAlert(maxDate, JST_MIDDAY)).toBe(expected);
  });

  it("treats an empty table (null) as stale", () => {
    expect(isStaleForAlert(null, JST_MIDDAY)).toBe(true);
  });

  it("treats a malformed date as stale (fail loud)", () => {
    expect(isStaleForAlert("garbage", JST_MIDDAY)).toBe(true);
  });
});

describe("fetch-warnings.classifyFetchError", () => {
  it.each([
    "Access Denied: Table x: User does not have permission to query table",
    "403 Forbidden",
    "Request had invalid authentication credentials (401 Unauthorized)",
    "BigQuery API has not been enabled for project",
  ])("permission-ish: %s", (msg) => {
    expect(classifyFetchError(new Error(msg))).toBe("permission");
  });

  it.each([
    "Deadline exceeded",
    "socket hang up",
    "Not found: Table ai-agent-mixednuts.dozo_marts.rpt_daily",
    "rate limit exceeded",
  ])("transient/other -> fetch_failed: %s", (msg) => {
    expect(classifyFetchError(new Error(msg))).toBe("fetch_failed");
  });

  it("handles non-Error throwables", () => {
    expect(classifyFetchError("permission denied")).toBe("permission");
    expect(classifyFetchError(undefined)).toBe("fetch_failed");
  });
});

describe("fetch-warnings.tagWarning / hasWarnReason", () => {
  it("round-trips a tagged warning", () => {
    const w = tagWarning("permission", "bq rpt_daily fetch failed: Access Denied");
    expect(w).toBe("[permission] bq rpt_daily fetch failed: Access Denied");
    expect(hasWarnReason([w], "permission")).toBe(true);
    expect(hasWarnReason([w], "fetch_failed")).toBe(false);
  });

  it("finds the reason anywhere in a mixed warnings list", () => {
    const warnings = [
      "sheet returned 0 rows",
      tagWarning("fetch_failed", "bq rpt_all fetch failed: Deadline exceeded"),
    ];
    expect(hasWarnReason(warnings, "fetch_failed")).toBe(true);
    expect(hasWarnReason(warnings, "permission")).toBe(false);
    expect(hasWarnReason([], "permission")).toBe(false);
  });
});
