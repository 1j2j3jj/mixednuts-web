import { describe, it, expect } from "vitest";
import {
  auditLogPurgeCutoff,
  isAuditLogExpired,
  AUDIT_LOG_RETENTION_YEARS,
} from "@/lib/audit-retention";

/**
 * privacy §5-4「監査ログ … 取得から原則 1 年間」を実装する audit_log purge の
 * 日付境界カバレッジ。純関数（DB/時計に触れない）なので now を固定して検証する。
 */

// cron が回る想定時刻（03:30 UTC）を含む、キリの悪い基準時刻。
const NOW = new Date("2026-07-04T03:30:00Z");

describe("auditLogPurgeCutoff", () => {
  it("returns the same instant exactly one calendar year earlier (UTC)", () => {
    expect(auditLogPurgeCutoff(NOW).toISOString()).toBe("2025-07-04T03:30:00.000Z");
  });

  it("does not mutate the passed-in `now`", () => {
    const now = new Date("2026-07-04T03:30:00Z");
    auditLogPurgeCutoff(now);
    expect(now.toISOString()).toBe("2026-07-04T03:30:00.000Z");
  });

  // うるう日 2/29 に走ると前年 2/29 が無いため 3/1 へロールオーバーする。
  // 4 年に一度その日だけ境界が 1 日進む既知挙動を、隠さず固定して記録する。
  it("rolls a Feb 29 run forward to Mar 1 of the prior year", () => {
    const leap = new Date("2028-02-29T12:00:00Z");
    expect(auditLogPurgeCutoff(leap).toISOString()).toBe("2027-03-01T12:00:00.000Z");
  });
});

describe("isAuditLogExpired", () => {
  const cutoff = auditLogPurgeCutoff(NOW); // 2025-07-04T03:30:00Z

  it("keeps a row created exactly at the cutoff (strict less-than boundary)", () => {
    expect(isAuditLogExpired(new Date(cutoff.getTime()), NOW)).toBe(false);
  });

  it("purges a row created 1ms before the cutoff", () => {
    expect(isAuditLogExpired(new Date(cutoff.getTime() - 1), NOW)).toBe(true);
  });

  it("keeps a row created 1ms after the cutoff", () => {
    expect(isAuditLogExpired(new Date(cutoff.getTime() + 1), NOW)).toBe(false);
  });

  it.each<[string, boolean]>([
    ["2024-01-01T00:00:00Z", true], // 2.5 年前 — 削除
    ["2025-07-03T03:30:00Z", true], // 境界の 1 日前 — 削除
    ["2025-07-04T03:29:59Z", true], // 境界の 1 秒前 — 削除
    ["2025-07-04T03:30:00Z", false], // ちょうど 1 年前 — 保持
    ["2025-07-05T00:00:00Z", false], // 1 年未満 — 保持
    ["2026-07-04T03:30:00Z", false], // 取得直後 — 保持
  ])("createdAt %s -> expired %s", (createdAt, expected) => {
    expect(isAuditLogExpired(new Date(createdAt), NOW)).toBe(expected);
  });
});

describe("AUDIT_LOG_RETENTION_YEARS", () => {
  it("matches the published privacy §5-4 period (1 year)", () => {
    expect(AUDIT_LOG_RETENTION_YEARS).toBe(1);
  });
});
