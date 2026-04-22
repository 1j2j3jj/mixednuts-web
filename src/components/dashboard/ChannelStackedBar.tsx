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

/**
 * Hand-picked hue palette. `--chart-1..5` are all blue-cyan variants, so
 * using them here made Paid Search and Paid Social nearly identical.
 * Replaced with 7 distinct hues (blue / orange / green / violet / teal /
 * pink / gray) and locked to a fixed channel→color map so the Legend does
 * not reshuffle when the data changes date range.
 */
const CHANNEL_COLOURS: Record<ChannelGroup, string> = {
  "Paid Search": "#2563eb",      // blue-600
  "Paid Social": "#f97316",      // orange-500
  "Organic Search": "#16a34a",   // green-600
  Direct: "#8b5cf6",             // violet-500
  Referral: "#0891b2",           // cyan-600
  Email: "#ec4899",              // pink-500
  Other: "#94a3b8",              // slate-400
};

// Fixed channel order for stack + legend so rearranging the data's insertion
// order does not shuffle the visual stack.
const CHANNEL_ORDER: ChannelGroup[] = [
  "Paid Search",
  "Paid Social",
  "Organic Search",
  "Direct",
  "Referral",
  "Email",
  "Other",
];

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
  // Use the fixed canonical order and filter to channels actually present
  // in the data. This means the bar stack never reshuffles when date range
  // changes — Paid Search is always on the bottom, Other always on top.
  const presentChannels = new Set(data.map((r) => r.channel));
  const channels = CHANNEL_ORDER.filter((c) => presentChannels.has(c));

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
