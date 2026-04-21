import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

export interface DrillRow {
  /** Grouping key displayed in the first column. */
  key: string;
  /** Secondary label, e.g. campaign id. */
  subKey?: string;
  media: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValue: number;
}

interface Props {
  rows: DrillRow[];
  /** Target ROAS percentage for cell colouring. */
  targetRoasPct: number;
  /** Target CPA for cell colouring. */
  targetCpa: number;
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

export default function DrillTable({ rows, targetRoasPct, targetCpa }: Props) {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ラベル</TableHead>
            <TableHead>媒体</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Imp</TableHead>
            <TableHead className="text-right">Click</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">CV</TableHead>
            <TableHead className="text-right">CPA</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                フィルタに合致するデータがありません
              </TableCell>
            </TableRow>
          )}
          {sorted.map((r, i) => {
            const ctr = safeDiv(r.clicks, r.impressions);
            const cpa = safeDiv(r.spend, r.conversions);
            const roasPct = r.spend > 0 ? (r.conversionValue / r.spend) * 100 : null;
            return (
              <TableRow key={`${r.key}:${i}`}>
                <TableCell className="font-medium">
                  <div className="max-w-md truncate" title={r.key}>
                    {r.key}
                  </div>
                  {r.subKey && <div className="text-[10px] font-mono text-muted-foreground">{r.subKey}</div>}
                </TableCell>
                <TableCell>{r.media}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(r.spend)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(ctr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.conversions)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", cpaClass(cpa, targetCpa))}>
                  {fmtJpy(cpa)}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", roasClass(roasPct, targetRoasPct))}>
                  {fmtRatioPct(roasPct, 0)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
