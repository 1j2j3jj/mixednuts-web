import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";
import type { MetricSource } from "./SourceToggle";

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
}

interface Props {
  rows: MediaRow[];
  /** Target ROAS as percentage (e.g. 1300 = 1300%). */
  targetRoasPct: number;
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
  return MEDIA_BADGE[m] ?? "bg-muted text-muted-foreground";
}

function roasClass(actualPct: number | null, targetPct: number): string {
  if (actualPct == null || !Number.isFinite(actualPct)) return "";
  if (actualPct >= targetPct) return "text-emerald-700 font-semibold";
  if (actualPct >= targetPct * 0.8) return "text-amber-700";
  return "text-rose-700";
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
    } as MediaRow
  );

  const cvLabel = source === "ga4" ? "GA4 CV" : "媒体CV";
  const revLabel = source === "ga4" ? "GA4 売上" : "媒体売上";
  const cpaLabel = source === "ga4" ? "GA4 CPA" : "媒体CPA";
  const roasLabel = source === "ga4" ? "GA4 ROAS" : "媒体ROAS";

  function renderRow(r: MediaRow, isTotal = false) {
    const ctr = safeDiv(r.clicks, r.impressions);
    const cpc = safeDiv(r.spend, r.clicks);
    const cv = source === "ga4" ? r.ga4Cv : r.adsCv;
    const rev = source === "ga4" ? r.ga4Revenue ?? 0 : r.conversionValue;
    const cvr = safeDiv(cv, r.clicks);
    const aov = safeDiv(rev, cv);
    const cpa = safeDiv(r.spend, cv);
    const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
    return (
      <TableRow key={r.media} className={cn(isTotal && "border-t-2 bg-muted/40 font-medium")}>
        <TableCell>
          {isTotal ? (
            <span>{r.media}</span>
          ) : (
            <span className={`inline-flex rounded px-2 py-0.5 text-xs ${mediaBadge(r.media)}`}>{r.media}</span>
          )}
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
        <TableCell className="text-right tabular-nums">{fmtJpy(aov)}</TableCell>
        <TableCell className={cn("text-right tabular-nums", !isTotal && roasClass(roasPct, targetRoasPct))}>
          {fmtRatioPct(roasPct, 0)}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>媒体</TableHead>
            <TableHead className="text-right">Spend</TableHead>
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
