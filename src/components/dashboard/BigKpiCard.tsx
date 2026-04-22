import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sparkline from "@/components/dashboard/Sparkline";
import { cn, fmtPct } from "@/lib/utils";

interface Comparison {
  label: string;
  delta: number | null;
}

interface Props {
  label: string;
  value: string;
  /** Up to three comparison lines — displayed stacked under the value. */
  comparisons?: Comparison[];
  lowerIsBetter?: boolean;
  /** Optional sparkline series (e.g. last 7 days). */
  sparkline?: number[];
  /** Dates parallel to `sparkline` — enables hover tooltip on the chart. */
  sparkDates?: string[];
  /** Tooltip value format. */
  sparkFormat?: "int" | "jpy" | "pct";
  /** Sparkline tone (colour hint). */
  sparkTone?: "default" | "positive" | "negative";
}

function Arrow({ delta, lowerIsBetter }: { delta: number | null; lowerIsBetter?: boolean }) {
  if (delta == null || !Number.isFinite(delta)) return <Minus className="h-3 w-3" />;
  const positive = lowerIsBetter ? delta < 0 : delta > 0;
  const negative = lowerIsBetter ? delta > 0 : delta < 0;
  if (positive) return <ArrowUpRight className="h-3 w-3 text-emerald-600" />;
  if (negative) return <ArrowDownRight className="h-3 w-3 text-rose-600" />;
  return <Minus className="h-3 w-3" />;
}

export default function BigKpiCard({
  label,
  value,
  comparisons = [],
  lowerIsBetter,
  sparkline,
  sparkDates,
  sparkFormat = "int",
  sparkTone,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
          {value}
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="mt-2">
            <Sparkline
              values={sparkline}
              dates={sparkDates}
              tone={sparkTone}
              height={32}
              format={sparkFormat}
            />
          </div>
        )}
        {comparisons.length > 0 && (
          <div className="mt-2 space-y-0.5 text-xs">
            {comparisons.map((c) => (
              <div
                key={c.label}
                className={cn(
                  "flex items-center justify-between gap-2",
                  c.delta == null
                    ? "text-muted-foreground"
                    : (lowerIsBetter ? c.delta < 0 : c.delta > 0)
                    ? "text-emerald-700"
                    : (lowerIsBetter ? c.delta > 0 : c.delta < 0)
                    ? "text-rose-700"
                    : "text-muted-foreground"
                )}
              >
                <span className="text-muted-foreground">{c.label}</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Arrow delta={c.delta} lowerIsBetter={lowerIsBetter} />
                  {c.delta == null ? "—" : fmtPct(Math.abs(c.delta), 1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
