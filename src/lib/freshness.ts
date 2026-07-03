/**
 * Data-freshness helpers (Batch2 監査P0: データ鮮度アラート).
 *
 * BQ marts are refreshed by mixednutsinc's daily_sync_all.py (GitHub
 * Actions, every morning). A healthy morning run leaves MAX(date) at
 * "yesterday" (JST). When the sync silently fails, the dashboards keep
 * rendering the old rows as if they were current — these helpers give the
 * banner (§3) and the freshness-check cron (§2) a single shared judgment.
 *
 * Two thresholds, deliberately different sensitivity:
 *  - STALE_BANNER_DAYS (2): dashboard banner. maxDate is 2+ days old —
 *    this morning's sync likely failed once. Informational amber banner.
 *  - isStaleForAlert (maxDate < today-2, i.e. 3+ days behind): Slack/cron
 *    alert. Two missed syncs — deserves a notification. The extra day of
 *    slack avoids false alarms when the 9:00 JST cron fires before a
 *    slow/late sync has landed yesterday's rows.
 *
 * Pure functions (no server-only, no I/O) so vitest can cover the date
 * math directly.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // JST = UTC+9, no DST

/** Today's calendar date in JST as yyyy-mm-dd. */
export function jstTodayIso(now: Date = new Date()): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whole days between a BQ DATE string (yyyy-mm-dd) and "today" in JST.
 * 0 = data for today exists, 1 = latest row is yesterday (healthy for a
 * morning sync), 2+ = falling behind. Returns null for malformed input
 * (callers treat null as "cannot judge" and stay silent rather than
 * rendering a bogus banner).
 */
export function daysBehindJst(maxDate: string, now: Date = new Date()): number | null {
  if (!ISO_DATE_RE.test(maxDate)) return null;
  const todayMs = Date.parse(`${jstTodayIso(now)}T00:00:00Z`);
  const maxMs = Date.parse(`${maxDate}T00:00:00Z`);
  if (!Number.isFinite(maxMs)) return null;
  return Math.round((todayMs - maxMs) / DAY_MS);
}

/** Dashboard banner threshold: MAX(date) is 2+ days old (JST). */
export const STALE_BANNER_DAYS = 2;

/**
 * JST hour after which "behind == 2" counts as stale for the banner.
 * The nightly sync (23:30 UTC = 08:30 JST) lands yesterday's rows by
 * ~09:00 JST, so before 10:00 JST a healthy dashboard still legitimately
 * shows MAX(date) = the day before yesterday. Without this guard the
 * banner would show on every dashboard every morning between 00:00 and
 * sync completion (敵対検証 2026-07-03 で検出した毎朝誤検知)。
 */
export const STALE_BANNER_GRACE_HOUR_JST = 10;

/** True when the stale banner should show for this MAX(date). */
export function isStaleForBanner(maxDate: string, now: Date = new Date()): boolean {
  const behind = daysBehindJst(maxDate, now);
  if (behind == null) return false;
  if (behind > STALE_BANNER_DAYS) return true; // 3+ days: always stale
  if (behind < STALE_BANNER_DAYS) return false; // 0-1 days: always fresh
  // Exactly 2 days behind: only stale after the sync grace window.
  const jstHour = new Date(now.getTime() + JST_OFFSET_MS).getUTCHours();
  return jstHour >= STALE_BANNER_GRACE_HOUR_JST;
}

/**
 * Cron/Slack alert judgment: stale when MAX(date) < today-2 (JST), i.e.
 * 3+ days behind (see module doc for why this is one day laxer than the
 * banner). A null/absent maxDate (empty table) is also stale.
 */
export function isStaleForAlert(maxDate: string | null, now: Date = new Date()): boolean {
  if (maxDate == null) return true;
  const behind = daysBehindJst(maxDate, now);
  // Malformed date from BQ ⇒ treat as stale (fail loud, not silent).
  return behind == null || behind > STALE_BANNER_DAYS;
}
