/**
 * Shared join/match-status vocabulary — originally lived only inside
 * ReportTable.tsx (report tab). Extracted (Phase D) so the ads tab's
 * media/campaign GA4 join can reuse the exact same terms ("突合済み" /
 * "未突合") instead of inventing a second vocabulary for the same concept
 * (a row whose ad cost could not be joined to a GA4 record) — the task's own
 * guidance: "Reuse the report tab's existing match-status vocabulary rather
 * than inventing a second one."
 *
 * Pure module (no server-only, no React) — usable from both server
 * components (ads/page.tsx aggregation) and presentational components
 * (ReportTable, MediaTable, MediaCampaignTable).
 */

export type MatchStatus = "matched" | "unmapped" | "ad_only";

export const MATCH_STATUS_DESC: Record<string, string> = {
  matched: "広告費とGA計測が突合済み",
  unmapped: "GA計測はあるが対応広告費が未着（広告費は1日遅れで翌日回収）",
  ad_only: "広告費のみでGA計測なし",
};

/** Short badge text for a matchStatus value — the raw value ("matched" /
 *  "unmapped" / "ad_only") is an internal status string, not something to
 *  show a client as-is; MATCH_STATUS_DESC above is the long-form tooltip,
 *  this is the compact on-badge label. */
export const MATCH_STATUS_LABEL: Record<string, string> = {
  matched: "突合済み",
  unmapped: "未突合",
  ad_only: "広告費のみ",
};

export function matchBadgeClass(status: string): string {
  if (status === "matched") return "bg-emerald-100 text-emerald-800";
  if (status === "unmapped") return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground"; // ad_only / other
}
