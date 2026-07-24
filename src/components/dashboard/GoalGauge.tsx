import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, fmtRatioPct } from "@/lib/utils";

interface Props {
  label: string;
  actual: string;
  target: string;
  /** Achievement ratio: actual / target. */
  ratio: number;
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
  hint,
}: Props) {
  const pct = Math.max(0, Math.min(1.5, ratio)); // cap at 150% for the bar
  const tone =
    ratio >= 1
      ? { fill: "bg-emerald-500", track: "bg-emerald-100" }
      : ratio >= 0.8
        ? { fill: "bg-amber-500", track: "bg-amber-100" }
        : { fill: "bg-rose-500", track: "bg-rose-100" };
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
        <div
          className={cn(
            "mt-2 h-2 w-full overflow-hidden rounded-full",
            tone.track,
          )}
        >
          <div
            className={cn("h-full rounded-full transition-all", tone.fill)}
            style={{ width: `${Math.min(100, (pct / 1.5) * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="font-medium tabular-nums">
            {fmtRatioPct(ratio * 100, 0)}
          </span>
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
