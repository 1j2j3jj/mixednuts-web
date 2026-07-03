/**
 * Audit-log retention helpers (privacy §5-4).
 *
 * privacy/page.tsx の保存期間表で「監査ログ … 取得から原則 1 年間（不正アクセス
 * 調査等で必要な場合を除く）」と 2026-07-04 に公表済み。この文面を満たす purge
 * 機構が無かったため、audit_log の created_at が 1 年より前の行を毎日削除する
 * cron（/api/cron/audit-log-purge）がこの判定を使う。
 *
 * 「原則 1 年」= カレンダー 1 年（365/366 日を跨ぐ暦年）として解釈し、固定日数
 * ではなく setUTCFullYear で 1 年前の同時刻を境界にする。境界は strict less-than:
 * ちょうど 1 年前の行はまだ保持し、それより前になった行を削除する（1 日でも
 * 早く消しすぎない fail-safe。membership-cleanup の lt() と同じ向き）。
 *
 * Pure functions（server-only / I/O 無し）なので vitest で日付境界を直接検証できる。
 */

/** 監査ログの保持年数（privacy §5-4「原則 1 年」）。 */
export const AUDIT_LOG_RETENTION_YEARS = 1;

/**
 * 保持期限の下限（cutoff）。これより前の created_at を持つ行が削除対象。
 *
 * `now` の 1 年前の同時刻（UTC）。うるう日 2/29 に走った場合、前年の 2/29 は
 * 存在しないため JS のロールオーバーで 3/1 の同時刻になる（4 年に一度その日だけ
 * 境界が 1 日進み、保持がわずかに短くなる）。「原則」の範囲内として許容する。
 */
export function auditLogPurgeCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime()); // clone — `now` は不変に保つ
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - AUDIT_LOG_RETENTION_YEARS);
  return cutoff;
}

/**
 * この監査ログ行が保持期限切れ（削除対象）か。
 * cutoff 未満のみ true — ちょうど 1 年前の行は境界上でまだ保持する。
 * route の `lt(auditLog.createdAt, cutoff)` と同じ判定を JS 側で表現したもの。
 */
export function isAuditLogExpired(createdAt: Date, now: Date = new Date()): boolean {
  return createdAt.getTime() < auditLogPurgeCutoff(now).getTime();
}
