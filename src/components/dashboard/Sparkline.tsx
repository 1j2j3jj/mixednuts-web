"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

interface Props {
  values: number[];
  /** Optional parallel array of dates. When provided, hover tooltip shows date. */
  dates?: string[];
  tone?: "default" | "positive" | "negative";
  height?: number;
  /** How to format the tooltip value. */
  format?: "int" | "jpy" | "pct";
}

function fmt(v: number, kind: "int" | "jpy" | "pct"): string {
  if (!Number.isFinite(v)) return "—";
  if (kind === "jpy") return `¥${Math.round(v).toLocaleString("ja-JP")}`;
  if (kind === "pct") return `${Math.round(v).toLocaleString("ja-JP")}%`;
  return Math.round(v).toLocaleString("ja-JP");
}

export default function Sparkline({
  values,
  dates,
  tone = "default",
  height = 28,
  format = "int",
}: Props) {
  const data = values.map((v, i) => ({ i, v, date: dates?.[i] ?? "" }));
  const stroke =
    tone === "positive" ? "#059669" : tone === "negative" ? "#dc2626" : "var(--chart-1)";
  const showTooltip = dates && dates.length === values.length;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          {showTooltip && (
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                fontSize: "11px",
                padding: "4px 8px",
              }}
              labelFormatter={() => ""}
              formatter={(v, _n, entry) => {
                const d = (entry as unknown as { payload?: { date?: string } })?.payload?.date ?? "";
                return [fmt(Number(v), format), d];
              }}
            />
          )}
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
