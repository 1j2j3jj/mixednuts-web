import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { detectAnomalies } from "@/lib/analysis";
import type { MetricSource } from "@/lib/source";
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
}

function roasClass(actualPct: number | null, targetPct: number | null): string {
  if (actualPct == null || !Number.isFinite(actualPct)) return "";
  // null / <=0 means no configured target for this row's month — don't
  // colour-code against a missing or meaningless zero target.
  if (targetPct == null || targetPct <= 0) return "";
  if (actualPct >= targetPct) return "text-emerald-700";
  if (actualPct >= targetPct * 0.8) return "text-amber-700";
  return "text-rose-700 font-medium";
}

function cpaClass(actual: number | null, target: number | null): string {
  if (actual == null || !Number.isFinite(actual)) return "";
  if (target == null || target <= 0) return "";
  if (actual <= target) return "text-emerald-700";
  if (actual <= target * 1.2) return "text-amber-700";
  return "text-rose-700 font-medium";
}

export default function DrillTable({
  rows,
  targetRoasPct,
  targetCpa,
  level = "campaign",
  source = "ga4",
  targetsByMonth,
}: Props) {
  // Resolve the ROAS/CPA target that applies to a given row, using its own
  // bucket month (P2-1) — falls back to the anchor-month targetRoasPct/
  // targetCpa props when targetsByMonth has no entry for that month (e.g.
  // level="bucket" rows, whose date is the raw bucket key, not necessarily
  // "YYYY-MM"-prefixed in a way targetsByMonth was populated for).
  function targetsForRow(row: DrillRow): { roasPct: number | null; cpa: number | null } {
    const ym = row.date.slice(0, 7);
    return targetsByMonth?.get(ym) ?? { roasPct: targetRoasPct, cpa: targetCpa };
  }

  // Primary sort: date desc (latest first). Secondary: spend desc.
  const sorted = [...rows].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.spend - a.spend;
  });

  // Anomaly detection on Spend (±2σ). Flagged rows get a subtle
  // coloured left border and a badge — no drama.
  const spendFlags = detectAnomalies(sorted.map((r) => r.spend));
  // CV flags use the currently-selected source's CV for consistency.
  const cvFlags = detectAnomalies(
    sorted.map((r) => (source === "ga4" ? r.ga4Conversions ?? 0 : r.conversions))
  );

  const showLabel = level === "campaign" || level === "adgroup";
  const labelHeader = level === "campaign" ? "キャンペーン" : level === "adgroup" ? "広告グループ" : "";
  const cvLabel = source === "ga4" ? "GA4 CV" : "媒体CV";
  const revLabel = source === "ga4" ? "GA4 売上" : "媒体売上";
  const colSpan = (showLabel ? 1 : 0) + 11;

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
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
                フィルタに合致するデータがありません
              </TableCell>
            </TableRow>
          )}
          {sorted.map((r, i) => {
            const ctr = safeDiv(r.clicks, r.impressions);
            const cv = source === "ga4" ? r.ga4Conversions ?? 0 : r.conversions;
            const rev = source === "ga4" ? r.ga4Revenue ?? 0 : r.conversionValue;
            const cpa = safeDiv(r.spend, cv);
            const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
            const rowTargets = targetsForRow(r);
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
                  {fmtInt(cv)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(rev)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", cpaClass(cpa, rowTargets.cpa))}>
                  {fmtJpy(cpa)}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", roasClass(roasPct, rowTargets.roasPct))}>
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
