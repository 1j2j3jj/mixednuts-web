import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TierGlyph from "@/components/dashboard/TierGlyph";
import type { Tier } from "@/lib/tier";
import { budgetProgressTier, goalProgressTier } from "@/lib/goal-progress";
import { cn, fmtRatioPct } from "@/lib/utils";

interface Props {
  label: string;
  actual: string;
  target: string;
  /** Achievement ratio: actual / target. */
  ratio: number;
  /** Expected share of the monthly target by the selected range end. */
  expectedProgress?: number;
  /** Budget consumption is judged as pace, not as target achievement. */
  budgetPacing?: boolean;
  /** Supporting hint (e.g. "月内残り 9日"). */
  hint?: string;
}

/** Simple horizontal progress bar. Achievement status is carried by the
 *  adjacent glyph, percentage, and status word; the meter itself intentionally
 *  uses one brand fill and one neutral track for every tier. */
export default function GoalGauge({
  label,
  actual,
  target,
  ratio,
  expectedProgress = 1,
  budgetPacing = false,
  hint,
}: Props) {
  const pct = Math.max(0, Math.min(1.5, ratio)); // cap at 150% for the bar
  const tier: Tier =
    budgetPacing
      ? budgetProgressTier(ratio, expectedProgress)
      : (goalProgressTier(ratio, expectedProgress) ?? "bad");
  const paceRatio = expectedProgress > 0 ? ratio / expectedProgress : 0;
  const statusLabel =
    budgetPacing
      ? paceRatio > 1.1
        ? "速いペース"
        : paceRatio < 0.9
          ? "遅いペース"
          : "適正ペース"
      : expectedProgress < 1
        ? tier === "good"
          ? "ペース先行"
          : tier === "warning"
            ? "概ねペース内"
            : "ペース遅れ"
        : tier === "good"
          ? "達成"
          : tier === "warning"
            ? "やや未達"
            : "未達";
  /**
   * E-1 / E-3 / E-4 (updated 2026-08-21): all tiers share bg-brand on
   * bg-muted, measured at 3.35:1 from the rendered brand/muted token pair with
   * the WCAG relative-luminance formula. The meter therefore clears the
   * 3:1 non-text boundary without making colour carry status; TierGlyph plus
   * the percentage/status text remains the accessible achievement signal.
   */
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="text-lg font-semibold tabular-nums">{actual}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            目標 {target}
          </span>
        </div>
        {/* E-4: percentage is the accessible value (aria-valuenow/min/max)
            for a screen reader; the visible bar stays purely visual. */}
        <div
          role="progressbar"
          aria-label={`${label}の月次目標比`}
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={150}
          className={cn(
            "mt-2 h-2 w-full overflow-hidden rounded-full bg-muted",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full bg-brand transition-all motion-reduce:transition-none",
            )}
            style={{ width: `${Math.min(100, (pct / 1.5) * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          {/* E-3: glyph + percentage + word are the only tier carriers; the
              meter colour is deliberately identical for every status. */}
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <TierGlyph tier={tier} />
            {fmtRatioPct(ratio * 100, 0)}
            <span className="font-normal text-muted-foreground">
              （{statusLabel}）
            </span>
          </span>
          <span
            className="text-muted-foreground"
            title={`対ペース: 期待 ${fmtRatioPct(expectedProgress * 100, 0)} / 実績 ${fmtRatioPct(ratio * 100, 0)}`}
          >
            {hint ?? `期待 ${fmtRatioPct(expectedProgress * 100, 0)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
