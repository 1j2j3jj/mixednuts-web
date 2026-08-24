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
import { formatRoas } from "@/lib/roas-format";
import {
  MATCH_STATUS_LABEL,
  MATCH_STATUS_DESC,
  matchBadgeClass,
} from "@/lib/match-status";

export interface MediaRow {
  media: string;
  spend: number;
  impressions: number;
  clicks: number;
  /** Ad-platform reported conversions. */
  adsCv: number;
  /** GA4 purchase conversions (joined). */
  ga4Cv: number;
  /** Ad-platform reported conversion value (JPY). */
  conversionValue: number;
  /** GA4 purchase revenue (joined). 0 if unavailable. */
  ga4Revenue?: number;
  /**
   * Whether the GA4 join found a matching record for this media at all
   * (Phase D, ads-tab join-failure fix). `ga4Cv` stays `0` either way — this
   * field never changes what number renders, it only lets the table mark a
   * `0` that came from "no join found" differently from a `0` that came
   * from "joined, and the real value is zero". Optional so callers that
   * haven't computed it (none currently) still render exactly as before.
   */
  ga4Matched?: boolean;
}

interface Props {
  rows: MediaRow[];
  /** Target ROAS as percentage (e.g. 1300 = 1300%). null = 未設定（色分けなし）. */
  targetRoasPct: number | null;
  /** "ga4" (default) → show GA4-based CV/売上/CPA/ROAS; "media" → ad-platform values. */
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

/** Tailwind class per tier — kept alongside `higherIsBetterTier` (@/lib/tier,
 *  E-3 shared threshold module) rather than folded into it, since the exact
 *  class strings (font-semibold on "good" here, not in DrillTable's version)
 *  are a per-table style choice, while the THRESHOLD itself (>=target /
 *  >=80% of target) is now the one shared, non-duplicated source of truth. */
const ROAS_TIER_CLASS: Record<string, string> = {
  good: "text-emerald-700 font-semibold",
  warning: "text-amber-700",
  bad: "text-rose-700",
};

function roasClass(actualPct: number | null, targetPct: number | null): string {
  const tier = higherIsBetterTier(actualPct, targetPct);
  return tier ? ROAS_TIER_CLASS[tier] : "";
}

export default function MediaTable({ rows, targetRoasPct, source }: Props) {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  const tot = sorted.reduce(
    (s, r) => ({
      media: "合計",
      spend: s.spend + r.spend,
      impressions: s.impressions + r.impressions,
      clicks: s.clicks + r.clicks,
      adsCv: s.adsCv + r.adsCv,
      ga4Cv: s.ga4Cv + r.ga4Cv,
      conversionValue: s.conversionValue + r.conversionValue,
      ga4Revenue: (s.ga4Revenue ?? 0) + (r.ga4Revenue ?? 0),
    }),
    {
      media: "合計",
      spend: 0,
      impressions: 0,
      clicks: 0,
      adsCv: 0,
      ga4Cv: 0,
      conversionValue: 0,
      ga4Revenue: 0,
    } as MediaRow,
  );

  const cvLabel = source === "ga4" ? "コンバージョン（広告経由）" : "媒体CV";
  const revLabel = source === "ga4" ? "売上（広告経由）" : "媒体売上";
  const cpaLabel = source === "ga4" ? "CPA（広告経由）" : "媒体CPA";
  const roasLabel = source === "ga4" ? "ROAS（広告経由）" : "媒体ROAS";

  function renderRow(r: MediaRow, isTotal = false) {
    const ctr = safeDiv(r.clicks, r.impressions);
    const cpc = safeDiv(r.spend, r.clicks);
    const cv = source === "ga4" ? r.ga4Cv : r.adsCv;
    const rev = source === "ga4" ? (r.ga4Revenue ?? 0) : r.conversionValue;
    const cvr = safeDiv(cv, r.clicks);
    const aov = safeDiv(rev, cv);
    const cpa = safeDiv(r.spend, cv);
    const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
    const roasTier = isTotal
      ? null
      : higherIsBetterTier(roasPct, targetRoasPct);
    return (
      <TableRow key={r.media} className={cn(isTotal && TOTAL_ROW_CLASS)}>
        <TableCell scope={isTotal ? "row" : undefined}>
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
        <TableCell className="text-right tabular-nums">
          {fmtJpy(r.spend)}
        </TableCell>
        <TableCell>
          {/* C2-b share-of-total column (e.g. "Google is 78% of spend",
              previously not visually encoded at all). For the total row,
              r === tot, so this naturally reads 100% when spend > 0, or the
              zero-denominator em-dash when total spend is 0 — no special
              case needed. */}
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
          {/* Join-failure marker (Phase D, reuses report tab's exact
              matched/unmapped vocabulary — @/lib/match-status): this media
              had ad spend but the GA4 join found no matching record, so `cv`
              is `0` *because we couldn't match it*, not because it measured
              zero. Only shown on the GA4-basis column and never on the total
              row (the total's own caveat is the KPI-grid note above this
              table, unchanged). */}
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
        <TableCell className="text-right tabular-nums">{fmtJpy(aov)}</TableCell>
        <TableCell
          className={cn(
            "text-right tabular-nums",
            !isTotal && roasClass(roasPct, targetRoasPct),
          )}
        >
          {/* E-3: roasClass's colour was previously the ONLY signal for
              hit/near-miss/missed target — TierGlyph (@/lib/tier +
              TierGlyph.tsx) adds a shape (check/triangle/X), not just another
              colour, so the judgement survives without colour perception. */}
          <span className="inline-flex items-center justify-end gap-1">
            {roasTier && <TierGlyph tier={roasTier} />}
            {formatRoas(roasPct)}
          </span>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption className="sr-only">媒体別サマリテーブル</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>媒体</TableHead>
            <TableHead className="text-right">広告費</TableHead>
            <TableHead className="text-right">広告費比</TableHead>
            <TableHead className="text-right">Imp</TableHead>
            <TableHead className="text-right">Click</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">CPC</TableHead>
            <TableHead className="text-right">{cvLabel}</TableHead>
            <TableHead className="text-right">CVR</TableHead>
            <TableHead className="text-right">{cpaLabel}</TableHead>
            <TableHead className="text-right">{revLabel}</TableHead>
            <TableHead className="text-right">商品単価</TableHead>
            <TableHead className="text-right">{roasLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => renderRow(r))}
          {renderRow(tot, true)}
        </TableBody>
      </Table>
    </div>
  );
}
