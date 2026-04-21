"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChannelGroup, ChannelMonth } from "@/lib/sources/ga4";

interface Props {
  data: ChannelMonth[];
  /** Initial metric. Defaults to sessions. */
  defaultMetric?: "sessions" | "conversions" | "revenue" | "signUps";
}

type Metric = "sessions" | "conversions" | "revenue" | "signUps";

const METRICS: Array<{ key: Metric; label: string }> = [
  { key: "sessions", label: "Sessions" },
  { key: "conversions", label: "CV" },
  { key: "revenue", label: "売上" },
  { key: "signUps", label: "会員登録" },
];

const CHANNEL_COLOURS: Record<ChannelGroup, string> = {
  "Paid Search": "var(--chart-1)",
  "Paid Social": "var(--chart-2)",
  "Organic Search": "var(--chart-3)",
  Direct: "var(--chart-4)",
  Referral: "var(--chart-5)",
  Email: "#9b8cff",
  Other: "#cbd5e1",
};

export default function ChannelStackedBar({ data, defaultMetric = "sessions" }: Props) {
  const [metric, setMetric] = useState<Metric>(defaultMetric);

  const byMonth = new Map<string, Record<string, number | string>>();
  for (const row of data) {
    const entry = byMonth.get(row.yearMonth) ?? { yearMonth: row.yearMonth };
    entry[row.channel] = (entry[row.channel] as number | undefined ?? 0) + (row[metric] as number);
    byMonth.set(row.yearMonth, entry);
  }
  const wide = Array.from(byMonth.values()).sort((a, b) =>
    String(a.yearMonth).localeCompare(String(b.yearMonth))
  );
  const channels = Array.from(new Set(data.map((r) => r.channel)));

  const yTickFormat =
    metric === "revenue"
      ? (v: number) => `¥${Math.round(v / 1_000_000).toLocaleString()}M`
      : metric === "signUps"
      ? (v: number) => Math.round(v).toLocaleString()
      : (v: number) => `${Math.round(v / 1000).toLocaleString()}k`;

  const tooltipFormat = (value: unknown): [string, string] => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return [String(value ?? "—"), ""];
    if (metric === "revenue") return [`¥${Math.round(n).toLocaleString()}`, ""];
    return [Math.round(n).toLocaleString(), ""];
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`h-7 px-3 text-xs transition-colors ${
              metric === m.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={wide} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="yearMonth" fontSize={11} tickMargin={6} stroke="var(--muted-foreground)" />
            <YAxis fontSize={11} stroke="var(--muted-foreground)" tickFormatter={yTickFormat} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={tooltipFormat}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            {channels.map((ch) => (
              <Bar key={ch} dataKey={ch} stackId="a" fill={CHANNEL_COLOURS[ch as ChannelGroup] ?? "#ccc"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
