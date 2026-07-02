import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

/**
 * Report table for the BQ rpt_* views. Columns follow the classic daily ad
 * report layout (COST → media block → GA block → overall block) with the
 * three CV layers (媒体CV / GA_CV / 全体CV) visually grouped via a grouped
 * header row + left borders.
 *
 * All ratios (CTR / CPC / CVR / CPA / ROAS) are recomputed here from the
 * summed numerators / denominators — pre-computed per-row ratios from the
 * views are intentionally not used (period aggregation would otherwise
 * average ratios, and the view ROAS columns are multipliers, not %).
 */

export interface ReportTableRow {
  /** First column: date (daily view) or entity name. */
  label: string;
  /** Secondary line under the label (entity id / parent campaign). */
  subLabel?: string;
  media?: string;
  /** rpt_adg only: "adgroup" | "campaign" (campaign = PMax fold-back). */
  grainLevel?: string;
  /** rpt_cpn / rpt_adg: "matched" | "unmapped" | "ad_only". */
  matchStatus?: string;
  /** Renders bold on a muted background, pinned first (period total). */
  isTotal?: boolean;
  cost: number;
  impressions: number;
  clicks: number;
  sessions: number;
  mediaCv: number;
  mediaValue: number;
  gaCv: number;
  gaValue: number;
  overallCv: number | null;
  overallValue: number | null;
}

interface Props {
  rows: ReportTableRow[];
  labelHeader: string;
  /** Show a dedicated 媒体 column (CPN / ADG views). */
  showMedia?: boolean;
  /** Show grain_level / match_status badges under the label. */
  showBadges?: boolean;
  /** Show the overall-CV column group. */
  showOverall?: boolean;
  overallLabel?: string;
  /** Also show the overall revenue column (hs EC-CUBE only). */
  showOverallValue?: boolean;
  /** Header label of the GA group — clarifies site-wide vs ad-attributed. */
  gaGroupLabel?: string;
  /** Render labels in monospace (dates). */
  monoLabel?: boolean;
}

function matchBadgeClass(status: string): string {
  if (status === "matched") return "bg-emerald-100 text-emerald-800";
  if (status === "unmapped") return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground"; // ad_only / other
}

export default function ReportTable({
  rows,
  labelHeader,
  showMedia = false,
  showBadges = false,
  showOverall = false,
  overallLabel = "全体CV",
  showOverallValue = false,
  gaGroupLabel = "GA",
  monoLabel = false,
}: Props) {
  const mediaCols = 10; // COST..CV Value
  const gaCols = 6; // SESSION..GA_ROAS
  const overallCols = showOverall ? (showOverallValue ? 2 : 1) : 0;
  const headCols = 1 + (showMedia ? 1 : 0);
  const colSpan = headCols + mediaCols + gaCols + overallCols;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {/* Group header — visually separates the three CV layers. */}
          <TableRow className="bg-muted/30">
            <TableHead colSpan={headCols} />
            <TableHead
              colSpan={mediaCols}
              className="border-l text-center text-[11px] font-semibold uppercase tracking-wider"
            >
              広告媒体
            </TableHead>
            <TableHead
              colSpan={gaCols}
              className="border-l text-center text-[11px] font-semibold uppercase tracking-wider"
            >
              {gaGroupLabel}
            </TableHead>
            {showOverall && (
              <TableHead
                colSpan={overallCols}
                className="border-l text-center text-[11px] font-semibold uppercase tracking-wider"
              >
                全体
              </TableHead>
            )}
          </TableRow>
          <TableRow>
            <TableHead className="whitespace-nowrap">{labelHeader}</TableHead>
            {showMedia && <TableHead>媒体</TableHead>}
            <TableHead className="border-l text-right">Cost</TableHead>
            <TableHead className="text-right">Imp</TableHead>
            <TableHead className="text-right">Click</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">CPC</TableHead>
            <TableHead className="text-right">媒体CV</TableHead>
            <TableHead className="text-right">CVR</TableHead>
            <TableHead className="text-right">CPA</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">CV Value</TableHead>
            <TableHead className="border-l text-right">Session</TableHead>
            <TableHead className="text-right">GA_CV</TableHead>
            <TableHead className="text-right">GA_CVR</TableHead>
            <TableHead className="text-right">GA_CPA</TableHead>
            <TableHead className="text-right">GA売上</TableHead>
            <TableHead className="text-right">GA_ROAS</TableHead>
            {showOverall && (
              <TableHead className="border-l text-right whitespace-nowrap">
                {overallLabel}
              </TableHead>
            )}
            {showOverall && showOverallValue && (
              <TableHead className="text-right whitespace-nowrap">全体売上</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-6 text-center text-muted-foreground">
                選択期間にデータがありません
              </TableCell>
            </TableRow>
          )}
          {rows.map((r, i) => {
            const ctr = safeDiv(r.clicks, r.impressions);
            const cpc = safeDiv(r.cost, r.clicks);
            const mediaCvr = safeDiv(r.mediaCv, r.clicks);
            const mediaCpa = safeDiv(r.cost, r.mediaCv);
            const mediaRoasPct = r.cost > 0 ? (r.mediaValue / r.cost) * 100 : null;
            const gaCvr = safeDiv(r.gaCv, r.sessions);
            const gaCpa = safeDiv(r.cost, r.gaCv);
            const gaRoasPct = r.cost > 0 ? (r.gaValue / r.cost) * 100 : null;
            return (
              <TableRow
                key={`${r.label}:${r.media ?? ""}:${r.subLabel ?? ""}:${r.grainLevel ?? ""}:${r.matchStatus ?? ""}:${i}`}
                className={cn(r.isTotal && "bg-muted/40 font-medium")}
              >
                <TableCell
                  className={cn("whitespace-nowrap", monoLabel && !r.isTotal && "font-mono text-xs")}
                >
                  <div className="max-w-xs truncate" title={r.label}>
                    {r.label}
                  </div>
                  {r.subLabel && (
                    <div className="max-w-xs truncate text-[10px] font-mono text-muted-foreground" title={r.subLabel}>
                      {r.subLabel}
                    </div>
                  )}
                  {showBadges && !r.isTotal && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.grainLevel === "campaign" && (
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">
                          PMax折返し（CPN粒度）
                        </span>
                      )}
                      {r.matchStatus && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            matchBadgeClass(r.matchStatus)
                          )}
                        >
                          {r.matchStatus}
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                {showMedia && <TableCell>{r.media ?? ""}</TableCell>}
                <TableCell className="border-l text-right tabular-nums">{fmtJpy(r.cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.impressions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.clicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(ctr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(cpc)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.mediaCv)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(mediaCvr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(mediaCpa)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtRatioPct(mediaRoasPct, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(r.mediaValue)}</TableCell>
                <TableCell className="border-l text-right tabular-nums">{fmtInt(r.sessions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.gaCv)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(gaCvr, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(gaCpa)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtJpy(r.gaValue)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtRatioPct(gaRoasPct, 0)}</TableCell>
                {showOverall && (
                  <TableCell className="border-l text-right tabular-nums">
                    {fmtInt(r.overallCv)}
                  </TableCell>
                )}
                {showOverall && showOverallValue && (
                  <TableCell className="text-right tabular-nums">{fmtJpy(r.overallValue)}</TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
