"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";
import type { MetricSource } from "@/lib/source";

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
}

interface Props {
  rows: MediaCampaignRow[];
  /** Target ROAS (percentage) used to color ROAS cells. */
  targetRoasPct: number;
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
  return MEDIA_BADGE[m] ?? "bg-muted text-muted-foreground";
}

function roasClass(actualPct: number | null, targetPct: number): string {
  if (actualPct == null || !Number.isFinite(actualPct)) return "";
  if (actualPct >= targetPct) return "text-emerald-700 font-semibold";
  if (actualPct >= targetPct * 0.8) return "text-amber-700";
  return "text-rose-700";
}

const ALL = "__all__";

export default function MediaCampaignTable({ rows, targetRoasPct, source }: Props) {
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
    const list = selected === ALL ? rows : rows.filter((r) => r.media === selected);
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
      }
    );
  }, [filtered, selected]);

  const cvLabel = source === "ga4" ? "GA4 CV" : "媒体CV";
  const revLabel = source === "ga4" ? "GA4 売上" : "媒体売上";
  const cpaLabel = source === "ga4" ? "GA4 CPA" : "媒体CPA";
  const roasLabel = source === "ga4" ? "GA4 ROAS" : "媒体ROAS";

  function renderRow(r: MediaCampaignRow, isTotal = false) {
    const ctr = safeDiv(r.clicks, r.impressions);
    const cpc = safeDiv(r.spend, r.clicks);
    const cv = source === "ga4" ? r.ga4Cv : r.adsCv;
    const rev = source === "ga4" ? r.ga4Revenue : r.conversionValue;
    const cvr = safeDiv(cv, r.clicks);
    const cpa = safeDiv(r.spend, cv);
    const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
    const rowKey = isTotal ? "__total__" : `${r.media}|${r.campaignId}|${r.campaignName}`;
    return (
      <TableRow key={rowKey} className={cn(isTotal && "border-t-2 bg-muted/40 font-medium")}>
        <TableCell className="whitespace-nowrap">
          {isTotal ? (
            <span>{r.media}</span>
          ) : (
            <span className={`inline-flex rounded px-2 py-0.5 text-xs ${mediaBadge(r.media)}`}>{r.media}</span>
          )}
        </TableCell>
        <TableCell className="max-w-[320px] truncate" title={r.campaignName}>
          {isTotal ? "" : r.campaignName || <span className="text-muted-foreground">(no name)</span>}
        </TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(r.spend)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtPct(ctr, 2)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(cpc)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(cv)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtPct(cvr, 2)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(cpa)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(rev)}</TableCell>
        <TableCell className={cn("text-right tabular-nums", !isTotal && roasClass(roasPct, targetRoasPct))}>
          {fmtRatioPct(roasPct, 0)}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-3">
      {/* Media filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <PillButton
          active={selected === ALL}
          onClick={() => setSelected(ALL)}
          label="全媒体"
        />
        {mediaList.map((m) => (
          <PillButton
            key={m}
            active={selected === m}
            onClick={() => setSelected(m)}
            label={m}
            badgeClass={mediaBadge(m)}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">
          {filtered.length} キャンペーン
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>媒体</TableHead>
              <TableHead>キャンペーン</TableHead>
              <TableHead className="text-right">Spend</TableHead>
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
                <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
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

function PillButton({
  active,
  onClick,
  label,
  badgeClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badgeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted",
        badgeClass && !active && badgeClass
      )}
    >
      {label}
    </button>
  );
}
