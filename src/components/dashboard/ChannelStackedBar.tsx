"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ChannelGroup,
  ChannelMonth,
  SecondaryEventDef,
} from "@/lib/sources/ga4";

interface Props {
  data: ChannelMonth[];
  /** Initial metric. Defaults to sessions. Secondary-event keys (e.g.
   *  "thanks", "wedding") are also valid once `secondaryDefs` supplies them. */
  defaultMetric?: BaseMetric | string;
  /** クライアント別の第4トグル以降の定義（HS=[会員登録] / DOZO=[Thanks,Wedding]）。 */
  secondaryDefs?: SecondaryEventDef[];
}

type BaseMetric = "sessions" | "conversions" | "revenue";
type Metric = BaseMetric | string;

const BASE_METRICS: Array<{ key: Metric; label: string }> = [
  { key: "sessions", label: "Sessions" },
  { key: "conversions", label: "CV" },
  { key: "revenue", label: "売上" },
];

/**
 * `--chart-1..7` — 7-hue categorical palette anchored on brand cyan (slot 1),
 * validated against the dataviz skill's color-formula.md (adjacent CVD dE
 * 9.6, normal-vision floor 20.8, all >=3:1 vs white — see globals.css
 * .dashboard-scope for the full validator note). Locked to a fixed
 * channel→color map so the Legend does not reshuffle when the data changes
 * date range; kept in sync with ChannelTrendChart.
 */
const CHANNEL_COLOURS: Record<ChannelGroup, string> = {
  "Paid Search": "var(--chart-1)",
  "Paid Social": "var(--chart-2)",
  "Organic Search": "var(--chart-3)",
  Direct: "var(--chart-4)",
  Referral: "var(--chart-5)",
  Email: "var(--chart-6)",
  Other: "var(--chart-7)",
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

const BASE_METRIC_KEYS = new Set<string>(BASE_METRICS.map((m) => m.key));

/** Reads a metric value off a ChannelMonth row — base metrics (sessions /
 *  conversions / revenue) are direct fields, anything else is looked up in
 *  the per-client `secondary` map by key. */
function metricValue(row: ChannelMonth, metric: Metric): number {
  if (BASE_METRIC_KEYS.has(metric)) return row[metric as BaseMetric];
  return row.secondary[metric] ?? 0;
}

export default function ChannelStackedBar({
  data,
  defaultMetric = "sessions",
  secondaryDefs = [],
}: Props) {
  const METRICS = [
    ...BASE_METRICS,
    ...secondaryDefs.map((d) => ({ key: d.key, label: d.label })),
  ];
  const [metric, setMetric] = useState<Metric>(defaultMetric);

  const byMonth = new Map<string, Record<string, number | string>>();
  for (const row of data) {
    const entry = byMonth.get(row.yearMonth) ?? { yearMonth: row.yearMonth };
    entry[row.channel] =
      ((entry[row.channel] as number | undefined) ?? 0) +
      metricValue(row, metric);
    byMonth.set(row.yearMonth, entry);
  }
  const wide = Array.from(byMonth.values()).sort((a, b) =>
    String(a.yearMonth).localeCompare(String(b.yearMonth)),
  );
  // Use the fixed canonical order and filter to channels actually present
  // in the data. This means the bar stack never reshuffles when date range
  // changes — Paid Search is always on the bottom, Other always on top.
  const presentChannels = new Set(data.map((r) => r.channel));
  const channels = CHANNEL_ORDER.filter((c) => presentChannels.has(c));

  const yTickFormat =
    metric === "revenue"
      ? (v: number) => `¥${Math.round(v / 1_000_000).toLocaleString()}M`
      : !BASE_METRIC_KEYS.has(metric)
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
      <div className="inline-flex items-center gap-0.5 rounded-md border bg-muted p-0.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            aria-pressed={metric === m.key}
            className={`h-6 rounded border-[1.5px] px-3 text-xs font-medium transition-colors ${
              metric === m.key
                ? "border-brand-ink bg-brand/14 text-brand-deep"
                : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={wide}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="yearMonth"
              fontSize={11}
              tickMargin={6}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              fontSize={11}
              stroke="var(--muted-foreground)"
              tickFormatter={yTickFormat}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
              formatter={tooltipFormat}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px" }}
            />
            {channels.map((ch, idx) => (
              <Bar
                key={ch}
                dataKey={ch}
                stackId="a"
                fill={CHANNEL_COLOURS[ch as ChannelGroup] ?? "#ccc"}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={24}
                radius={
                  idx === channels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
