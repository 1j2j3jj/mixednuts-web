"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";
import type { EventCvDef } from "@/lib/sources/bq-rpt";

/**
 * Report table for the BQ rpt_* views. Columns follow the classic daily ad
 * report layout (COST → media block → GA block → overall block) with the
 * three CV layers (媒体CV / GA_CV / 全体CV) visually grouped via a grouped
 * header row + left borders.
 *
 * All ratios (CTR / CPC / CVR / CPA / ROAS) are recomputed here from the
 * summed numerators / denominators — pre-computed per-row ratios from the
 * views are intentionally not used (period aggregation would otherwise
 * average ratios, and the view ROAS columns are multipliers, not %).
 *
 * GA_CV semantics (changed 2026-07-02): GA_CV / GA_CVR / GA_CPA / GA_ROAS
 * are computed from gaCvPurchase, NOT the legacy ga_cv aggregate — EXCEPT
 * on the daily/monthly (site-wide) views, where gaCvPurchase now holds the
 * caller-supplied SITE-WIDE purchase figure (report/page.tsx maps
 * RptAllRow.gaCv/gaValue — the genuinely site-wide columns — into this
 * row's gaCvPurchase/gaValue for those two views; see that file's module
 * doc). Secondary key events (client-specific — dozo: Thanks/Wedding, hs:
 * 会員登録/問合せ) are shown as additional columns via the eventDefs prop;
 * gaCv (aggregate) is kept on the row shape for callers but intentionally
 * not rendered as a column — see the report/page.tsx footer note.
 *
 * adCvPurchase (added 2026-07-02, daily/monthly only): the ad-attributed
 * purchase CV (fct_ad_daily-sourced), shown as a reference column ONLY when
 * present — it is genuinely a different number from the site-wide
 * gaCvPurchase on these two tabs (dozo verified 6.3x, hs 2.2x, 2026-06).
 * Other views leave this undefined; gaCvPurchase there is already
 * ad-attributed so a separate column would be redundant.
 */

export interface ReportTableRow {
  /** First column: date (daily view) or entity name. */
  label: string;
  /** Secondary line under the label (entity id / parent campaign). */
  subLabel?: string;
  media?: string;
  /** rpt_adg only: "adgroup" | "campaign" (campaign = PMax fold-back). */
  grainLevel?: string;
  /** rpt_cpn / rpt_adg: representative match_status for this (campaign /
   *  ad group) grouping — "matched" wins over "unmapped"/"ad_only" when the
   *  same entity has rows in more than one status (see hasUnmapped). */
  matchStatus?: string;
  /** True when this grouped row folds in unmapped-status sessions/CV on top
   *  of a matched entity (campaign/ad_group unified across match_status —
   *  see report/page.tsx grouping). Renders a "+未突合分" badge. */
  hasUnmapped?: boolean;
  /** Renders bold on a muted background, pinned first (period total). */
  isTotal?: boolean;
  cost: number;
  impressions: number;
  clicks: number;
  sessions: number;
  mediaCv: number;
  mediaValue: number;
  /** Legacy aggregate (sum of all GA4 key events) — not rendered, kept for
   *  callers/back-compat only. */
  gaCv: number;
  gaValue: number;
  /** Primary conversion driving the GA_CV/GA_CVR/GA_CPA/GA_ROAS columns.
   *  Ad-attributed on weekly/media/cpn/adg; SITE-WIDE on daily/monthly (see
   *  module doc + report/page.tsx). */
  gaCvPurchase: number;
  /** Secondary key events, keyed by EventCvDef.key (see eventDefs prop). */
  gaCvEvents: Record<string, number>;
  /** Ad-attributed purchase CV, shown as a reference column when present
   *  (daily/monthly only — see module doc). */
  adCvPurchase?: number;
  overallCv: number | null;
  overallValue: number | null;
}

interface Props {
  rows: ReportTableRow[];
  labelHeader: string;
  /** Show a dedicated 媒体 column (CPN / ADG views). */
  showMedia?: boolean;
  /** Show grain_level / match_status badges under the label. */
  showBadges?: boolean;
  /** Show the overall-CV column group. */
  showOverall?: boolean;
  overallLabel?: string;
  /** Also show the overall revenue column (hs EC-CUBE only). */
  showOverallValue?: boolean;
  /** Header label of the GA group — clarifies site-wide vs ad-attributed. */
  gaGroupLabel?: string;
  /** Label for the primary GA_CV column (defaults to "GA_CV(購入)"). Callers
   *  pass a site-wide-clarifying label on daily/monthly. */
  gaCvLabel?: string;
  /** Render labels in monospace (dates). */
  monoLabel?: boolean;
  /** Client-specific secondary event-CV columns (RPT_SUPPORTED[client].secondaryEvents). */
  eventDefs?: EventCvDef[];
  /** Show the ad-attributed purchase reference column (rows must carry
   *  adCvPurchase — daily/monthly only). */
  showAdCvPurchase?: boolean;
}

const MATCH_STATUS_DESC: Record<string, string> = {
  matched: "広告費とGA計測が突合済み",
  unmapped: "GA計測はあるが対応広告費が未着（広告費は1日遅れで翌日回収）",
  ad_only: "広告費のみでGA計測なし",
};

function matchBadgeClass(status: string): string {
  if (status === "matched") return "bg-emerald-100 text-emerald-800";
  if (status === "unmapped") return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground"; // ad_only / other
}

/** Sortable columns. Mirrors the visible column set (label excluded — use natural order for that).
 *  Event-CV columns are sorted via a synthetic key "event:{eventKey}" (see sortKeyFor). */
type SortKey =
  | "label"
  | "media"
  | "cost"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "mediaCv"
  | "mediaCvr"
  | "mediaCpa"
  | "mediaRoasPct"
  | "mediaValue"
  | "sessions"
  | "gaCvPurchase"
  | "gaCvr"
  | "gaCpa"
  | "gaValue"
  | "gaRoasPct"
  | "overallCv"
  | "overallValue"
  | "adCvPurchase"
  | `event:${string}`;

type SortDir = "asc" | "desc";

interface DerivedRow extends ReportTableRow {
  ctr: number | null;
  cpc: number | null;
  mediaCvr: number | null;
  mediaCpa: number | null;
  mediaRoasPct: number | null;
  gaCvr: number | null;
  gaCpa: number | null;
  gaRoasPct: number | null;
}

/** Computes the same derived ratios used at render time, so sorting matches what's displayed.
 *  GA ratios are purchase-based (gaCvPurchase), not the legacy ga_cv aggregate. */
function computeDerived(r: ReportTableRow): DerivedRow {
  return {
    ...r,
    ctr: safeDiv(r.clicks, r.impressions),
    cpc: safeDiv(r.cost, r.clicks),
    mediaCvr: safeDiv(r.mediaCv, r.clicks),
    mediaCpa: safeDiv(r.cost, r.mediaCv),
    mediaRoasPct: r.cost > 0 ? (r.mediaValue / r.cost) * 100 : null,
    gaCvr: safeDiv(r.gaCvPurchase, r.sessions),
    gaCpa: safeDiv(r.cost, r.gaCvPurchase),
    gaRoasPct: r.cost > 0 ? (r.gaValue / r.cost) * 100 : null,
  };
}

/** Compares two non-null values for a given sort direction. Null handling
 *  lives in the caller (sortedRows) so nulls stay pinned last regardless of
 *  direction — this function is only reached with non-null operands. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "ja");
  }
  const an = Number(a);
  const bn = Number(b);
  return an - bn;
}

/** Resolves a SortKey (including the synthetic "event:{key}" form) to a
 *  comparable value on a derived row. */
function sortValue(r: DerivedRow, key: SortKey): unknown {
  if (key.startsWith("event:")) {
    const eventKey = key.slice("event:".length);
    return r.gaCvEvents[eventKey] ?? 0;
  }
  return (r as unknown as Record<string, unknown>)[key];
}

export default function ReportTable({
  rows,
  labelHeader,
  showMedia = false,
  showBadges = false,
  showOverall = false,
  overallLabel = "全体CV",
  showOverallValue = false,
  gaGroupLabel = "GA",
  gaCvLabel = "GA_CV(購入)",
  monoLabel = false,
  eventDefs = [],
  showAdCvPurchase = false,
}: Props) {
  const mediaCols = 10; // COST..CV Value
  const gaCols = 6 + eventDefs.length + (showAdCvPurchase ? 1 : 0); // SESSION..GA_ROAS + secondary event CVs + ad-attributed reference
  const overallCols = showOverall ? (showOverallValue ? 2 : 1) : 0;
  const headCols = 1 + (showMedia ? 1 : 0);
  const colSpan = headCols + mediaCols + gaCols + overallCols;

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 3-step toggle per column: unsorted -> desc -> asc -> unsorted.
  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
      return;
    }
    if (sortDir === "desc") {
      setSortDir("asc");
      return;
    }
    setSortKey(null);
  }

  const derivedRows = useMemo(() => rows.map(computeDerived), [rows]);

  const sortedRows = useMemo(() => {
    // Total row (period summary) is always pinned first regardless of sort.
    const totalRows = derivedRows.filter((r) => r.isTotal);
    const dataRows = derivedRows.filter((r) => !r.isTotal);
    if (!sortKey) return [...totalRows, ...dataRows];
    const sorted = [...dataRows].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const aNull = av === null || av === undefined;
      const bNull = bv === null || bv === undefined;
      // Nulls are always pinned last, independent of sort direction —
      // negating the direction must never resurrect a null row to the top.
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      const cmp = compareValues(av, bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return [...totalRows, ...sorted];
  }, [derivedRows, sortKey, sortDir]);

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-0.5 inline-block">{sortDir === "desc" ? "▼" : "▲"}</span>;
  }

  function sortableHeadProps(key: SortKey, extraClassName?: string) {
    return {
      onClick: () => toggleSort(key),
      className: cn(
        "cursor-pointer select-none hover:bg-accent/50",
        sortKey === key && "bg-accent/30",
        extraClassName
      ),
    };
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {/* Group header — visually separates the three CV layers. */}
          <TableRow className="bg-muted/30">
            <TableHead colSpan={headCols} />
            <TableHead
              colSpan={mediaCols}
              className="border-l text-center text-[11px] font-semibold uppercase tracking-wider"
            >
              広告媒体
            </TableHead>
            <TableHead
              colSpan={gaCols}
              className="border-l text-center text-[11px] font-semibold uppercase tracking-wider"
            >
              {gaGroupLabel}
            </TableHead>
            {showOverall && (
              <TableHead
                colSpan={overallCols}
                className="border-l text-center text-[11px] font-semibold uppercase tracking-wider"
              >
                全体
              </TableHead>
            )}
          </TableRow>
          <TableRow>
            <TableHead {...sortableHeadProps("label", "whitespace-nowrap")}>
              {labelHeader}
              {sortIndicator("label")}
            </TableHead>
            {showMedia && (
              <TableHead {...sortableHeadProps("media")}>
                媒体
                {sortIndicator("media")}
              </TableHead>
            )}
            <TableHead {...sortableHeadProps("cost", "border-l text-right")}>
              Cost
              {sortIndicator("cost")}
            </TableHead>
            <TableHead {...sortableHeadProps("impressions", "text-right")}>
              Imp
              {sortIndicator("impressions")}
            </TableHead>
            <TableHead {...sortableHeadProps("clicks", "text-right")}>
              Click
              {sortIndicator("clicks")}
            </TableHead>
            <TableHead {...sortableHeadProps("ctr", "text-right")}>
              CTR
              {sortIndicator("ctr")}
            </TableHead>
            <TableHead {...sortableHeadProps("cpc", "text-right")}>
              CPC
              {sortIndicator("cpc")}
            </TableHead>
            <TableHead {...sortableHeadProps("mediaCv", "text-right")}>
              媒体CV
              {sortIndicator("mediaCv")}
            </TableHead>
            <TableHead {...sortableHeadProps("mediaCvr", "text-right")}>
              CVR
              {sortIndicator("mediaCvr")}
            </TableHead>
            <TableHead {...sortableHeadProps("mediaCpa", "text-right")}>
              CPA
              {sortIndicator("mediaCpa")}
            </TableHead>
            <TableHead {...sortableHeadProps("mediaRoasPct", "text-right")}>
              ROAS
              {sortIndicator("mediaRoasPct")}
            </TableHead>
            <TableHead {...sortableHeadProps("mediaValue", "text-right")}>
              CV Value
              {sortIndicator("mediaValue")}
            </TableHead>
            <TableHead {...sortableHeadProps("sessions", "border-l text-right")}>
              Session
              {sortIndicator("sessions")}
            </TableHead>
            <TableHead
              {...sortableHeadProps("gaCvPurchase", "text-right")}
              title="GA4 purchase イベント基準"
            >
              {gaCvLabel}
              {sortIndicator("gaCvPurchase")}
            </TableHead>
            <TableHead {...sortableHeadProps("gaCvr", "text-right")}>
              GA_CVR
              {sortIndicator("gaCvr")}
            </TableHead>
            <TableHead {...sortableHeadProps("gaCpa", "text-right")}>
              GA_CPA
              {sortIndicator("gaCpa")}
            </TableHead>
            <TableHead {...sortableHeadProps("gaValue", "text-right")}>
              GA売上
              {sortIndicator("gaValue")}
            </TableHead>
            <TableHead {...sortableHeadProps("gaRoasPct", "text-right")}>
              GA_ROAS
              {sortIndicator("gaRoasPct")}
            </TableHead>
            {eventDefs.map((ev) => (
              <TableHead
                key={ev.key}
                {...sortableHeadProps(`event:${ev.key}`, "text-right whitespace-nowrap")}
              >
                {ev.label}
                {sortIndicator(`event:${ev.key}`)}
              </TableHead>
            ))}
            {showAdCvPurchase && (
              <TableHead
                {...sortableHeadProps("adCvPurchase", "text-right whitespace-nowrap")}
                title="fct_ad_daily 由来（広告エンティティに帰属したGA計測分）。参考列 — サイト全体のGA_CV(購入)とは別の数字"
              >
                GA_CV(広告帰属)
                {sortIndicator("adCvPurchase")}
              </TableHead>
            )}
            {showOverall && (
              <TableHead
                {...sortableHeadProps("overallCv", "border-l text-right whitespace-nowrap")}
              >
                {overallLabel}
                {sortIndicator("overallCv")}
              </TableHead>
            )}
            {showOverall && showOverallValue && (
              <TableHead
                {...sortableHeadProps("overallValue", "text-right whitespace-nowrap")}
              >
                全体売上
                {sortIndicator("overallValue")}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-6 text-center text-muted-foreground">
                選択期間にデータがありません
              </TableCell>
            </TableRow>
          )}
          {sortedRows.map((r, i) => {
            const { ctr, cpc, mediaCvr, mediaCpa, mediaRoasPct, gaCvr, gaCpa, gaRoasPct } = r;
            return (
              <TableRow
                key={`${r.label}:${r.media ?? ""}:${r.subLabel ?? ""}:${r.grainLevel ?? ""}:${r.matchStatus ?? ""}:${i}`}
                className={cn(r.isTotal && "bg-muted/40 font-medium")}
              >
                <TableCell
                  className={cn("whitespace-nowrap", monoLabel && !r.isTotal && "font-mono text-xs")}
                >
                  <div className="max-w-xs truncate" title={r.label}>
                    {r.label}
                  </div>
                  {r.subLabel && (
                    <div className="max-w-xs truncate text-[10px] font-mono text-muted-foreground" title={r.subLabel}>
                      {r.subLabel}
                    </div>
                  )}
                  {showBadges && !r.isTotal && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.grainLevel === "campaign" && (
                        <span
                          className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800"
                          title="Performance Max は媒体仕様上 広告グループ粒度が存在しないため、キャンペーン粒度に折返して表示"
                        >
                          PMax折返し（CPN粒度）
                        </span>
                      )}
                      {r.matchStatus && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            matchBadgeClass(r.matchStatus)
                          )}
                          title={MATCH_STATUS_DESC[r.matchStatus] ?? r.matchStatus}
                        >
                          {r.matchStatus}
                        </span>
                      )}
                      {r.hasUnmapped && (
                        <span
                          className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800"
                          title="同一キャンペーン/広告グループ配下に unmapped（GA計測はあるが対応広告費が未着）分を含む"
                        >
                          +未突合分
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                {showMedia && <TableCell>{r.media ?? ""}</TableCell>}
                <TableCell className="border-l text-right tabular-nums">{fmtJpy(r.cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(ctr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(cpc)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.mediaCv)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(mediaCvr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(mediaCpa)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtRatioPct(mediaRoasPct, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(r.mediaValue)}</TableCell>
                <TableCell className="border-l text-right tabular-nums">{fmtInt(r.sessions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.gaCvPurchase)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(gaCvr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(gaCpa)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(r.gaValue)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtRatioPct(gaRoasPct, 0)}</TableCell>
                {eventDefs.map((ev) => (
                  <TableCell key={ev.key} className="text-right tabular-nums">
                    {fmtInt(r.gaCvEvents[ev.key] ?? 0)}
                  </TableCell>
                ))}
                {showAdCvPurchase && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fmtInt(r.adCvPurchase ?? 0)}
                  </TableCell>
                )}
                {showOverall && (
                  <TableCell className="border-l text-right tabular-nums">
                    {fmtInt(r.overallCv)}
                  </TableCell>
                )}
                {showOverall && showOverallValue && (
                  <TableCell className="text-right tabular-nums">{fmtJpy(r.overallValue)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
