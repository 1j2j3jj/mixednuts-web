"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChannelGroup, ChannelMonth } from "@/lib/sources/ga4";

interface Props {
  data: ChannelMonth[];
  /** Metric to stack. Defaults to sessions. */
  metric?: "sessions" | "conversions" | "revenue";
}

const CHANNEL_COLOURS: Record<ChannelGroup, string> = {
  "Paid Search": "var(--chart-1)",
  "Paid Social": "var(--chart-2)",
  "Organic Search": "var(--chart-3)",
  Direct: "var(--chart-4)",
  Referral: "var(--chart-5)",
  Email: "#9b8cff",
  Other: "#cbd5e1",
};

export default function ChannelStackedBar({ data, metric = "sessions" }: Props) {
  // Pivot (yearMonth × channel) into a wide shape Recharts can stack.
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

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={wide} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="yearMonth" fontSize={11} tickMargin={6} stroke="var(--muted-foreground)" />
          <YAxis fontSize={11} stroke="var(--muted-foreground)" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [Number.isFinite(n) ? n.toLocaleString() : String(value), ""];
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
          {channels.map((ch) => (
            <Bar key={ch} dataKey={ch} stackId="a" fill={CHANNEL_COLOURS[ch as ChannelGroup] ?? "#ccc"} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
