import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductRow } from "@/lib/sources/ga4";
import { fmtInt, fmtJpy } from "@/lib/utils";

interface Props {
  rows: ProductRow[];
  /** Limit rows shown; default 10. */
  limit?: number;
  /** 旧・売上非表示ガード（revenueBasis 導入後は既定経路で発動しない。
   *  互換のため残置）。 */
  hideRevenue?: boolean;
}

export default function ProductRanking({ rows, limit = 10, hideRevenue = false }: Props) {
  const sorted = [...rows]
    .sort((a, b) => (hideRevenue ? b.orderCount - a.orderCount : b.revenue - a.revenue))
    .slice(0, limit);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>商品</TableHead>
          <TableHead>商品ID</TableHead>
          <TableHead className="text-right">購入件数</TableHead>
          <TableHead className="text-right">点数</TableHead>
          {!hideRevenue && <TableHead className="text-right">売上</TableHead>}
          {!hideRevenue && <TableHead className="text-right">単価</TableHead>}
          {!hideRevenue && <TableHead className="text-right">1件あたり</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r, i) => (
          <TableRow key={r.sku}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell className="font-medium">{r.productName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.orderCount)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.conversions)}</TableCell>
            {!hideRevenue && <TableCell className="text-right tabular-nums">{fmtJpy(r.revenue)}</TableCell>}
            {!hideRevenue && <TableCell className="text-right tabular-nums">{fmtJpy(r.unitPrice)}</TableCell>}
            {!hideRevenue && <TableCell className="text-right tabular-nums">{fmtJpy(r.perOrder)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
