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
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "週次" },
  { key: "monthly", label: "月次" },
  { key: "media", label: "媒体" },
  { key: "cpn", label: "キャンペーン" },
  { key: "adg", label: "広告グループ" },
] as const;

export type ReportViewKey = (typeof REPORT_VIEWS)[number]["key"];
