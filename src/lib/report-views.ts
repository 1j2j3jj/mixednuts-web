/**
 * Granularity tabs for the /dashboard/[slug]/report screen.
 *
 * Kept in a framework-free module (no "use client") so both the server page
 * and the client switcher can import it as a plain value — value exports of
 * a "use client" module become client-reference proxies inside RSC and are
 * not usable as data there.
 *
 * weekly / monthly added 2026-07-02 (rpt_daily ISO-week rollup / rpt_all
 * monthly rows joined with a rpt_daily month rollup — see bq-rpt.ts).
 */
export const REPORT_VIEWS = [
  // C3-d: was "Daily" — the only English label among the six, and the
  // default view (no ?view= param — see ReportViewTabs.tsx), so it was the
  // first thing a client saw on this tab. Renamed to match the 週次/月次/
  // 媒体/キャンペーン/広告グループ pattern; the `key` ("daily") is
  // unchanged so no URL/query-param behaviour changes.
  { key: "daily", label: "日次" },
  { key: "weekly", label: "週次" },
  { key: "monthly", label: "月次" },
  { key: "media", label: "媒体" },
  { key: "cpn", label: "キャンペーン" },
  { key: "adg", label: "広告グループ" },
] as const;

export type ReportViewKey = (typeof REPORT_VIEWS)[number]["key"];
