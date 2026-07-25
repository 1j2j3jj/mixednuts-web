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
import SegmentedControl from "@/components/dashboard/SegmentedControl";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import AbsenceNotice from "@/components/dashboard/AbsenceNotice";
import type {
  ChannelDay,
  ChannelGroup,
  SecondaryEventDef,
} from "@/lib/sources/ga4";
import type { AbsenceReason, NoDataPeriodDetail } from "@/lib/absence";

interface Props {
  data: ChannelDay[];
  /** Initial metric. Secondary-event keys (e.g. "thanks", "wedding") are
   *  also valid once `secondaryDefs` supplies them. */
  defaultMetric?: BaseMetric | string;
  defaultGranularity?: Granularity;
  /** クライアント別の第4トグル以降の定義（HS=[会員登録] / DOZO=[Thanks,Wedding]）。 */
  secondaryDefs?: SecondaryEventDef[];
  /** Phase D sweep (item 2): `data` empty (a genuinely new/quiet client with
   *  no GA4 rows in the past 90 days) used to render the toggles followed by
   *  an empty Recharts canvas with no message — the exact A-21 failure mode
   *  ChannelStackedBar was already fixed for, just not applied to this
   *  sibling chart. Caller can pass a reason to distinguish
   *  not-configured/unavailable from a true empty result; defaults to the
   *  generic "no data" copy. */
  absenceReason?: AbsenceReason;
  absenceDetail?: NoDataPeriodDetail;
}

type BaseMetric = "sessions" | "conversions" | "revenue";
type Metric = BaseMetric | string;
type Granularity = "day" | "week";

const BASE_METRICS: Array<{ key: Metric; label: string }> = [
  { key: "sessions", label: "SESSION" },
  { key: "conversions", label: "CV" },
  { key: "revenue", label: "売上" },
];

const GRAN: Array<{ key: Granularity; label: string }> = [
  { key: "day", label: "日" },
  { key: "week", label: "週" },
];

// Kept in sync with ChannelStackedBar — same tokens, same stack order.
// See globals.css .dashboard-scope for the validated 7-hue palette note.
const CHANNEL_COLOURS: Record<ChannelGroup, string> = {
  "Paid Search": "var(--chart-1)",
  "Paid Social": "var(--chart-2)",
  "Organic Search": "var(--chart-3)",
  Direct: "var(--chart-4)",
  Referral: "var(--chart-5)",
  Email: "var(--chart-6)",
  Other: "var(--chart-7)",
};

const CHANNEL_ORDER: ChannelGroup[] = [
  "Paid Search",
  "Paid Social",
  "Organic Search",
  "Direct",
  "Referral",
  "Email",
  "Other",
];

/** Monday-start week bucket. "2026-04-22" (Wed) → "2026-04-20" (Mon). */
function weekBucket(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = d.getUTCDay();
  const diff = (dow + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

const BASE_METRIC_KEYS = new Set<string>(BASE_METRICS.map((m) => m.key));

/** Reads a metric value off a ChannelDay row — base metrics (sessions /
 *  conversions / revenue) are direct fields, anything else is looked up in
 *  the per-client `secondary` map by key. */
function metricValue(row: ChannelDay, metric: Metric): number {
  if (BASE_METRIC_KEYS.has(metric)) return row[metric as BaseMetric];
  return row.secondary[metric] ?? 0;
}

export default function ChannelTrendChart({
  data,
  defaultMetric = "sessions",
  defaultGranularity = "day",
  secondaryDefs = [],
  absenceReason,
  absenceDetail,
}: Props) {
  const METRICS = [
    ...BASE_METRICS,
    ...secondaryDefs.map((d) => ({ key: d.key, label: d.label })),
  ];
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const [granularity, setGranularity] =
    useState<Granularity>(defaultGranularity);

  // Phase D sweep (item 2): same treatment as ChannelStackedBar's A-21 fix —
  // title/toggles stay visible (what the client was looking at), only the
  // chart body is replaced.
  if (data.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={metric}
            options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
            onValueChange={setMetric}
            ariaLabel="グラフ指標"
          />
          <SegmentedControl
            value={granularity}
            options={GRAN.map((g) => ({ value: g.key, label: g.label }))}
            onValueChange={setGranularity}
            ariaLabel="集計単位"
          />
        </div>
        <AbsenceNotice
          reason={absenceReason ?? "no_data_period"}
          detail={absenceDetail}
          className="h-72"
        />
      </div>
    );
  }

  // Pivot: (bucket × channel) → value
  const byBucket = new Map<string, Record<string, number | string>>();
  for (const row of data) {
    const bucket = granularity === "week" ? weekBucket(row.date) : row.date;
    const entry = byBucket.get(bucket) ?? { bucket };
    entry[row.channel] =
      ((entry[row.channel] as number | undefined) ?? 0) +
      metricValue(row, metric);
    byBucket.set(bucket, entry);
  }
  const wide = Array.from(byBucket.values()).sort((a, b) =>
    String(a.bucket).localeCompare(String(b.bucket)),
  );
  const presentChannels = new Set(data.map((r) => r.channel));
  const channels = CHANNEL_ORDER.filter((c) => presentChannels.has(c));

  const yTickFormat =
    metric === "revenue"
      ? (v: number) => `¥${Math.round(v / 1_000_000).toLocaleString()}M`
      : !BASE_METRIC_KEYS.has(metric)
        ? (v: number) => Math.round(v).toLocaleString()
        : (v: number) => `${Math.round(v / 1000).toLocaleString()}k`;

  const tooltipValueFormatter = (value: unknown): string => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "—";
    if (metric === "revenue") return `¥${Math.round(n).toLocaleString()}`;
    return Math.round(n).toLocaleString();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={metric}
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
          onValueChange={setMetric}
          ariaLabel="グラフ指標"
        />
        <SegmentedControl
          value={granularity}
          options={GRAN.map((g) => ({ value: g.key, label: g.label }))}
          onValueChange={setGranularity}
          ariaLabel="集計単位"
        />
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={wide}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="bucket"
              fontSize={11}
              tickMargin={6}
              stroke="var(--muted-foreground)"
              interval="preserveStartEnd"
            />
            <YAxis
              fontSize={11}
              stroke="var(--muted-foreground)"
              tickFormatter={yTickFormat}
              domain={[0, "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
              content={(props) => (
                <ChartTooltip
                  {...props}
                  valueFormatter={tooltipValueFormatter}
                />
              )}
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
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={24}
                radius={
                  idx === channels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
                fill={
                  CHANNEL_COLOURS[ch as ChannelGroup] ??
                  "var(--muted-foreground)"
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
