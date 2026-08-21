"use client";

import { useId } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import AbsenceNotice from "@/components/dashboard/AbsenceNotice";
import type { DailySeriesPoint } from "@/lib/metrics";
import type { AbsenceReason, NoDataPeriodDetail } from "@/lib/absence";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { formatCompactAxis } from "@/lib/chart-format";
import { cn } from "@/lib/utils";

interface Props {
  data: DailySeriesPoint[];
  /** Phase D sweep (item 2): `data` empty (e.g. a custom period with no ad
   *  rows at all — reproduced live on dozo's 2019-01-01〜01-07) used to
   *  render an empty Recharts canvas with no message. Caller can pass a
   *  reason/detail; defaults to the generic "no data this period" copy,
   *  which is almost always the right one here since this chart is fed by
   *  the ad-side daily series, not a per-client capability. */
  absenceReason?: AbsenceReason;
  absenceDetail?: NoDataPeriodDetail;
  /** Accessible name for the chart (E-2/E-4) — callers pass their own
   *  visible CardTitle text (ads/page.tsx and drill/page.tsx each render a
   *  different one), not new copy. */
  title?: string;
  /** Final daily bucket that is still in progress (normally JST today). */
  inProgressDate?: string | null;
  /** Optional fixed dimensions for embedded browser previews. */
  width?: number;
  height?: number;
}

/**
 * Mixed chart: Spend as a bar (magnitude emphasis) + CV and CPA as lines
 * on a secondary axis. CPA is computed per-point (cost / CV).
 *
 * Note: data is always ad-platform-side (from the sheet). Labels are
 * explicit "媒体CV" / "媒体CPA" so the chart doesn't misrepresent itself
 * when the page's GA4/媒体 toggle is on GA4 — those headline KPIs use
 * GA4 but this chart stays on the ad-side daily series.
 */
export default function DailyTrendChart({
  data,
  absenceReason,
  absenceDetail,
  title = "日次推移",
  inProgressDate,
  width,
  height,
}: Props) {
  const inProgressPatternId = `daily-in-progress-${useId()}`;
  const reducedMotion = usePrefersReducedMotion();
  if (data.length === 0) {
    return (
      <AbsenceNotice
        reason={absenceReason ?? "no_data_period"}
        detail={absenceDetail}
        className="h-72"
      />
    );
  }
  const withCpa = data.map((d) => ({
    ...d,
    cpa: d.conversions > 0 ? Math.round(d.cost / d.conversions) : null,
  }));
  const hasConversions = withCpa.some((d) => d.conversions !== 0);

  return (
    <div
      className={cn(width || height ? undefined : "h-72 w-full")}
      style={{ width, height }}
    >
      <ResponsiveContainer width={width ?? "100%"} height={height ?? "100%"}>
        <ComposedChart
          data={withCpa}
          title={title}
          desc="日次の広告費・媒体CV・媒体CPAの推移をコンボチャートで表示"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <defs>
            <pattern
              id={inProgressPatternId}
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--chart-1)" opacity="0.2" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--chart-1)"
                strokeWidth="2"
              />
            </pattern>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            fontSize={11}
            tickMargin={6}
            stroke="var(--muted-foreground)"
            tickFormatter={(value) =>
              value === inProgressDate ? `${value}（進行中）` : value
            }
          />
          <YAxis
            yAxisId="left"
            fontSize={11}
            tickFormatter={(value) => formatCompactAxis(value, true)}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            fontSize={11}
            tickFormatter={(value) => formatCompactAxis(value)}
            stroke="var(--muted-foreground)"
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={(props) => (
              <ChartTooltip
                {...props}
                valueFormatter={(value, name) => {
                  const num = typeof value === "number" ? value : Number(value);
                  if (!Number.isFinite(num)) return String(value ?? "—");
                  if (name === "広告費" || name.includes("CPA")) {
                    return `¥${Math.round(num).toLocaleString()}`;
                  }
                  return Math.round(num).toLocaleString();
                }}
              />
            )}
          />
          <Legend
            content={() => (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>広告費</span>
                {hasConversions ? (
                  <>
                    <span>媒体CV</span>
                    <span>媒体CPA</span>
                  </>
                ) : (
                  <span>媒体CV: この期間データなし</span>
                )}
                {inProgressDate && <span>縞: 進行中</span>}
              </div>
            )}
          />
          <Bar
            yAxisId="left"
            dataKey="cost"
            name="広告費"
            fill="var(--chart-1)"
            fillOpacity={0.35}
            radius={[2, 2, 0, 0]}
            isAnimationActive={!reducedMotion}
          >
            {withCpa.map((point) => (
              <Cell
                key={point.date}
                fill={
                  point.date === inProgressDate
                    ? `url(#${inProgressPatternId})`
                    : "var(--chart-1)"
                }
              />
            ))}
          </Bar>
          {hasConversions && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversions"
              name="媒体CV"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={!reducedMotion}
            />
          )}
          {hasConversions && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cpa"
              name="媒体CPA"
              stroke="var(--chart-5)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              isAnimationActive={!reducedMotion}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
