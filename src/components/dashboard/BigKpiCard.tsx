import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import Sparkline from "@/components/dashboard/Sparkline";
import { cn, fmtPct } from "@/lib/utils";

export interface Comparison {
  label: string;
  delta: number | null;
}

interface Props {
  label: string;
  value: string;
  /** Optional interactive definition shown beside the KPI label. */
  labelInfo?: ReactNode;
  /** Explicit data-absence state; never presented as a measured zero. */
  unavailableMessage?: string;
  /**
   * Unified one-line takeaway. Callers put comparison absence here rather
   * than reserving an empty comparison row.
   */
  caption: string;
  /** A missing comparison omits the row entirely. */
  comparison?: Comparison;
  lowerIsBetter?: boolean;
  /** Optional sparkline series; empty and all-zero series are not drawn. */
  sparkline?: number[];
  /** Dates parallel to `sparkline` — enables hover tooltip on the chart. */
  sparkDates?: string[];
  /** Tooltip value format. */
  sparkFormat?: "int" | "jpy" | "pct";
  /** Sparkline tone (colour hint). */
  sparkTone?: "default" | "positive" | "negative";
}

function Arrow({ delta }: { delta: number | null }) {
  if (delta == null || !Number.isFinite(delta)) {
    return <Minus className="h-3 w-3" />;
  }
  // Direction and evaluation are separate signals: the glyph follows the
  // measured sign, while the row colour expresses whether it is favourable.
  if (delta > 0) return <ArrowUpRight className="h-3 w-3" />;
  if (delta < 0) return <ArrowDownRight className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function comparisonAriaLabel(
  comparison: Comparison,
  lowerIsBetter?: boolean,
): string {
  if (comparison.delta == null || !Number.isFinite(comparison.delta)) {
    return `${comparison.label} 比較不能`;
  }

  const direction =
    comparison.delta > 0
      ? "増加"
      : comparison.delta < 0
        ? "減少"
        : "変化なし";
  const favourable = lowerIsBetter
    ? comparison.delta < 0
    : comparison.delta > 0;
  const unfavourable = lowerIsBetter
    ? comparison.delta > 0
    : comparison.delta < 0;
  const evaluation = favourable ? "改善" : unfavourable ? "悪化" : "横ばい";

  return `${comparison.label} ${fmtPct(Math.abs(comparison.delta), 1)} ${direction}（${evaluation}）`;
}

function signedDelta(delta: number): string {
  if (delta > 0) return `+${fmtPct(delta, 1)}`;
  if (delta < 0) return `-${fmtPct(Math.abs(delta), 1)}`;
  return fmtPct(delta, 1);
}

export default function BigKpiCard({
  label,
  value,
  labelInfo,
  unavailableMessage,
  caption,
  comparison,
  lowerIsBetter,
  sparkline,
  sparkDates,
  sparkFormat = "int",
  sparkTone,
}: Props) {
  const showSparkline =
    !unavailableMessage &&
    !!sparkline &&
    sparkline.length > 1 &&
    sparkline.some((point) => point > 0);
  const comparisonUnavailable =
    comparison != null &&
    (comparison.delta == null || !Number.isFinite(comparison.delta));
  const showComparison =
    !unavailableMessage && comparison != null && !comparisonUnavailable;
  const displayedCaption = unavailableMessage
    ? unavailableMessage
    : comparisonUnavailable
      ? `${caption}（${comparison.label}は比較できません）`
      : caption;

  return (
    <Card
      data-kpi-layout="subgrid-flex-fallback"
      className="big-kpi-card h-full p-4 shadow-card"
    >
      <div
        data-kpi-row="label"
        className="big-kpi-card__label flex min-w-0 items-center gap-1.5"
      >
        <CardTitle className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        {labelInfo}
      </div>

      <div
        data-kpi-row="caption"
        className={cn(
          "big-kpi-card__caption mt-1 text-xs leading-tight text-muted-foreground",
          unavailableMessage ? "min-h-8 line-clamp-2" : "min-h-4 truncate",
        )}
        title={displayedCaption}
      >
        {displayedCaption}
      </div>

      <div className="big-kpi-card__value-block mt-auto flex flex-col">
        <div
          data-kpi-row="value"
          className={cn(
            "mt-2 leading-none tracking-tight",
            unavailableMessage
              ? "text-base font-semibold text-amber-800"
              : "font-display text-2xl font-extrabold tabular-nums md:text-[1.75rem]",
          )}
          aria-label={
            unavailableMessage ? `未取得: ${unavailableMessage}` : undefined
          }
        >
          {unavailableMessage ? "未取得" : value}
        </div>

        {showSparkline && (
          <div data-kpi-row="sparkline" className="mt-2 h-8">
            <Sparkline
              values={sparkline}
              dates={sparkDates}
              tone={sparkTone}
              height={32}
              format={sparkFormat}
              title={`${label} の推移`}
            />
          </div>
        )}

        {showComparison && (
          <div data-kpi-row="comparison" className="mt-2 text-xs">
            <div
              className={cn(
                "flex items-center justify-between gap-2",
                comparison.delta == null
                  ? "text-muted-foreground"
                  : (lowerIsBetter
                        ? comparison.delta < 0
                        : comparison.delta > 0)
                    ? "text-emerald-700"
                    : (lowerIsBetter
                          ? comparison.delta > 0
                          : comparison.delta < 0)
                      ? "text-rose-700"
                      : "text-muted-foreground",
              )}
            >
              <span className="text-muted-foreground">{comparison.label}</span>
              <span
                className="flex items-center gap-1 tabular-nums"
                aria-label={comparisonAriaLabel(comparison, lowerIsBetter)}
              >
                <Arrow delta={comparison.delta} />
                {comparison.delta == null ||
                !Number.isFinite(comparison.delta)
                  ? "—"
                  : signedDelta(comparison.delta)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
