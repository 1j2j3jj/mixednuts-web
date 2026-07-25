"use client";

import { cn } from "@/lib/utils";

/**
 * Deliberately loose (unknown-typed) rather than mirroring Recharts'
 * `Payload<TValue, TName>` field-for-field: that type's `value`/`name`/
 * `dataKey`/`payload` are each wide unions (e.g. `value` can be a tuple of
 * strings/numbers, not just one), and this component is used via Recharts'
 * `content={(props) => <ChartTooltip {...props} .../>}` render prop — the
 * spread must stay structurally assignable from whatever shape a given
 * chart's series actually produce without this component re-deriving
 * Recharts' own generics. `color` is the one field Recharts always types as
 * a plain `string | undefined`, so it stays concrete for the swatch.
 */
interface PayloadItem {
  name?: unknown;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
  payload?: unknown;
}

interface Props {
  /** Recharts passes these when used via <Tooltip content={...}>. */
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<PayloadItem>;
  /** Formats one series' raw value into display text. Defaults to a
   *  locale-formatted integer. */
  valueFormatter?: (value: unknown, name: string, item: PayloadItem) => string;
  /** Formats the heading (period). Defaults to String(label). Deliberately
   *  NOT named `labelFormatter` — Recharts' own TooltipProps already has a
   *  field of that exact name with an incompatible (2-arg) signature, and
   *  this component is used via `{...props}` spread from Recharts' content
   *  render prop, so a same-named field here would collide at the type
   *  level even though it's never actually passed by any current caller. */
  headingFormatter?: (label: string | number | undefined) => string;
  className?: string;
}

function defaultValueFormatter(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return Math.round(n).toLocaleString("ja-JP");
}

/**
 * Shared Recharts tooltip content (C2-c, spec §2.2): a white rounded card
 * with a subtle border/shadow, the hovered period as a heading, then one row
 * per series — a small colour swatch, the series name, and a right-aligned
 * tabular value. Replaces per-chart contentStyle/itemStyle/labelStyle prop
 * soup (Recharts' default tooltip shell), which cannot produce this
 * swatch/heading/alignment structure through CSS overrides alone.
 *
 * Pair with `cursor={{ stroke: "var(--border)", strokeWidth: 1 }}` on the
 * parent <Tooltip> for the vertical hover guide line — Sparkline.tsx already
 * does this for its single-series LineChart (cursor draws a full-height
 * line there); the same prop replaces Bar/ComposedChart's default full-
 * height grey rectangle with an equivalent thin line.
 */
export default function ChartTooltip({
  active,
  label,
  payload,
  valueFormatter = defaultValueFormatter,
  headingFormatter,
  className,
}: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = headingFormatter
    ? headingFormatter(label)
    : (label?.toString() ?? "");

  return (
    <div
      className={cn(
        "min-w-[9rem] rounded-md border bg-card px-3 py-2 text-xs shadow-card",
        className,
      )}
    >
      {heading && (
        <div className="mb-1.5 font-semibold text-foreground">{heading}</div>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const name = String(item.name ?? item.dataKey ?? "");
          return (
            <div
              key={`${name}-${i}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                {name}
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {valueFormatter(item.value, name, item)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
