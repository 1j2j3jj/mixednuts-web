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
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import AbsenceNotice from "@/components/dashboard/AbsenceNotice";
import type { AbsenceReason, NoDataPeriodDetail } from "@/lib/absence";

interface Point {
  yearMonth: string;
  new: number;
  returning: number;
}

interface Props {
  data: Point[];
  /** Phase D sweep (item 2): `data` empty used to render an empty Recharts
   *  canvas with no message — same A-21 failure mode ChannelStackedBar was
   *  already fixed for. Caller can pass a reason to distinguish
   *  not-configured/unavailable from a true empty result; defaults to the
   *  generic "no data" copy. */
  absenceReason?: AbsenceReason;
  absenceDetail?: NoDataPeriodDetail;
}

export default function NewVsRepeatChart({
  data,
  absenceReason,
  absenceDetail,
}: Props) {
  if (data.length === 0) {
    return (
      <AbsenceNotice
        reason={absenceReason ?? "no_data_period"}
        detail={absenceDetail}
        className="h-56"
      />
    );
  }
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
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={(props) => <ChartTooltip {...props} />}
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
