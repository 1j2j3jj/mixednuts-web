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
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";
import { computeShare } from "@/lib/share";
import type { MetricSource } from "@/lib/source";
import { higherIsBetterTier } from "@/lib/tier";
import {
  MATCH_STATUS_LABEL,
  MATCH_STATUS_DESC,
  matchBadgeClass,
} from "@/lib/match-status";

/**
 * Media × Campaign summary. Sits below the 媒体別サマリ table on the Ads
 * screen and lets the viewer quickly compare campaigns across (or within)
 * a selected media. Source toggle (GA4 / 媒体) cascades from the parent
 * page so CV / CPA / 売上 / ROAS columns flip together with the top KPIs.
 *
 * Interaction is entirely client-side: media filter is local state, no URL
 * round-trip, so the page doesn't refetch. Rows are sorted by Spend desc
 * within the filtered set.
 */

export interface MediaCampaignRow {
  media: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  /** Ad-platform reported conversions. */
  adsCv: number;
  /** GA4 purchase conversions joined by (media, matchKey). */
  ga4Cv: number;
  /** Ad-platform reported conversion value (JPY). */
  conversionValue: number;
  /** GA4 purchase revenue joined. 0 if no match. */
  ga4Revenue: number;
  /** Whether the GA4 join found a matching record for this campaign at all
   *  (Phase D). `ga4Cv`/`ga4Revenue` stay `0` either way — see MediaRow's
   *  identical field for the full rationale. */
  ga4Matched?: boolean;
}

interface Props {
  rows: MediaCampaignRow[];
  /** Target ROAS (percentage) used to color ROAS cells. null = 未設定（色分けなし）. */
  targetRoasPct: number | null;
  /** Inherited from parent. "ga4" (default) = GA4 CV/売上/ROAS; "media" = ad-platform. */
  source: MetricSource;
}

const MEDIA_BADGE: Record<string, string> = {
  Google: "bg-blue-100 text-blue-800",
  Microsoft: "bg-teal-100 text-teal-800",
  Yahoo: "bg-purple-100 text-purple-800",
  meta: "bg-sky-100 text-sky-800",
  LinkedIn: "bg-indigo-100 text-indigo-800",
};

function mediaBadge(m: string): string {
  // 未突合媒体のフォールバック。text-muted-foreground を opaque な bg-muted に
  // 乗せると 4.35:1 で AA(4.5:1)未達になるため、SegmentedControl と同じ
  // control-idle-foreground（bg-muted 上で 5.04:1）を使う。
  return MEDIA_BADGE[m] ?? "bg-muted text-control-idle-foreground";
}

/** See MediaTable.tsx's identical constant for the rationale — threshold
 *  logic lives once in @/lib/tier, only the class strings are per-table. */
const ROAS_TIER_CLASS: Record<string, string> = {
  good: "text-emerald-700 font-semibold",
  warning: "text-amber-700",
  bad: "text-rose-700",
};

function roasClass(actualPct: number | null, targetPct: number | null): string {
  const tier = higherIsBetterTier(actualPct, targetPct);
  return tier ? ROAS_TIER_CLASS[tier] : "";
}

const ALL = "__all__";

export default function MediaCampaignTable({
  rows,
  targetRoasPct,
  source,
}: Props) {
  // Distinct media present in the data — drives the filter pill set.
  const mediaList = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.media) s.add(r.media);
    // Stable order: Google → Yahoo → Microsoft → meta → LinkedIn → others
    const priority = ["Google", "Yahoo", "Microsoft", "meta", "LinkedIn"];
    const out = Array.from(s);
    out.sort((a, b) => {
      const ia = priority.indexOf(a);
      const ib = priority.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return out;
  }, [rows]);

  const [selected, setSelected] = useState<string>(ALL);

  const filtered = useMemo(() => {
    const list =
      selected === ALL ? rows : rows.filter((r) => r.media === selected);
    return [...list].sort((a, b) => b.spend - a.spend);
  }, [rows, selected]);

  const tot = useMemo<MediaCampaignRow>(() => {
    return filtered.reduce<MediaCampaignRow>(
      (s, r) => ({
        media: selected === ALL ? "合計 (全媒体)" : `合計 (${selected})`,
        campaignId: "",
        campaignName: "",
        spend: s.spend + r.spend,
        impressions: s.impressions + r.impressions,
        clicks: s.clicks + r.clicks,
        adsCv: s.adsCv + r.adsCv,
        ga4Cv: s.ga4Cv + r.ga4Cv,
        conversionValue: s.conversionValue + r.conversionValue,
        ga4Revenue: s.ga4Revenue + r.ga4Revenue,
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
    );
  }, [filtered, selected]);

  const cvLabel = source === "ga4" ? "GA_CV" : "媒体CV";
  const revLabel = source === "ga4" ? "GA売上" : "媒体売上";
  const cpaLabel = source === "ga4" ? "GA_CPA" : "媒体CPA";
  const roasLabel = source === "ga4" ? "GA_ROAS" : "媒体ROAS";

  function renderRow(r: MediaCampaignRow, isTotal = false) {
    const ctr = safeDiv(r.clicks, r.impressions);
    const cpc = safeDiv(r.spend, r.clicks);
    const cv = source === "ga4" ? r.ga4Cv : r.adsCv;
    const rev = source === "ga4" ? r.ga4Revenue : r.conversionValue;
    const cvr = safeDiv(cv, r.clicks);
    const cpa = safeDiv(r.spend, cv);
    const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
    const roasTier = isTotal
      ? null
      : higherIsBetterTier(roasPct, targetRoasPct);
    const rowKey = isTotal
      ? "__total__"
      : `${r.media}|${r.campaignId}|${r.campaignName}`;
    return (
      <TableRow key={rowKey} className={cn(isTotal && TOTAL_ROW_CLASS)}>
        <TableCell
          scope={isTotal ? "row" : undefined}
          className="whitespace-nowrap"
        >
          {isTotal ? (
            <span>{r.media}</span>
          ) : (
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs ${mediaBadge(r.media)}`}
            >
              {r.media}
            </span>
          )}
        </TableCell>
        <TableCell className="max-w-[320px] truncate" title={r.campaignName}>
          {isTotal
            ? ""
            : r.campaignName || (
                <span className="text-muted-foreground">(no name)</span>
              )}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {fmtJpy(r.spend)}
        </TableCell>
        <TableCell>
          {/* C2-b share-of-total column, scoped to the CURRENTLY FILTERED
              set (tot already re-sums per media-pill selection above) so
              the share reads correctly whether "全媒体" or a single medium
              is selected. */}
          <ShareBar ratio={computeShare(r.spend, tot.spend)} />
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
        <TableCell className="text-right tabular-nums">{fmtJpy(cpc)}</TableCell>
        <TableCell className="text-right tabular-nums">
          {/* Join-failure marker — same mechanism/vocabulary as MediaTable
              (Phase D, reuses report tab's matched/unmapped badge). */}
          <span className="inline-flex items-center justify-end gap-1">
            {fmtInt(cv)}
            {source === "ga4" && !isTotal && r.ga4Matched === false && (
              <span
                className={cn(
                  "rounded px-1 py-0.5 text-xs leading-none",
                  matchBadgeClass("unmapped"),
                )}
                title={MATCH_STATUS_DESC.unmapped}
              >
                {MATCH_STATUS_LABEL.unmapped}
              </span>
            )}
          </span>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {fmtPct(cvr, 2)}
        </TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(cpa)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(rev)}</TableCell>
        <TableCell
          className={cn(
            "text-right tabular-nums",
            !isTotal && roasClass(roasPct, targetRoasPct),
          )}
        >
          {/* E-3: non-colour carrier — see MediaTable.tsx's identical fix. */}
          <span className="inline-flex items-center justify-end gap-1">
            {roasTier && <TierGlyph tier={roasTier} />}
            {fmtRatioPct(roasPct, 0)}
          </span>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-3">
      {/* Media filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={selected}
          options={[
            { value: ALL, label: "全媒体" },
            // Media pills stay text-only when unselected: their old badge
            // fills (bg-blue-100 等) sat *darker* than the selected state's
            // bg-brand/14, inverting which pill reads as active. The media's
            // identity colour still lives on the badge inside each table row.
            ...mediaList.map((media) => ({
              value: media,
              label: media,
            })),
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption className="sr-only">
            媒体 × キャンペーン別サマリテーブル
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>媒体</TableHead>
              <TableHead>キャンペーン</TableHead>
              <TableHead className="text-right">COST</TableHead>
              <TableHead className="text-right">COST比</TableHead>
              <TableHead className="text-right">Imp</TableHead>
              <TableHead className="text-right">Click</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">{cvLabel}</TableHead>
              <TableHead className="text-right">CVR</TableHead>
              <TableHead className="text-right">{cpaLabel}</TableHead>
              <TableHead className="text-right">{revLabel}</TableHead>
              <TableHead className="text-right">{roasLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  該当キャンペーンなし
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filtered.map((r) => renderRow(r))}
                {renderRow(tot, true)}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
