import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TierGlyph from "@/components/dashboard/TierGlyph";
import DrillPagination from "@/components/dashboard/DrillPagination";
import { detectAnomalies } from "@/lib/analysis";
import type { MetricSource } from "@/lib/source";
import { higherIsBetterTier, lowerIsBetterTier } from "@/lib/tier";
import { sortDrillRows } from "@/lib/dashboard/drill-shared";
import { cn, fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";
import { formatRoas } from "@/lib/roas-format";

export interface DrillRow {
  /** Grouping key displayed in the first column. */
  key: string;
  /** Secondary label, e.g. campaign id. */
  subKey?: string;
  /** Time bucket this row represents (day / week-start / month). Empty string
   *  when the row aggregates across the full window. */
  date: string;
  media: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValue: number;
  /** Optional GA4-side joined metrics. Populated on campaign / adgroup
   *  levels when a JOIN key is available; left null when not. */
  ga4Sessions?: number | null;
  ga4Conversions?: number | null;
  ga4Revenue?: number | null;
}

interface Props {
  /** One PAGE of aggregated rows (see @/lib/dashboard/drill-shared's
   *  DRILL_PAGE_SIZE / paginateDrillRows) — NOT necessarily the full
   *  aggregated set. `totalCount` below carries the true full-set size. */
  rows: DrillRow[];
  /** Fallback target ROAS percentage (anchor month) — used only when
   *  targetsByMonth has no entry for a row's month. null = 未設定（色分けなし）. */
  targetRoasPct: number | null;
  /** Fallback target CPA (anchor month) — same fallback rule as above. */
  targetCpa: number | null;
  /** Current drill level — decides whether the "ラベル" column is rendered. */
  level?: "media" | "campaign" | "adgroup" | "bucket";
  /** "ga4" | "media" — which side drives CV / 売上 / CPA / ROAS cells. */
  source?: MetricSource;
  /** Per-row-month targets ("YYYY-MM" → MonthlyTargets), keyed by each row's
   *  own bucket month rather than a single anchor month. A month with no
   *  configured target (null / <=0) gets no colour on that metric. */
  targetsByMonth?: Map<string, { roasPct: number | null; cpa: number | null }>;
  /**
   * Windowing (G-3b, 2026-07-26): the full aggregated row count (across ALL
   * pages), the 1-based inclusive range `rows` represents within that full
   * set, and the pagination state needed to render Prev/Next. All five are
   * required together — there is no meaningful default for "how many rows
   * total" — but are optional at the type level so existing standalone
   * renders/tests that pass a small, already-complete `rows` array (no
   * pagination in play) don't have to invent values: omitted, the table
   * falls back to treating `rows` as the whole set (totalCount =
   * rows.length, one page).
   */
  totalCount?: number;
  pageStart?: number;
  pageEnd?: number;
  currentPage?: number;
  pageCount?: number;
  /** Needed to build the Prev/Next href — only required when pageCount > 1. */
  slug?: string;
}

/** Class strings per tier (thresholds now shared via @/lib/tier — see
 *  MediaTable.tsx's identical ROAS_TIER_CLASS for the split rationale). */
const ROAS_TIER_CLASS: Record<string, string> = {
  good: "text-emerald-700",
  warning: "text-amber-700",
  bad: "text-rose-700 font-medium",
};
const CPA_TIER_CLASS: Record<string, string> = {
  good: "text-emerald-700",
  warning: "text-amber-700",
  bad: "text-rose-700 font-medium",
};

function roasClass(actualPct: number | null, targetPct: number | null): string {
  const tier = higherIsBetterTier(actualPct, targetPct);
  return tier ? ROAS_TIER_CLASS[tier] : "";
}

function cpaClass(actual: number | null, target: number | null): string {
  const tier = lowerIsBetterTier(actual, target);
  return tier ? CPA_TIER_CLASS[tier] : "";
}

export default function DrillTable({
  rows,
  targetRoasPct,
  targetCpa,
  level = "campaign",
  source = "ga4",
  targetsByMonth,
  totalCount,
  pageStart,
  pageEnd,
  currentPage = 1,
  pageCount = 1,
  slug,
}: Props) {
  // Resolve the ROAS/CPA target that applies to a given row, using its own
  // bucket month (P2-1) — falls back to the anchor-month targetRoasPct/
  // targetCpa props when targetsByMonth has no entry for that month (e.g.
  // level="bucket" rows, whose date is the raw bucket key, not necessarily
  // "YYYY-MM"-prefixed in a way targetsByMonth was populated for).
  function targetsForRow(row: DrillRow): {
    roasPct: number | null;
    cpa: number | null;
  } {
    const ym = row.date.slice(0, 7);
    return (
      targetsByMonth?.get(ym) ?? { roasPct: targetRoasPct, cpa: targetCpa }
    );
  }

  // Windowing (G-3b): callers that paginate (drill/page.tsx) pass the true
  // full-set totalCount/pageStart/pageEnd alongside a `rows` that is only
  // ONE page of the full set. Callers that don't (none in this app today,
  // but standalone renders/tests are free to) get sensible single-page
  // fallbacks so the badge/caption still read correctly for a genuinely
  // complete `rows` array.
  const resolvedTotalCount = totalCount ?? rows.length;
  const resolvedPageStart = pageStart ?? (rows.length > 0 ? 1 : 0);
  const resolvedPageEnd = pageEnd ?? rows.length;

  // Primary sort: date desc (latest first). Secondary: spend desc. Shared
  // with page.tsx (@/lib/dashboard/drill-shared's sortDrillRows) so the
  // authoritative full-set sort (applied there, BEFORE pagination slices
  // the page this component actually receives) and this component's own
  // rendering never risk drifting apart into two comparators. Re-sorting an
  // already-sorted page slice here is a defensive no-op (see that
  // function's doc comment) — it is what keeps this component correct even
  // when handed a complete, unpaginated `rows` array directly.
  const sorted = sortDrillRows(rows);

  // Anomaly detection on Spend (±2σ). Flagged rows get a subtle
  // coloured left border and a badge — no drama.
  const spendFlags = detectAnomalies(sorted.map((r) => r.spend));
  // CV flags use the currently-selected source's CV for consistency.
  const cvFlags = detectAnomalies(
    sorted.map((r) =>
      source === "ga4" ? (r.ga4Conversions ?? 0) : r.conversions,
    ),
  );

  const showLabel = level === "campaign" || level === "adgroup";
  const labelHeader =
    level === "campaign"
      ? "キャンペーン"
      : level === "adgroup"
        ? "広告グループ"
        : "";
  const cvLabel = source === "ga4" ? "GA_CV" : "媒体CV";
  const revLabel = source === "ga4" ? "GA売上" : "媒体売上";
  const colSpan = (showLabel ? 1 : 0) + 11;

  return (
    <div className="rounded-md border">
      <Table>
        {/* G-3b: names the true full-set total + the page range `rows`
            represents, not just row count, so a screen-reader user landing
            directly on the table (table-navigation commands bypass the
            visible badge/pagination text entirely) still gets the "this is
            a window, not everything" context. */}
        <TableCaption className="sr-only">
          ドリルダウン集計テーブル（
          {level === "bucket" ? "期間別" : labelHeader}
          ）。全{fmtInt(resolvedTotalCount)}件中{fmtInt(resolvedPageStart)}〜
          {fmtInt(resolvedPageEnd)}件目を表示中。
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>期間</TableHead>
            <TableHead>媒体</TableHead>
            {showLabel && <TableHead>{labelHeader}</TableHead>}
            <TableHead className="text-right">COST</TableHead>
            <TableHead className="text-right">Imp</TableHead>
            <TableHead className="text-right">Click</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">{cvLabel}</TableHead>
            <TableHead className="text-right">{revLabel}</TableHead>
            <TableHead className="text-right">CPA</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">異常</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="text-center text-muted-foreground py-6"
              >
                フィルタに合致するデータがありません
              </TableCell>
            </TableRow>
          )}
          {sorted.map((r, i) => {
            const ctr = safeDiv(r.clicks, r.impressions);
            const cv =
              source === "ga4" ? (r.ga4Conversions ?? 0) : r.conversions;
            const rev =
              source === "ga4" ? (r.ga4Revenue ?? 0) : r.conversionValue;
            const cpa = safeDiv(r.spend, cv);
            const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
            const rowTargets = targetsForRow(r);
            const spendFlag = spendFlags[i];
            const cvFlag = cvFlags[i];
            const hasAnomaly = spendFlag !== "normal" || cvFlag !== "normal";
            // E-3 fix: the badge previously said WHICH metric was anomalous
            // ("COST"/"CV"/"COST+CV") but never HIGH or LOW — that direction
            // was colour-only (amber/sky on spend, emerald/rose on CV), with
            // no text carrier anywhere. ↑/↓ suffixes close that gap; the
            // per-cell TierGlyph-style arrows below close it a second way,
            // right where the coloured number itself is.
            const spendDir =
              spendFlag === "high" ? "↑" : spendFlag === "low" ? "↓" : "";
            const cvDir = cvFlag === "high" ? "↑" : cvFlag === "low" ? "↓" : "";
            const anomalyLabel =
              spendFlag !== "normal" && cvFlag !== "normal"
                ? `COST${spendDir}+CV${cvDir}`
                : spendFlag !== "normal"
                  ? `COST${spendDir}`
                  : cvFlag !== "normal"
                    ? `CV${cvDir}`
                    : "";
            const roasTier = higherIsBetterTier(roasPct, rowTargets.roasPct);
            const cpaTier = lowerIsBetterTier(cpa, rowTargets.cpa);
            return (
              <TableRow
                key={`${r.date}:${r.key}:${i}`}
                className={cn(hasAnomaly && "bg-amber-50/60")}
              >
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {r.date || "—"}
                </TableCell>
                <TableCell>{r.media}</TableCell>
                {showLabel && (
                  <TableCell className="font-medium">
                    <div className="max-w-md truncate" title={r.key}>
                      {r.key}
                    </div>
                    {r.subKey && (
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {r.subKey}
                      </div>
                    )}
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    spendFlag === "high" && "text-amber-700",
                    spendFlag === "low" && "text-sky-700",
                  )}
                >
                  {/* E-3: spend's high/low anomaly direction was colour-only
                      at the cell level (distinct from the 異常 badge column,
                      which only ever says WHICH metric, never which
                      direction — verified). Arrow glyph adds the direction
                      right where the coloured number is. */}
                  <span className="inline-flex items-center justify-end gap-1">
                    {spendFlag === "high" && (
                      <ArrowUp
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0"
                      />
                    )}
                    {spendFlag === "low" && (
                      <ArrowDown
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0"
                      />
                    )}
                    {fmtJpy(r.spend)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(r.impressions)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(r.clicks)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(ctr, 2)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    cvFlag === "high" && "text-emerald-700",
                    cvFlag === "low" && "text-rose-700",
                  )}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {cvFlag === "high" && (
                      <ArrowUp
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0"
                      />
                    )}
                    {cvFlag === "low" && (
                      <ArrowDown
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 shrink-0"
                      />
                    )}
                    {fmtInt(cv)}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtJpy(rev)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    cpaClass(cpa, rowTargets.cpa),
                  )}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {cpaTier && <TierGlyph tier={cpaTier} />}
                    {fmtJpy(cpa)}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    roasClass(roasPct, rowTargets.roasPct),
                  )}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    {roasTier && <TierGlyph tier={roasTier} />}
                    {formatRoas(roasPct)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {hasAnomaly && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                      {anomalyLabel}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 p-2 text-[11px] text-muted-foreground">
        <span>
          異常 = ±2σ を超える行（COST または CV
          方向）。検出目安であって判定ではない。
        </span>
        <div className="flex items-center gap-3">
          {/* G-3b: always the true full-set total + current window, never
              pageRows.length — the on-screen badge must not silently start
              reporting "how many loaded" once pagination exists.
              aria-live so a Prev/Next click (a searchParams-driven
              server-content update, not a full page reload) gets the
              concrete new range announced on arrival — complementing
              DrillPagination's own aria-live region below, which only ever
              announces the transient "更新中…" pending state. */}
          <span aria-live="polite" className="tabular-nums">
            {resolvedTotalCount === 0
              ? "0件"
              : `${fmtInt(resolvedTotalCount)}件中 ${fmtInt(resolvedPageStart)}〜${fmtInt(resolvedPageEnd)}件目`}
          </span>
          {pageCount > 1 && slug && (
            <DrillPagination
              slug={slug}
              currentPage={currentPage}
              pageCount={pageCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
