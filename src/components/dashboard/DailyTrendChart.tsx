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
import type { DailySeriesPoint } from "@/lib/metrics";

interface Props {
  data: DailySeriesPoint[];
}

const costAxisFormat = (v: number) => `¥${Math.round(v / 1000).toLocaleString()}k`;

/**
 * Mixed chart: Spend as a bar (magnitude emphasis) + CV and CPA as lines
 * on a secondary axis. CPA is computed per-point (cost / CV) which is the
 * figure managers track day-to-day.
 */
export default function DailyTrendChart({ data }: Props) {
  const withCpa = data.map((d) => ({
    ...d,
    cpa: d.conversions > 0 ? Math.round(d.cost / d.conversions) : null,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={withCpa} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" fontSize={11} tickMargin={6} stroke="var(--muted-foreground)" />
          <YAxis
            yAxisId="left"
            fontSize={11}
            tickFormatter={costAxisFormat}
            stroke="var(--muted-foreground)"
          />
          <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value, name) => {
              const num = typeof value === "number" ? value : Number(value);
              if (!Number.isFinite(num)) return [String(value ?? "—"), String(name ?? "")];
              const label = String(name ?? "");
              if (label === "Spend" || label === "CPA") {
                return [`¥${Math.round(num).toLocaleString()}`, label];
              }
              return [Math.round(num).toLocaleString(), label];
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
          <Bar
            yAxisId="left"
            dataKey="cost"
            name="Spend"
            fill="var(--chart-1)"
            fillOpacity={0.35}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="conversions"
            name="CV"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cpa"
            name="CPA"
            stroke="var(--chart-5)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
