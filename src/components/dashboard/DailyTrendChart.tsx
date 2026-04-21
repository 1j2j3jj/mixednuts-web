"use client";

import { Line, LineChart, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { DailySeriesPoint } from "@/lib/metrics";

interface Props {
  data: DailySeriesPoint[];
}

const costAxisFormat = (v: number) => `¥${Math.round(v / 1000).toLocaleString()}k`;

export default function DailyTrendChart({ data }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
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
              if (label === "費用" || label === "CV値") {
                return [`¥${Math.round(num).toLocaleString()}`, label];
              }
              return [Math.round(num).toLocaleString(), label];
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cost"
            name="費用"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
