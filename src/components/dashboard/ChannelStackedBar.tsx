"use client";

import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  ChannelGroup,
  ChannelMonth,
  SecondaryEventDef,
} from "@/lib/sources/ga4";
import type { AbsenceReason, NoDataPeriodDetail } from "@/lib/absence";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  formatCompactAxis,
  formatCompactRevenueAxis,
} from "@/lib/chart-format";

interface Props {
  data: ChannelMonth[];
  /** Initial metric. Defaults to sessions. Secondary-event keys (e.g.
   *  "thanks", "wedding") are also valid once `secondaryDefs` supplies them. */
  defaultMetric?: BaseMetric | string;
  /** クライアント別の第4トグル以降の定義（HS=[会員登録] / DOZO=[Thanks,Wedding]）。 */
  secondaryDefs?: SecondaryEventDef[];
  /**
   * A-21 fix: when `data` is empty (a genuinely new client with no GA4 rows
   * at all — not just a period outside 過去12ヶ月), this card used to render
   * an empty Recharts canvas with only the title+toggle visible (confirmed
   * live on this worktree: the card does NOT go blank for an out-of-range
   * custom period since the source query is fixed to real 過去12ヶ月, but IS
   * unguarded for the genuinely-empty-source case). Caller can pass a reason
   * to distinguish not-configured/unavailable from a true empty result;
   * defaults to the generic "no data" copy.
   */
  absenceReason?: AbsenceReason;
  absenceDetail?: NoDataPeriodDetail;
  /** Accessible name for the chart (E-2/E-4) — defaults to the visible
   *  CardTitle text already rendered at the one real call site, not new
   *  copy. */
  title?: string;
  /** Final monthly bucket that is still in progress (normally current JST month). */
  inProgressMonth?: string | null;
  /** Static preview only: explicit Recharts dimensions for SSR output. */
  width?: number;
  height?: number;
}

type BaseMetric = "sessions" | "conversions" | "revenue";
type Metric = BaseMetric | string;

const BASE_METRICS: Array<{ key: Metric; label: string }> = [
  { key: "sessions", label: "SESSION" },
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

const MONTHLY_BAR_SIZE = 28;

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
  absenceReason,
  absenceDetail,
  title = "月次チャネル別",
  inProgressMonth,
  width,
  height,
}: Props) {
  const inProgressPatternBase = `channel-month-in-progress-${useId()}`;
  const METRICS = [
    ...BASE_METRICS,
    ...secondaryDefs.map((d) => ({ key: d.key, label: d.label })),
  ];
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const reducedMotion = usePrefersReducedMotion();

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
      ? formatCompactRevenueAxis
      : !BASE_METRIC_KEYS.has(metric)
        ? (v: number) => Math.round(v).toLocaleString()
        : (v: number) => formatCompactAxis(v);

  const tooltipValueFormatter = (value: unknown): string => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "—";
    if (metric === "revenue") return `¥${Math.round(n).toLocaleString()}`;
    return Math.round(n).toLocaleString();
  };

  // A-21 fix: `data` genuinely empty (no ga4Last12Months rows at all) used
  // to render title+toggle followed by an empty Recharts canvas with no
  // message. The title/toggle (what the client is looking at) stay visible;
  // only the chart body is replaced.
  if (data.length === 0) {
    return (
      <div className="space-y-3">
        <SegmentedControl
          value={metric}
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
          onValueChange={setMetric}
          ariaLabel="グラフ指標"
        />
        <AbsenceNotice
          reason={absenceReason ?? "no_data_period"}
          detail={absenceDetail}
          className="h-72"
        />
      </div>
    );
  }

  if (width && height) {
    const plot = { left: 58, right: 24, top: 12, bottom: 42 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const totals = wide.map((point) =>
      channels.reduce(
        (sum, channel) => sum + Number(point[channel] ?? 0),
        0,
      ),
    );
    const maxTotal = Math.max(...totals, 1);
    const slot = plotWidth / wide.length;
    const barWidth = Math.max(20, Math.min(44, slot * 0.72));
    return (
      <div className="space-y-3">
        <SegmentedControl
          value={metric}
          options={METRICS.map((item) => ({ value: item.key, label: item.label }))}
          onValueChange={setMetric}
          ariaLabel="グラフ指標"
        />
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          <defs>
            {channels.map((channel, index) => (
              <pattern
                key={channel}
                id={`${inProgressPatternBase}-${index}`}
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill={CHANNEL_COLOURS[channel]} opacity="0.45" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={CHANNEL_COLOURS[channel]} strokeWidth="2" />
              </pattern>
            ))}
          </defs>
          <line x1={plot.left} y1={plot.top + plotHeight} x2={width - plot.right} y2={plot.top + plotHeight} stroke="var(--border)" />
          <text x={4} y={plot.top + 10} fontSize="11" fill="var(--muted-foreground)">{yTickFormat(maxTotal)}</text>
          {wide.map((point, pointIndex) => {
            let cumulative = 0;
            return (
              <g key={String(point.yearMonth)}>
                {channels.map((channel, channelIndex) => {
                  const value = Number(point[channel] ?? 0);
                  const segmentHeight = plotHeight * (value / maxTotal);
                  cumulative += segmentHeight;
                  return (
                    <rect
                      key={channel}
                      x={plot.left + slot * pointIndex + (slot - barWidth) / 2}
                      y={plot.top + plotHeight - cumulative}
                      width={barWidth}
                      height={segmentHeight}
                      fill={point.yearMonth === inProgressMonth ? `url(#${inProgressPatternBase}-${channelIndex})` : CHANNEL_COLOURS[channel]}
                    />
                  );
                })}
                <text
                  x={plot.left + slot * pointIndex + slot / 2}
                  y={plot.top + plotHeight + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {String(point.yearMonth).slice(5)}
                </text>
              </g>
            );
          })}
          <text x={plot.left} y={height - 8} fontSize="11" fill="var(--muted-foreground)">
            {channels.join("　")}{inProgressMonth ? "　縞: 進行中" : ""}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SegmentedControl
        value={metric}
        options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
        onValueChange={setMetric}
        ariaLabel="グラフ指標"
      />
      <div
        className={width || height ? undefined : "h-72 w-full"}
        style={{ width, height }}
      >
        <ResponsiveContainer width={width ?? "100%"} height={height ?? "100%"}>
          <BarChart
            data={wide}
            title={title}
            desc={`月別のチャネル別${METRICS.find((m) => m.key === metric)?.label ?? metric}を積み上げ棒グラフで表示`}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            barCategoryGap="20%"
          >
            <defs>
              {channels.map((channel, index) => (
                <pattern
                  key={channel}
                  id={`${inProgressPatternBase}-${index}`}
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <rect
                    width="6"
                    height="6"
                    fill={CHANNEL_COLOURS[channel]}
                    opacity="0.45"
                  />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke={CHANNEL_COLOURS[channel]}
                    strokeWidth="2"
                  />
                </pattern>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="yearMonth"
              fontSize={11}
              tickMargin={6}
              stroke="var(--muted-foreground)"
              tickFormatter={(value) =>
                value === inProgressMonth ? `${value}（進行中）` : value
              }
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
                fill={
                  CHANNEL_COLOURS[ch as ChannelGroup] ??
                  "var(--muted-foreground)"
                }
                stroke="var(--card)"
                strokeWidth={2}
                barSize={MONTHLY_BAR_SIZE}
                radius={
                  idx === channels.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
                isAnimationActive={!reducedMotion}
              >
                {wide.map((point) => (
                  <Cell
                    key={String(point.yearMonth)}
                    fill={
                      point.yearMonth === inProgressMonth
                        ? `url(#${inProgressPatternBase}-${idx})`
                        : CHANNEL_COLOURS[ch]
                    }
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
