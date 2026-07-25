import { Circle, Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GscQueryRow } from "@/lib/sources/gsc";
import { cn, fmtInt, fmtPct } from "@/lib/utils";
import AbsenceTableRow from "@/components/dashboard/AbsenceTableRow";
import type { AbsenceReason, NoDataPeriodDetail } from "@/lib/absence";

interface Props {
  rows: GscQueryRow[];
  limit?: number;
  /** Set when `rows` is empty because the source is unavailable / not
   *  configured (Phase D — see @/lib/sources/gsc.ts getTopGscQueries doc,
   *  the mock-leak fix this replaces). Undefined + empty rows = a genuine
   *  measured-empty result for this period. */
  absenceReason?: AbsenceReason;
  absenceDetail?: NoDataPeriodDetail;
}

function positionClass(pos: number): string {
  if (pos <= 3) return "text-emerald-700";
  if (pos <= 10) return "text-amber-700";
  return "text-muted-foreground";
}

export default function GscQueryTable({
  rows,
  limit = 10,
  absenceReason,
  absenceDetail,
}: Props) {
  const sorted = [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, limit);
  return (
    <Table>
      <TableCaption className="sr-only">
        検索クエリ別パフォーマンステーブル
      </TableCaption>
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
        {sorted.length === 0 && (
          <AbsenceTableRow
            colSpan={5}
            reason={absenceReason ?? "no_data_period"}
            detail={absenceDetail}
          />
        )}
        {sorted.map((r) => (
          <TableRow key={r.query}>
            <TableCell className="font-medium">{r.query}</TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtInt(r.clicks)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtInt(r.impressions)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtPct(r.ctr, 1)}
            </TableCell>
            <TableCell
              className={cn(
                "text-right tabular-nums",
                positionClass(r.position),
              )}
            >
              {/* E-3 / ITEM 4 (2026-07-25 Phase E audit): both the ≤3 tier
                  (emerald) and the ≤10 tier (amber) recolour the cell to
                  convey a judgement, so SC 1.4.1 requires each to carry a
                  second, non-colour channel too — Star for ≤3, a filled
                  Circle (deliberately a different silhouette, not a
                  colour-tinted copy of the same glyph) for the 3–10 tier.
                  The >10 tier is intentionally left alone: it renders in
                  text-muted-foreground, the app's plain "no special status"
                  default rather than a status colour, so there is no
                  colour-conveyed meaning there for 1.4.1 to apply to — and
                  the raw number is already self-explanatory either way
                  (lower is better), which is still true for that tier. */}
              <span className="inline-flex items-center justify-end gap-1">
                {r.position <= 3 && (
                  <Star
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 fill-current"
                  />
                )}
                {r.position > 3 && r.position <= 10 && (
                  <Circle
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 fill-current"
                  />
                )}
                {r.position.toFixed(1)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
