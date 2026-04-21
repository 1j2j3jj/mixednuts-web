"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChannelDay, ChannelGroup } from "@/lib/sources/ga4";

interface Props {
  data: ChannelDay[];
  defaultMetric?: Metric;
  defaultGranularity?: Granularity;
}

type Metric = "sessions" | "conversions" | "revenue" | "signUps";
type Granularity = "day" | "week";

const METRICS: Array<{ key: Metric; label: string }> = [
  { key: "sessions", label: "Sessions" },
  { key: "conversions", label: "CV" },
  { key: "revenue", label: "売上" },
  { key: "signUps", label: "会員登録" },
];

const GRAN: Array<{ key: Granularity; label: string }> = [
  { key: "day", label: "日" },
  { key: "week", label: "週" },
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

/** Monday-start week bucket. "2026-04-22" (Wed) → "2026-04-20" (Mon). */
function weekBucket(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = d.getUTCDay();
  const diff = (dow + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export default function ChannelTrendChart({
  data,
  defaultMetric = "sessions",
  defaultGranularity = "day",
}: Props) {
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity);

  // Pivot: (bucket × channel) → value
  const byBucket = new Map<string, Record<string, number | string>>();
  for (const row of data) {
    const bucket = granularity === "week" ? weekBucket(row.date) : row.date;
    const entry = byBucket.get(bucket) ?? { bucket };
    entry[row.channel] = ((entry[row.channel] as number | undefined) ?? 0) + (row[metric] as number);
    byBucket.set(bucket, entry);
  }
  const wide = Array.from(byBucket.values()).sort((a, b) =>
    String(a.bucket).localeCompare(String(b.bucket))
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
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="inline-flex rounded-md border">
          {GRAN.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGranularity(g.key)}
              className={`h-7 px-3 text-xs transition-colors ${
                granularity === g.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={wide} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="bucket"
              fontSize={11}
              tickMargin={6}
              stroke="var(--muted-foreground)"
              interval="preserveStartEnd"
            />
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
