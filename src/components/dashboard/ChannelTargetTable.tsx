import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtRatioPct, safeDiv } from "@/lib/utils";

export interface ChannelTargetRow {
  channel: string;
  revenue: number;
  revenueTarget: number | null;
  conversions: number;
  conversionsTarget: number | null;
}

interface Props {
  rows: ChannelTargetRow[];
  /** "経過X日/Y日（Z%）" progress-through-month note shown under the table. */
  progressNote?: string;
}

function achievementColour(ratio: number | null): string {
  if (ratio == null) return "text-muted-foreground";
  if (ratio >= 1) return "text-emerald-600";
  if (ratio >= 0.8) return "text-amber-600";
  return "text-rose-600";
}

/** Channel-level target vs. actual table (revenue & conversions), replacing
 * the plain Top-5-by-GA4-channel view for clients whose 計画 sheet carries
 * per-channel targets for the current month (today: HS only — see
 * getChannelTargetsForMonth). Rows without a sheet-side target (e.g. an
 * unmapped GA4 channel bucketed into "その他") show actuals only. */
export default function ChannelTargetTable({ rows, progressNote }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.conversions += r.conversions;
      acc.revenueTarget += r.revenueTarget ?? 0;
      acc.conversionsTarget += r.conversionsTarget ?? 0;
      return acc;
    },
    { revenue: 0, conversions: 0, revenueTarget: 0, conversionsTarget: 0 }
  );
  const totalRevenueRatio = safeDiv(totals.revenue, totals.revenueTarget || null);
  const totalCvRatio = safeDiv(totals.conversions, totals.conversionsTarget || null);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>チャネル</TableHead>
            <TableHead className="text-right">売上実績</TableHead>
            <TableHead className="text-right">売上目標</TableHead>
            <TableHead className="text-right">達成率</TableHead>
            <TableHead className="text-right">CV実績</TableHead>
            <TableHead className="text-right">CV目標</TableHead>
            <TableHead className="text-right">達成率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const revRatio = safeDiv(r.revenue, r.revenueTarget);
            const cvRatio = safeDiv(r.conversions, r.conversionsTarget);
            return (
              <TableRow key={r.channel}>
                <TableCell className="font-medium">{r.channel}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(r.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.revenueTarget != null ? fmtJpy(r.revenueTarget) : "—"}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums font-medium", achievementColour(revRatio))}>
                  {revRatio != null ? fmtRatioPct(revRatio * 100, 0) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.conversions)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.conversionsTarget != null ? fmtInt(r.conversionsTarget) : "—"}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums font-medium", achievementColour(cvRatio))}>
                  {cvRatio != null ? fmtRatioPct(cvRatio * 100, 0) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="border-t-2 font-semibold">
            <TableCell>合計</TableCell>
            <TableCell className="text-right tabular-nums">{fmtJpy(totals.revenue)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {totals.revenueTarget > 0 ? fmtJpy(totals.revenueTarget) : "—"}
            </TableCell>
            <TableCell className={cn("text-right tabular-nums", achievementColour(totalRevenueRatio))}>
              {totalRevenueRatio != null ? fmtRatioPct(totalRevenueRatio * 100, 0) : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(totals.conversions)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {totals.conversionsTarget > 0 ? fmtInt(totals.conversionsTarget) : "—"}
            </TableCell>
            <TableCell className={cn("text-right tabular-nums", achievementColour(totalCvRatio))}>
              {totalCvRatio != null ? fmtRatioPct(totalCvRatio * 100, 0) : "—"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {progressNote && <div className="mt-2 text-xs text-muted-foreground">{progressNote}</div>}
    </div>
  );
}
