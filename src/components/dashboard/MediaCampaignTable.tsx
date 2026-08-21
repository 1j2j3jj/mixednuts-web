"use client";

import { useMemo, useState } from "react";
import SegmentedControl from "@/components/dashboard/SegmentedControl";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TOTAL_ROW_CLASS,
} from "@/components/ui/table";
import ShareBar from "@/components/dashboard/ShareBar";
import TierGlyph from "@/components/dashboard/TierGlyph";
import { cn, fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";
import { computeShare } from "@/lib/share";
import type { MetricSource } from "@/lib/source";
import { higherIsBetterTier } from "@/lib/tier";
import { MATCH_STATUS_DESC } from "@/lib/match-status";
import { formatRoas } from "@/lib/roas-format";

export interface MediaCampaignRow {
  media: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  adsCv: number;
  ga4Cv: number;
  conversionValue: number;
  ga4Revenue: number;
  ga4Matched?: boolean;
}

interface Props {
  rows: MediaCampaignRow[];
  targetRoasPct: number | null;
  source: MetricSource;
}

type MetricColumn =
  | "cost"
  | "costShare"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cv"
  | "cvr"
  | "cpa"
  | "revenue"
  | "unitPrice"
  | "roas";

const DEFAULT_COLUMNS: MetricColumn[] = [
  "cost",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cv",
  "cpa",
];
const OPTIONAL_COLUMNS: MetricColumn[] = [
  "costShare",
  "cvr",
  "revenue",
  "unitPrice",
  "roas",
];
const ALL = "__all__";

const MEDIA_BADGE: Record<string, string> = {
  Google: "bg-blue-100 text-blue-800",
  Microsoft: "bg-teal-100 text-teal-800",
  Yahoo: "bg-purple-100 text-purple-800",
  meta: "bg-sky-100 text-sky-800",
  LinkedIn: "bg-indigo-100 text-indigo-800",
};

function mediaBadge(media: string): string {
  return MEDIA_BADGE[media] ?? "bg-muted text-control-idle-foreground";
}

const ROAS_TIER_CLASS: Record<string, string> = {
  good: "text-emerald-700 font-semibold",
  warning: "text-amber-700",
  bad: "text-rose-700",
};

function roasClass(actualPct: number | null, targetPct: number | null): string {
  const tier = higherIsBetterTier(actualPct, targetPct);
  return tier ? ROAS_TIER_CLASS[tier] : "";
}

function columnLabel(column: MetricColumn, source: MetricSource): string {
  const sourceLabels =
    source === "ga4"
      ? { cv: "GA_CV", cpa: "GA_CPA", revenue: "GA売上", roas: "GA_ROAS" }
      : { cv: "媒体CV", cpa: "媒体CPA", revenue: "媒体売上", roas: "媒体ROAS" };
  return (
    {
      cost: "COST",
      costShare: "COST比",
      impressions: "IMP",
      clicks: "CLICK",
      ctr: "CTR",
      cpc: "CPC",
      cv: sourceLabels.cv,
      cvr: "CVR",
      cpa: sourceLabels.cpa,
      revenue: sourceLabels.revenue,
      unitPrice: "商品単価",
      roas: sourceLabels.roas,
    } satisfies Record<MetricColumn, string>
  )[column];
}

function rowMetrics(row: MediaCampaignRow, source: MetricSource) {
  const cv = source === "ga4" ? row.ga4Cv : row.adsCv;
  const revenue = source === "ga4" ? row.ga4Revenue : row.conversionValue;
  return {
    cost: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: safeDiv(row.clicks, row.impressions),
    cpc: safeDiv(row.spend, row.clicks),
    cv,
    cvr: safeDiv(cv, row.clicks),
    cpa: safeDiv(row.spend, cv),
    revenue,
    unitPrice: safeDiv(revenue, cv),
    roas: row.spend > 0 ? (revenue / row.spend) * 100 : null,
  };
}

export default function MediaCampaignTable({
  rows,
  targetRoasPct,
  source,
}: Props) {
  const mediaList = useMemo(() => {
    const priority = ["Google", "Yahoo", "Microsoft", "meta", "LinkedIn"];
    return Array.from(new Set(rows.map((row) => row.media).filter(Boolean))).sort(
      (a, b) => {
        const ai = priority.indexOf(a);
        const bi = priority.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      },
    );
  }, [rows]);
  const [selected, setSelected] = useState(ALL);
  const [addedColumns, setAddedColumns] = useState<MetricColumn[]>([]);

  const filtered = useMemo(() => {
    const selectedRows =
      selected === ALL ? rows : rows.filter((row) => row.media === selected);
    return [...selectedRows].sort((a, b) => b.spend - a.spend);
  }, [rows, selected]);

  const total = useMemo(
    () =>
      filtered.reduce<MediaCampaignRow>(
        (sum, row) => ({
          ...sum,
          spend: sum.spend + row.spend,
          impressions: sum.impressions + row.impressions,
          clicks: sum.clicks + row.clicks,
          adsCv: sum.adsCv + row.adsCv,
          ga4Cv: sum.ga4Cv + row.ga4Cv,
          conversionValue: sum.conversionValue + row.conversionValue,
          ga4Revenue: sum.ga4Revenue + row.ga4Revenue,
        }),
        {
          media: selected === ALL ? "合計 (全媒体)" : `合計 (${selected})`,
          campaignId: "",
          campaignName: "",
          spend: 0,
          impressions: 0,
          clicks: 0,
          adsCv: 0,
          ga4Cv: 0,
          conversionValue: 0,
          ga4Revenue: 0,
        },
      ),
    [filtered, selected],
  );

  // C-7 uses the complete result set, not the active media pill, so columns
  // do not appear/disappear while the reader filters rows. A column is empty
  // only when every row resolves to null/— or numeric zero.
  const autoHidden = useMemo(() => {
    const hidden = new Set<MetricColumn>();
    const candidates: Array<Exclude<MetricColumn, "costShare">> = [
      "cost",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "cv",
      "cvr",
      "cpa",
      "revenue",
      "unitPrice",
      "roas",
    ];
    for (const column of candidates) {
      const empty = rows.every((row) => {
        const value = rowMetrics(row, source)[column];
        return value == null || value === 0;
      });
      if (empty) hidden.add(column);
    }
    return hidden;
  }, [rows, source]);

  const visibleColumns = [...DEFAULT_COLUMNS, ...addedColumns].filter(
    (column, index, columns) =>
      columns.indexOf(column) === index && !autoHidden.has(column),
  );
  const unmatchedCount = filtered.filter(
    (row) => source === "ga4" && row.ga4Matched === false,
  ).length;

  function renderMetricCell(
    row: MediaCampaignRow,
    column: MetricColumn,
    isTotal: boolean,
  ) {
    const value = rowMetrics(row, source);
    if (column === "cost") return fmtJpy(value.cost);
    if (column === "costShare") {
      return <ShareBar ratio={computeShare(row.spend, total.spend)} />;
    }
    if (column === "impressions") return fmtInt(value.impressions);
    if (column === "clicks") return fmtInt(value.clicks);
    if (column === "ctr") return fmtPct(value.ctr, 2);
    if (column === "cpc") return fmtJpy(value.cpc);
    if (column === "cv") {
      return (
        <span className="inline-flex items-center justify-end gap-1.5">
          {fmtInt(value.cv)}
          {source === "ga4" && !isTotal && row.ga4Matched === false && (
            <span
              aria-label="未突合"
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              title={MATCH_STATUS_DESC.unmapped}
            />
          )}
        </span>
      );
    }
    if (column === "cvr") return fmtPct(value.cvr, 2);
    if (column === "cpa") return fmtJpy(value.cpa);
    if (column === "revenue") return fmtJpy(value.revenue);
    if (column === "unitPrice") return fmtJpy(value.unitPrice);
    const tier = isTotal ? null : higherIsBetterTier(value.roas, targetRoasPct);
    return (
      <span className="inline-flex items-center justify-end gap-1">
        {tier && <TierGlyph tier={tier} />}
        {formatRoas(value.roas)}
      </span>
    );
  }

  function renderRow(row: MediaCampaignRow, isTotal = false) {
    return (
      <TableRow
        key={
          isTotal
            ? "__total__"
            : `${row.media}|${row.campaignId}|${row.campaignName}`
        }
        className={cn(isTotal && TOTAL_ROW_CLASS)}
      >
        <TableCell
          scope={isTotal ? "row" : undefined}
          className={cn(
            "sticky left-0 z-10 whitespace-nowrap border-r bg-card",
            isTotal && "bg-muted",
          )}
        >
          {isTotal ? (
            row.media
          ) : (
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs",
                mediaBadge(row.media),
              )}
            >
              {row.media}
            </span>
          )}
        </TableCell>
        <TableCell className="max-w-[320px] truncate" title={row.campaignName}>
          {isTotal
            ? ""
            : row.campaignName || (
                <span className="text-muted-foreground">(no name)</span>
              )}
        </TableCell>
        {visibleColumns.map((column) => (
          <TableCell
            key={column}
            className={cn(
              "whitespace-nowrap text-right tabular-nums",
              column === "costShare" && "min-w-28",
              column === "roas" &&
                !isTotal &&
                roasClass(rowMetrics(row, source).roas, targetRoasPct),
            )}
          >
            {renderMetricCell(row, column, isTotal)}
          </TableCell>
        ))}
      </TableRow>
    );
  }

  const hiddenLabels = Array.from(autoHidden).map((column) =>
    columnLabel(column, source),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={selected}
          options={[
            { value: ALL, label: "全媒体" },
            ...mediaList.map((media) => ({ value: media, label: media })),
          ]}
          onValueChange={setSelected}
          ariaLabel="媒体フィルター"
          size="md"
          shape="pill"
          className="flex flex-wrap"
        />
        <span className="ml-2 text-xs text-muted-foreground">
          {filtered.length} キャンペーン
        </span>
        <details className="relative ml-auto">
          <summary className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium marker:content-none">
            列を追加
          </summary>
          <div className="absolute right-0 z-30 mt-2 min-w-44 space-y-2 rounded-md border bg-popover p-3 shadow-card">
            {OPTIONAL_COLUMNS.map((column) => (
              <label key={column} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={addedColumns.includes(column)}
                  disabled={autoHidden.has(column)}
                  onChange={(event) =>
                    setAddedColumns((current) =>
                      event.target.checked
                        ? [...current, column]
                        : current.filter((item) => item !== column),
                    )
                  }
                />
                {columnLabel(column, source)}
              </label>
            ))}
          </div>
        </details>
      </div>

      {unmatchedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length}件中{unmatchedCount}件が未突合
        </p>
      )}

      <div className="relative overflow-hidden rounded-md border after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-20 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent">
        <Table className="min-w-max">
          <TableCaption className="sr-only">
            媒体 × キャンペーン別サマリテーブル
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 border-r bg-card">
                媒体
              </TableHead>
              <TableHead>キャンペーン</TableHead>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column}
                  className="whitespace-nowrap text-right"
                >
                  {columnLabel(column, source)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 2}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  該当キャンペーンなし
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filtered.map((row) => renderRow(row))}
                {renderRow(total, true)}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {hiddenLabels.length > 0 && (
        <p className="text-xs text-muted-foreground">
          全行が0または—のため非表示: {hiddenLabels.join(" / ")}
        </p>
      )}
    </div>
  );
}
