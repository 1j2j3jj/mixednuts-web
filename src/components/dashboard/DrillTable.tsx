import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { detectAnomalies } from "@/lib/analysis";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

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
  rows: DrillRow[];
  /** Target ROAS percentage for cell colouring. */
  targetRoasPct: number;
  /** Target CPA for cell colouring. */
  targetCpa: number;
  /** Current drill level — decides whether the "ラベル" column is rendered.
   *  - "media": row identity === 媒体, so the label column is redundant
   *  - "bucket": row identity === date (already shown in 期間), so redundant
   *  - "campaign" / "adgroup": label carries the breakdown name, shown */
  level?: "media" | "campaign" | "adgroup" | "bucket";
}

function roasClass(actualPct: number | null, targetPct: number): string {
  if (actualPct == null || !Number.isFinite(actualPct)) return "";
  if (actualPct >= targetPct) return "text-emerald-700";
  if (actualPct >= targetPct * 0.8) return "text-amber-700";
  return "text-rose-700 font-medium";
}

function cpaClass(actual: number | null, target: number): string {
  if (actual == null || !Number.isFinite(actual)) return "";
  if (actual <= target) return "text-emerald-700";
  if (actual <= target * 1.2) return "text-amber-700";
  return "text-rose-700 font-medium";
}

export default function DrillTable({ rows, targetRoasPct, targetCpa, level = "campaign" }: Props) {
  // Primary sort: date desc (latest first). Secondary: spend desc.
  const sorted = [...rows].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.spend - a.spend;
  });

  // Anomaly detection on Spend (±2σ). Flagged rows get a subtle
  // coloured left border and a badge — no drama.
  const spendFlags = detectAnomalies(sorted.map((r) => r.spend));
  const cvFlags = detectAnomalies(sorted.map((r) => r.conversions));

  const showLabel = level === "campaign" || level === "adgroup";
  const labelHeader = level === "campaign" ? "キャンペーン" : level === "adgroup" ? "広告グループ" : "";
  // GA4 columns only make sense at campaign / adgroup granularity.
  const showGa4 = level === "campaign" || level === "adgroup";
  const colSpan =
    (showLabel ? 1 : 0) + (showGa4 ? 3 : 0) + 10;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>期間</TableHead>
            <TableHead>媒体</TableHead>
            {showLabel && <TableHead>{labelHeader}</TableHead>}
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Imp</TableHead>
            <TableHead className="text-right">Click</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">媒体CV</TableHead>
            {showGa4 && <TableHead className="text-right">GA4 CV</TableHead>}
            {showGa4 && <TableHead className="text-right">GA4 Sessions</TableHead>}
            {showGa4 && <TableHead className="text-right">GA4 売上</TableHead>}
            <TableHead className="text-right">CPA</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">異常</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
                フィルタに合致するデータがありません
              </TableCell>
            </TableRow>
          )}
          {sorted.map((r, i) => {
            const ctr = safeDiv(r.clicks, r.impressions);
            const cpa = safeDiv(r.spend, r.conversions);
            const roasPct = r.spend > 0 ? (r.conversionValue / r.spend) * 100 : null;
            const spendFlag = spendFlags[i];
            const cvFlag = cvFlags[i];
            const hasAnomaly = spendFlag !== "normal" || cvFlag !== "normal";
            const anomalyLabel =
              spendFlag !== "normal" && cvFlag !== "normal"
                ? "Spend+CV"
                : spendFlag !== "normal"
                ? "Spend"
                : cvFlag !== "normal"
                ? "CV"
                : "";
            return (
              <TableRow
                key={`${r.date}:${r.key}:${i}`}
                className={cn(hasAnomaly && "bg-amber-50/60")}
              >
                <TableCell className="whitespace-nowrap font-mono text-xs">{r.date || "—"}</TableCell>
                <TableCell>{r.media}</TableCell>
                {showLabel && (
                  <TableCell className="font-medium">
                    <div className="max-w-md truncate" title={r.key}>
                      {r.key}
                    </div>
                    {r.subKey && (
                      <div className="text-[10px] font-mono text-muted-foreground">{r.subKey}</div>
                    )}
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    spendFlag === "high" && "text-amber-700",
                    spendFlag === "low" && "text-sky-700"
                  )}
                >
                  {fmtJpy(r.spend)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(ctr, 2)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    cvFlag === "high" && "text-emerald-700",
                    cvFlag === "low" && "text-rose-700"
                  )}
                >
                  {fmtInt(r.conversions)}
                </TableCell>
                {showGa4 && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.ga4Conversions == null ? "—" : fmtInt(r.ga4Conversions)}
                  </TableCell>
                )}
                {showGa4 && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.ga4Sessions == null ? "—" : fmtInt(r.ga4Sessions)}
                  </TableCell>
                )}
                {showGa4 && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.ga4Revenue == null ? "—" : fmtJpy(r.ga4Revenue)}
                  </TableCell>
                )}
                <TableCell className={cn("text-right tabular-nums", cpaClass(cpa, targetCpa))}>
                  {fmtJpy(cpa)}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", roasClass(roasPct, targetRoasPct))}>
                  {fmtRatioPct(roasPct, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {hasAnomaly && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                      {anomalyLabel}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t bg-muted/20 p-2 text-[11px] text-muted-foreground">
        異常 = ±2σ を超える行（Spend または CV 方向）。検出目安であって判定ではない。
      </div>
    </div>
  );
}
