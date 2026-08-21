"use client";

import { useId } from "react";
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
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { formatCompactAxis } from "@/lib/chart-format";

const MONTHLY_BAR_SIZE = 28;

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
  /** Accessible name for the chart (E-2/E-4). Defaults to the card's own
   *  visible CardTitle text at the one real call site — not new copy. */
  title?: string;
}

export default function NewVsRepeatChart({
  data,
  absenceReason,
  absenceDetail,
  title = "新規 vs リピート Users",
}: Props) {
  // Unique per chart instance so multiple charts on one page never collide
  // on the SVG <pattern> id (React 19's useId is SSR-hydration-safe, unlike
  // Math.random()).
  const hatchId = `nvr-hatch-${useId()}`;
  const reducedMotion = usePrefersReducedMotion();

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
          title={title}
          desc="月別の新規ユーザー数とリピートユーザー数を積み上げ棒グラフで表示"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          barCategoryGap="20%"
        >
          {/* E-3: 新規/リピート is exactly the "won/lost pair" case — hue is
              the ONLY thing distinguishing the two stacked segments inside
              the bar itself (the legend/tooltip text saves a hovering user,
              but not someone reading the bar shape at a glance). Diagonal
              hatch on the "リピート" segment specifically — same technique
              named in the reference dashboard for this exact shape — keeps
              the colour (fill is still --chart-6 underneath) and adds a
              texture channel on top, so the pair reads without colour. */}
          <defs>
            <pattern
              id={hatchId}
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--chart-6)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="var(--card)"
                strokeWidth="2"
              />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="yearMonth"
            fontSize={11}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            fontSize={11}
            stroke="var(--muted-foreground)"
            tickFormatter={(v) => formatCompactAxis(v)}
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
            barSize={MONTHLY_BAR_SIZE}
            radius={[0, 0, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
          <Bar
            dataKey="returning"
            name="リピート"
            stackId="a"
            fill={`url(#${hatchId})`}
            stroke="var(--card)"
            strokeWidth={2}
            barSize={MONTHLY_BAR_SIZE}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
