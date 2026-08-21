import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TOTAL_ROW_CLASS,
} from "@/components/ui/table";
import TierGlyph from "@/components/dashboard/TierGlyph";
import type { Tier } from "@/lib/tier";
import { goalProgressTier } from "@/lib/goal-progress";
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
  /** Expected share of the monthly target by the selected range's end. */
  expectedProgress?: number;
  /** "経過X日/Y日（Z%）" progress-through-month note shown under the table. */
  progressNote?: string;
}

/**
 * E-1 contrast fix (2026-07-25): this used to be -600 weight for all three
 * tiers. Measured against white: emerald-600 3.65:1 and amber-600 3.19:1 —
 * BOTH below the 4.5:1 normal-text floor for 14px table-cell text (rose-600
 * was 4.53:1, technically over the line but by only 0.03 — effectively
 * broken too). Every OTHER 3-tier judgement cell in this codebase
 * (MediaTable/MediaCampaignTable/DrillTable's roasClass, DrillTable's
 * cpaClass, GscQueryTable's positionClass) already uses the -700 step, which
 * clears 4.5:1 with real margin (emerald-700 5.36:1, amber-700 5.03:1,
 * rose-700 6.03:1) — this was simply the one place that got the wrong shade
 * step. Bumped to match, closing both the AA failure and the inconsistency.
 */
function achievementColour(tier: Tier | null): string {
  if (tier == null) return "text-muted-foreground";
  if (tier === "good") return "text-emerald-700";
  if (tier === "warning") return "text-amber-700";
  return "text-rose-700";
}

function paceTitle(ratio: number | null, expectedProgress: number): string {
  const actual = ratio == null ? "—" : fmtRatioPct(ratio * 100, 0);
  return `対ペース: 期待 ${fmtRatioPct(expectedProgress * 100, 0)} / 実績 ${actual}`;
}

/** Channel-level target vs. actual table (revenue & conversions), replacing
 * the plain Top-5-by-GA4-channel view for clients whose 計画 sheet carries
 * per-channel targets for the current month (today: HS only — see
 * getChannelTargetsForMonth). Rows without a sheet-side target (e.g. an
 * unmapped GA4 channel bucketed into "その他") show actuals only. */
export default function ChannelTargetTable({
  rows,
  expectedProgress = 1,
  progressNote,
}: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.conversions += r.conversions;
      acc.revenueTarget += r.revenueTarget ?? 0;
      acc.conversionsTarget += r.conversionsTarget ?? 0;
      return acc;
    },
    { revenue: 0, conversions: 0, revenueTarget: 0, conversionsTarget: 0 },
  );
  const totalRevenueRatio = safeDiv(
    totals.revenue,
    totals.revenueTarget || null,
  );
  const totalCvRatio = safeDiv(
    totals.conversions,
    totals.conversionsTarget || null,
  );

  return (
    <div>
      <Table>
        <TableCaption className="sr-only">
          チャネル別目標対比テーブル
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>チャネル</TableHead>
            <TableHead className="text-right">売上実績</TableHead>
            <TableHead className="text-right">売上目標</TableHead>
            <TableHead className="text-right">達成率（対月次目標）</TableHead>
            <TableHead className="text-right">CV実績</TableHead>
            <TableHead className="text-right">CV目標</TableHead>
            <TableHead className="text-right">達成率（対月次目標）</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const revRatio = safeDiv(r.revenue, r.revenueTarget);
            const cvRatio = safeDiv(r.conversions, r.conversionsTarget);
            const revTier = goalProgressTier(revRatio, expectedProgress);
            const cvTier = goalProgressTier(cvRatio, expectedProgress);
            return (
              <TableRow key={r.channel}>
                <TableCell className="font-medium">{r.channel}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtJpy(r.revenue)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.revenueTarget != null ? fmtJpy(r.revenueTarget) : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    achievementColour(revTier),
                  )}
                >
                  {/* E-3: achievementColour's colour was the only signal for
                      hit/near-miss/missed — TierGlyph adds a shape. */}
                  <span
                    className="inline-flex items-center justify-end gap-1"
                    title={paceTitle(revRatio, expectedProgress)}
                  >
                    {revTier && <TierGlyph tier={revTier} />}
                    {revRatio != null ? fmtRatioPct(revRatio * 100, 0) : "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtInt(r.conversions)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {r.conversionsTarget != null
                    ? fmtInt(r.conversionsTarget)
                    : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    achievementColour(cvTier),
                  )}
                >
                  <span
                    className="inline-flex items-center justify-end gap-1"
                    title={paceTitle(cvRatio, expectedProgress)}
                  >
                    {cvTier && <TierGlyph tier={cvTier} />}
                    {cvRatio != null ? fmtRatioPct(cvRatio * 100, 0) : "—"}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className={TOTAL_ROW_CLASS}>
            <TableCell scope="row">合計</TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtJpy(totals.revenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {totals.revenueTarget > 0 ? fmtJpy(totals.revenueTarget) : "—"}
            </TableCell>
            <TableCell
              className={cn(
                "text-right tabular-nums",
                achievementColour(
                  goalProgressTier(totalRevenueRatio, expectedProgress),
                ),
              )}
            >
              <span
                className="inline-flex items-center justify-end gap-1"
                title={paceTitle(totalRevenueRatio, expectedProgress)}
              >
                {goalProgressTier(totalRevenueRatio, expectedProgress) && (
                  <TierGlyph
                    tier={goalProgressTier(totalRevenueRatio, expectedProgress)!}
                  />
                )}
                {totalRevenueRatio != null
                  ? fmtRatioPct(totalRevenueRatio * 100, 0)
                  : "—"}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtInt(totals.conversions)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {totals.conversionsTarget > 0
                ? fmtInt(totals.conversionsTarget)
                : "—"}
            </TableCell>
            <TableCell
              className={cn(
                "text-right tabular-nums",
                achievementColour(
                  goalProgressTier(totalCvRatio, expectedProgress),
                ),
              )}
            >
              <span
                className="inline-flex items-center justify-end gap-1"
                title={paceTitle(totalCvRatio, expectedProgress)}
              >
                {goalProgressTier(totalCvRatio, expectedProgress) && (
                  <TierGlyph
                    tier={goalProgressTier(totalCvRatio, expectedProgress)!}
                  />
                )}
                {totalCvRatio != null
                  ? fmtRatioPct(totalCvRatio * 100, 0)
                  : "—"}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {progressNote && (
        <div className="mt-2 text-xs text-muted-foreground">{progressNote}</div>
      )}
    </div>
  );
}
