"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  values: number[];
  /** Colour hint — "positive" or "negative" shifts the stroke. */
  tone?: "default" | "positive" | "negative";
  height?: number;
}

/**
 * Ultra-compact inline line chart used inside KPI cards. No axes, no
 * tooltip — visual only. Works with just an array of numbers.
 */
export default function Sparkline({ values, tone = "default", height = 28 }: Props) {
  const data = values.map((v, i) => ({ i, v }));
  const stroke =
    tone === "positive" ? "#059669" : tone === "negative" ? "#dc2626" : "var(--chart-1)";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
