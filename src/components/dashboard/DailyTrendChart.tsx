"use client";

import {
  Bar,
  CartesianGrid,
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
}

const costAxisFormat = (v: number) =>
  `¥${Math.round(v / 1000).toLocaleString()}k`;

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
}: Props) {
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

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={withCpa}
          title={title}
          desc="日次のCOST・媒体CV・媒体CPAの推移をコンボチャートで表示"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            fontSize={11}
            tickMargin={6}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            yAxisId="left"
            fontSize={11}
            tickFormatter={costAxisFormat}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            fontSize={11}
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
                  if (name === "COST" || name.includes("CPA")) {
                    return `¥${Math.round(num).toLocaleString()}`;
                  }
                  return Math.round(num).toLocaleString();
                }}
              />
            )}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Bar
            yAxisId="left"
            dataKey="cost"
            name="COST"
            fill="var(--chart-1)"
            fillOpacity={0.35}
            radius={[2, 2, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
