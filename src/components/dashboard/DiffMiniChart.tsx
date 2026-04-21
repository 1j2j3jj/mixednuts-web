"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  date: string;
  adsCv: number;
  ga4Cv: number;
}

interface Props {
  data: Point[];
}

/** Tiny area chart of (adsCv − ga4Cv). Zero line highlighted. */
export default function DiffMiniChart({ data }: Props) {
  const withDiff = data.map((d) => ({ ...d, diff: d.adsCv - d.ga4Cv }));
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={withDiff} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="diffPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" fontSize={10} tickMargin={4} stroke="var(--muted-foreground)" />
          <YAxis fontSize={10} stroke="var(--muted-foreground)" />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "11px",
            }}
          />
          <Area type="monotone" dataKey="diff" stroke="var(--chart-3)" fill="url(#diffPos)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
