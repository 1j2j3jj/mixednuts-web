import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductRow } from "@/lib/sources/ga4";
import { fmtInt, fmtJpy } from "@/lib/utils";

interface Props {
  rows: ProductRow[];
  /** Limit rows shown; default 10. */
  limit?: number;
}

export default function ProductRanking({ rows, limit = 10 }: Props) {
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>商品</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">CV</TableHead>
          <TableHead className="text-right">単価</TableHead>
          <TableHead className="text-right">売上</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r, i) => (
          <TableRow key={r.sku}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell className="font-medium">{r.productName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.conversions)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtJpy(r.unitPrice)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtJpy(r.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
