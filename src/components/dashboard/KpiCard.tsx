import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, fmtPct } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  /** Optional delta vs previous period (decimal: 0.15 = +15%). */
  delta?: number | null;
  /** For deltas where a decrease is good (e.g. CPA), flip arrow semantics. */
  lowerIsBetter?: boolean;
  hint?: string;
}

export default function KpiCard({ label, value, delta, lowerIsBetter, hint }: Props) {
  const showDelta = delta != null && Number.isFinite(delta);
  const positive = showDelta && (lowerIsBetter ? delta! < 0 : delta! > 0);
  const negative = showDelta && (lowerIsBetter ? delta! > 0 : delta! < 0);
  const Icon = showDelta ? (positive ? ArrowUpRight : negative ? ArrowDownRight : Minus) : null;
  const colour = positive ? "text-emerald-600" : negative ? "text-rose-600" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {showDelta && Icon && (
          <div className={cn("mt-1 flex items-center gap-1 text-xs", colour)}>
            <Icon className="h-3.5 w-3.5" />
            <span>{fmtPct(Math.abs(delta!), 1)} 前期間比</span>
          </div>
        )}
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
