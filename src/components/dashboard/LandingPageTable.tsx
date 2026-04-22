import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LandingPageRow } from "@/lib/sources/ga4";
import { fmtInt, fmtJpy } from "@/lib/utils";

interface Props {
  rows: LandingPageRow[];
  /** Limit rows shown. */
  limit?: number;
}

/**
 * GA4 landing-page ranking — sorted by sessions desc. Complements the product
 * ranking (what they buy) with an acquisition view (where they land).
 * CVR = conversions / sessions; useful for spotting traffic quality issues
 * on specific LPs.
 */
export default function LandingPageTable({ rows, limit = 30 }: Props) {
  const sorted = [...rows].sort((a, b) => b.sessions - a.sessions).slice(0, limit);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>ランディングページ</TableHead>
          <TableHead className="text-right">セッション</TableHead>
          <TableHead className="text-right">CV</TableHead>
          <TableHead className="text-right">CVR</TableHead>
          <TableHead className="text-right">売上</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r, i) => (
          <TableRow key={r.path + i}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell className="max-w-[360px] truncate font-mono text-xs" title={r.path}>
              {r.path || "(直接/不明)"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.sessions)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmtInt(r.conversions)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {r.sessions > 0
                ? `${((r.conversions / r.sessions) * 100).toFixed(2)}%`
                : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{fmtJpy(r.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
