import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

export interface MediaRow {
  media: string;
  spend: number;
  impressions: number;
  clicks: number;
  adsCv: number;
  ga4Cv: number;
  conversionValue: number;
}

interface Props {
  rows: MediaRow[];
  /** Target ROAS as percentage (e.g. 1300 = 1300%). Used for cell colouring. */
  targetRoasPct: number;
}

function roasClass(actualPct: number | null, targetPct: number): string {
  if (actualPct == null || !Number.isFinite(actualPct)) return "";
  if (actualPct >= targetPct) return "text-emerald-700 font-semibold";
  if (actualPct >= targetPct * 0.8) return "text-amber-700";
  return "text-rose-700";
}

export default function MediaTable({ rows, targetRoasPct }: Props) {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  // Totals row for readability.
  const tot = sorted.reduce(
    (s, r) => ({
      media: "合計",
      spend: s.spend + r.spend,
      impressions: s.impressions + r.impressions,
      clicks: s.clicks + r.clicks,
      adsCv: s.adsCv + r.adsCv,
      ga4Cv: s.ga4Cv + r.ga4Cv,
      conversionValue: s.conversionValue + r.conversionValue,
    }),
    { media: "合計", spend: 0, impressions: 0, clicks: 0, adsCv: 0, ga4Cv: 0, conversionValue: 0 } as MediaRow
  );

  function renderRow(r: MediaRow, isTotal = false) {
    const ctr = safeDiv(r.clicks, r.impressions);
    const cpc = safeDiv(r.spend, r.clicks);
    const diffAbs = r.adsCv - r.ga4Cv;
    const diffPct = safeDiv(diffAbs, r.ga4Cv);
    const adsCpa = safeDiv(r.spend, r.adsCv);
    const ga4Cpa = safeDiv(r.spend, r.ga4Cv);
    const roasPct = r.spend > 0 ? (r.conversionValue / r.spend) * 100 : null;
    return (
      <TableRow key={r.media} className={cn(isTotal && "border-t-2 bg-muted/40 font-medium")}>
        <TableCell>{r.media}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(r.spend)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtPct(ctr, 2)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(cpc)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(r.adsCv)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtInt(r.ga4Cv)}</TableCell>
        <TableCell
          className={cn(
            "text-right tabular-nums text-xs",
            Math.abs(diffPct ?? 0) > 0.1 && "text-amber-700"
          )}
        >
          {diffAbs >= 0 ? "+" : ""}
          {fmtInt(diffAbs)}
          <span className="ml-1 text-muted-foreground">({diffPct == null ? "—" : fmtPct(diffPct, 1)})</span>
        </TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(adsCpa)}</TableCell>
        <TableCell className="text-right tabular-nums">{fmtJpy(ga4Cpa)}</TableCell>
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
            <TableHead className="text-right">媒体CV</TableHead>
            <TableHead className="text-right">GA4 CV</TableHead>
            <TableHead className="text-right">差分</TableHead>
            <TableHead className="text-right">媒体CPA</TableHead>
            <TableHead className="text-right">GA4 CPA</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => renderRow(r))}
          {renderRow(tot, true)}
        </TableBody>
      </Table>
      <div className="border-t bg-muted/20 p-2 text-[11px] text-muted-foreground">
        差分 = 媒体CV − GA4 CV。構造的に一致しない（帰属日・カウント方式の差）。絶対値より差分の時系列変化を監視。
      </div>
    </div>
  );
}
