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
  /** Accessible name for the chart (SVG <title>, invisible). Recharts
   *  renders this as the first child of the <svg role="application"> it
   *  already emits by default (accessibilityLayer defaults to true in
   *  recharts 3.x) — a screen reader focusing the chart announces this
   *  instead of nothing. Not shown visually; reuses whatever visible label
   *  text the caller already renders (E-4/E-2 fix, no new visible copy). */
  title?: string;
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
  title,
}: Props) {
  const data = values.map((v, i) => ({ i, v, date: dates?.[i] ?? "" }));
  const stroke =
    tone === "positive"
      ? "var(--positive)"
      : tone === "negative"
        ? "var(--negative)"
        : "var(--chart-1)";
  // E-3 guard-rail: today's only caller passes a STATIC tone (COST cards
  // are always styled "negative" regardless of whether spend actually rose
  // or fell — a branding choice, not data-derived), so this has zero live
  // colour-only impact yet. But the component itself offered no non-colour
  // carrier at all, so a future caller passing a genuinely data-derived
  // tone (e.g. `sparkTone={trendUp ? "positive" : "negative"}`) would become
  // a silent violation with no warning. Dash pattern closes that gap now,
  // matching the in-repo precedent DailyTrendChart already sets for its own
  // "CPA" line (solid vs. `strokeDasharray="4 3"`) — never removes the
  // colour, only adds a second channel.
  const strokeDasharray = tone === "negative" ? "4 3" : undefined;
  const showTooltip = dates && dates.length === values.length;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          title={title}
          margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
        >
          <YAxis hide domain={["dataMin", "dataMax"]} />
          {showTooltip && (
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "11px",
                padding: "4px 8px",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelFormatter={() => ""}
              formatter={(v, _n, entry) => {
                const d =
                  (entry as unknown as { payload?: { date?: string } })?.payload
                    ?.date ?? "";
                return [fmt(Number(v), format), d];
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
