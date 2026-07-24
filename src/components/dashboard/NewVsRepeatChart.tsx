"use client";

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

interface Point {
  yearMonth: string;
  new: number;
  returning: number;
}

interface Props {
  data: Point[];
}

export default function NewVsRepeatChart({ data }: Props) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="yearMonth"
            fontSize={11}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            fontSize={11}
            stroke="var(--muted-foreground)"
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
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
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px" }}
          />
          <Bar
            dataKey="new"
            name="新規"
            stackId="a"
            fill="var(--chart-1)"
            stroke="var(--card)"
            strokeWidth={2}
            maxBarSize={24}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="returning"
            name="リピート"
            stackId="a"
            fill="var(--chart-6)"
            stroke="var(--card)"
            strokeWidth={2}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
