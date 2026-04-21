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

/** Simple horizontal progress bar with colour bands keyed to achievement. */
export default function GoalGauge({ label, actual, target, ratio, hint }: Props) {
  const pct = Math.max(0, Math.min(1.5, ratio)); // cap at 150% for the bar
  const colour =
    ratio >= 1 ? "bg-emerald-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-rose-500";
  return (
    <Card>
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
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", colour)}
            style={{ width: `${Math.min(100, (pct / 1.5) * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="font-medium tabular-nums">{fmtRatioPct(ratio * 100, 0)}</span>
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
