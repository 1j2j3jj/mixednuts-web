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

/** Simple horizontal progress bar with colour bands keyed to achievement.
 *  Status (good/warning/critical) is a fixed, non-themed scale — kept
 *  separate from the brand cyan accent so a status colour never impersonates
 *  the brand thread (dataviz color-formula.md "status is fixed"). Track is a
 *  lighter step of the same ramp as its fill (the "Meter" contract in
 *  marks-and-anatomy.md) so achievement state reads across the whole bar,
 *  not just the filled portion. */
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
   * E-1 contrast fix (2026-07-25): the fill was -500 against a -100 track —
   * measured (oklch->sRGB, WCAG formula): emerald-500 vs emerald-100 2.17:1,
   * amber-500 vs amber-100 1.93:1, rose-500 vs rose-100 3.12:1 — all below
   * (or barely at) the 3:1 non-text-UI floor (SC 1.4.11), meaning the filled
   * portion of the meter did not read as a distinct object from its own
   * track for a low-vision viewer. Bumped fill to -700, which clears with
   * real margin against the SAME -100 track (emerald-700/emerald-100
   * 4.72:1, amber-700/amber-100 4.52:1, rose-700/rose-100 5.02:1) — track
   * colour is unchanged, only the fill got darker.
   */
  const tone =
    tier === "good"
      ? { fill: "bg-emerald-700", track: "bg-emerald-100" }
      : tier === "warning"
        ? { fill: "bg-amber-700", track: "bg-amber-100" }
        : { fill: "bg-rose-700", track: "bg-rose-100" };
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-semibold tabular-nums">{actual}</span>
          <span className="text-xs text-muted-foreground">目標 {target}</span>
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
            "mt-2 h-2 w-full overflow-hidden rounded-full",
            tone.track,
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all motion-reduce:transition-none",
              tone.fill,
            )}
            style={{ width: `${Math.min(100, (pct / 1.5) * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          {/* E-3: the bar's colour band was the only carrier of which tier
              (達成 / やや未達 / 未達) this percentage falls in — glyph + word
              adds a non-colour carrier next to the number itself. */}
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
