import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GscQueryRow } from "@/lib/sources/gsc";
import { cn, fmtInt, fmtPct } from "@/lib/utils";

interface Props {
  rows: GscQueryRow[];
  limit?: number;
}

function positionClass(pos: number): string {
  if (pos <= 3) return "text-emerald-700";
  if (pos <= 10) return "text-amber-700";
  return "text-muted-foreground";
}

export default function GscQueryTable({ rows, limit = 10 }: Props) {
  const sorted = [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, limit);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>検索クエリ</TableHead>
          <TableHead className="text-right">クリック</TableHead>
          <TableHead className="text-right">インプ</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-right">順位</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.query}>
            <TableCell className="font-medium">{r.query}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtPct(r.ctr, 1)}</TableCell>
            <TableCell className={cn("text-right tabular-nums", positionClass(r.position))}>
              {r.position.toFixed(1)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
