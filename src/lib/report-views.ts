/**
 * Granularity tabs for the /dashboard/[slug]/report screen.
 *
 * Kept in a framework-free module (no "use client") so both the server page
 * and the client switcher can import it as a plain value — value exports of
 * a "use client" module become client-reference proxies inside RSC and are
 * not usable as data there.
 */
export const REPORT_VIEWS = [
  { key: "daily", label: "Daily" },
  { key: "media", label: "媒体" },
  { key: "cpn", label: "キャンペーン" },
  { key: "adg", label: "広告グループ" },
] as const;

export type ReportViewKey = (typeof REPORT_VIEWS)[number]["key"];
