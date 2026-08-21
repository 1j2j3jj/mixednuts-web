import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sparkline from "@/components/dashboard/Sparkline";
import { cn, fmtPct } from "@/lib/utils";

export interface Comparison {
  label: string;
  delta: number | null;
}

/**
 * Badge fill hue — reuses the existing --chart-1..7 categorical palette
 * (globals.css) instead of introducing new tokens. Verified 2026-07-25 that
 * all 7 clear the WCAG 1.4.11 non-text-contrast floor (>=3:1) for a WHITE
 * icon glyph on the filled swatch (the badge's actual use, distinct from the
 * >=3:1-vs-white "mark-safe on a plain background" check the --chart-N
 * comment in globals.css already documents): chart-1 3.66:1, chart-2
 * 3.72:1, chart-3 3.65:1, chart-4 6.53:1, chart-5 5.02:1, chart-6 3.88:1,
 * chart-7 7.54:1 — all pass.
 *
 * Named chart-N rather than a semantic hue name (e.g. the brand's own accent
 * colour, cyan) on purpose: design-guards.ts Guard 1 flags the bare token
 * cyan inside ANY quoted string in dashboard scope, including a TypeScript
 * string-literal type union — a `type X = ... | ...` alternative spelled
 * out with that colour name in quotes reads as a string literal to that
 * text-based scanner exactly like a runtime string does.
 */
export type KpiHue =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7";

/**
 * Referenced via var(--chart-N) rather than a Tailwind `bg-chart-N` utility
 * because the hue is chosen dynamically per call site — Tailwind's static
 * analyzer cannot see a computed class name. Same reasoning
 * ChannelStackedBar.tsx's CHANNEL_COLORS map already uses for its inline
 * `fill` prop; keeps this compliant with design-guards.ts Guard 2 (no
 * hex/rgb literal — var() references are exempt).
 */
const HUE_VAR: Record<KpiHue, string> = {
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
  "chart-4": "var(--chart-4)",
  "chart-5": "var(--chart-5)",
  "chart-6": "var(--chart-6)",
  "chart-7": "var(--chart-7)",
};

interface Props {
  label: string;
  value: string;
  /**
   * Explicit data-absence state. The card keeps every A-7/A-16 reserved row,
   * but replaces the numeric value/caption/comparison with visibly distinct
   * copy so a missing measurement can never read as a measured zero.
   */
  unavailableMessage?: string;
  /**
   * Unified one-line takeaway — cost-scope caveat, prior-period comparison,
   * or target-progress sentence. ALWAYS rendered in a fixed-height row.
   *
   * Replaces the old optional `note` prop. `note` was only passed by 2 of
   * the Overview page's 5 cards (CPA/ROAS's "COST=全媒体合算" caveat), so
   * those two cards alone carried an extra header row and every element
   * below it (value / sparkline / comparison) sat ~23px lower than its
   * neighbours in the same grid row — the A-7 defect
   * (visual-aesthetic-review.md Case 1: "same species of element, different
   * internal baseline"). Making this prop required forces every call site
   * to compute *something* true to say — there is no "cards without a
   * caption" case left for a future row to diverge on.
   */
  caption: string;
  /**
   * Single comparison line (previously `comparisons: Comparison[]`, docs
   * said "up to three" but no call site ever passed more than one). ALWAYS
   * rendered as exactly one row:
   *  - omitted entirely -> renders a "—" / "—" placeholder rather than
   *    vanishing.
   *  - provided with `delta: null` (e.g. the prior period's denominator was
   *    0, so the ratio is undefined) -> still renders the real `label` with
   *    an em-dash value, instead of disappearing.
   * The previous array-based design let a caller collapse the WHOLE row to
   * `[]` whenever any leg of a null-check failed, which is exactly the A-16
   * mechanism (Chakin GA_CPA rendered 4 rows against its siblings' 5;
   * reproduced on HS's Drill ROAS card). Requiring a single object (not an
   * array) makes that collapse structurally impossible to reintroduce.
   */
  comparison?: Comparison;
  lowerIsBetter?: boolean;
  /**
   * Optional sparkline series (e.g. last 7-14 days). The row is ALWAYS
   * reserved at a fixed height (32px), whether or not this prop is passed —
   * so a tab that never fetches a sparkline series (Ads / Drill / Report)
   * renders the identical row count and per-row height as Overview's 5-card
   * row that does.
   */
  sparkline?: number[];
  /** Dates parallel to `sparkline` — enables hover tooltip on the chart. */
  sparkDates?: string[];
  /** Tooltip value format. */
  sparkFormat?: "int" | "jpy" | "pct";
  /** Sparkline tone (colour hint). */
  sparkTone?: "default" | "positive" | "negative";
  /**
   * Icon glyph for the top-right colour badge (reference-dashboard
   * pattern). Optional so a not-yet-wired caller still reserves the
   * fixed-size badge slot (rendered empty, muted fill) rather than shifting
   * the header row's height — the same reserved-slot principle as the rows
   * below, applied to the header.
   */
  icon?: LucideIcon;
  /** Badge fill hue — one of the existing --chart-1..7 tokens. Ignored
   *  (badge renders as an empty neutral square) when `icon` is omitted. */
  hue?: KpiHue;
}

function Arrow({ delta }: { delta: number | null }) {
  if (delta == null || !Number.isFinite(delta))
    return <Minus className="h-3 w-3" />;
  // Direction and evaluation are separate signals: the glyph follows the
  // measured sign only, while the comparison row colour below expresses
  // whether that movement is favourable for this KPI. Mixing those two
  // responsibilities previously reversed every lower-is-better arrow.
  if (delta > 0) return <ArrowUpRight className="h-3 w-3" />;
  if (delta < 0) return <ArrowDownRight className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function comparisonAriaLabel(
  comparison: Comparison,
  lowerIsBetter?: boolean,
): string {
  if (comparison.delta == null || !Number.isFinite(comparison.delta)) {
    return `${comparison.label} 比較不能`;
  }

  const direction =
    comparison.delta > 0
      ? "増加"
      : comparison.delta < 0
        ? "減少"
        : "変化なし";
  const favourable = lowerIsBetter
    ? comparison.delta < 0
    : comparison.delta > 0;
  const unfavourable = lowerIsBetter
    ? comparison.delta > 0
    : comparison.delta < 0;
  const evaluation = favourable ? "改善" : unfavourable ? "悪化" : "横ばい";

  return `${comparison.label} ${fmtPct(Math.abs(comparison.delta), 1)} ${direction}（${evaluation}）`;
}

function signedDelta(delta: number): string {
  if (delta > 0) return `+${fmtPct(delta, 1)}`;
  if (delta < 0) return `-${fmtPct(Math.abs(delta), 1)}`;
  return fmtPct(delta, 1);
}

/** Reserved-slot placeholder — used whenever a caller has no comparison to
 *  show. Rendering this (rather than skipping the row) is the entire A-16
 *  fix: the row's existence never depends on data availability. */
const PLACEHOLDER_COMPARISON: Comparison = { label: "—", delta: null };

export default function BigKpiCard({
  label,
  value,
  unavailableMessage,
  caption,
  comparison,
  lowerIsBetter,
  sparkline,
  sparkDates,
  sparkFormat = "int",
  sparkTone,
  icon: Icon,
  hue = "chart-1",
}: Props) {
  const cmp = unavailableMessage
    ? PLACEHOLDER_COMPARISON
    : (comparison ?? PLACEHOLDER_COMPARISON);
  const showSparkline = !!sparkline && sparkline.length > 1;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle
          data-kpi-row="label"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </CardTitle>
        {/* Badge slot is ALWAYS rendered at a fixed size — a caller that
            hasn't passed `icon` yet still reserves the header height instead
            of shrinking it (same reserved-slot principle as every row
            below). */}
        <div
          data-kpi-row="badge"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: Icon ? HUE_VAR[hue] : "var(--muted)" }}
          aria-hidden="true"
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Caption row — ALWAYS rendered (A-7 fix). `truncate` keeps this to
            exactly one line regardless of caption length, so cards in the
            same grid row never diverge in height because one caption
            happened to be longer than its neighbours.
            `data-kpi-row` markers on this and the other 4 fixed rows below
            exist so __tests__/BigKpiCard.invariant.test.tsx can assert row
            PRESENCE structurally (exactly one of each, for every prop
            combination) without depending on Tailwind class strings, which
            twMerge is free to reorder/collapse. */}
        <div
          data-kpi-row="caption"
          className="min-h-[1rem] truncate text-xs leading-tight text-muted-foreground"
          title={unavailableMessage ?? caption}
        >
          {unavailableMessage ?? caption}
        </div>
        <div
          data-kpi-row="value"
          className={cn(
            "mt-1 leading-none tracking-tight",
            unavailableMessage
              ? "text-base font-semibold text-amber-800"
              : "font-display text-2xl font-extrabold tabular-nums md:text-[1.75rem]",
          )}
          aria-label={
            unavailableMessage ? `未取得: ${unavailableMessage}` : undefined
          }
        >
          {unavailableMessage ? "未取得" : value}
        </div>
        {/* Sparkline row — ALWAYS reserved at a fixed height (A-7 fix, the
            general form: this used to be `{sparkline && ... && <div>}`,
            present only on Overview's cards). Empty when no series is
            provided, but the slot's height never disappears. */}
        <div data-kpi-row="sparkline" className="mt-2 h-8">
          {!unavailableMessage && showSparkline && (
            <Sparkline
              values={sparkline!}
              dates={sparkDates}
              tone={sparkTone}
              height={32}
              format={sparkFormat}
              // E-2/E-4: accessible name reuses the card's own `label` prop
              // (already the visible CardTitle text) — no new visible copy,
              // just wired into the chart's invisible SVG <title> so a
              // screen reader user reaching this KPI card's sparkline (via
              // Tab — recharts' default accessibilityLayer makes it a
              // keyboard-focusable target) hears what it is.
              title={`${label} の推移`}
            />
          )}
        </div>
        {/* Comparison row — ALWAYS exactly one line (A-16 fix). */}
        <div data-kpi-row="comparison" className="mt-2 text-xs">
          <div
            className={cn(
              "flex items-center justify-between gap-2",
              cmp.delta == null
                ? "text-muted-foreground"
                : (lowerIsBetter ? cmp.delta < 0 : cmp.delta > 0)
                  ? "text-emerald-700"
                  : (lowerIsBetter ? cmp.delta > 0 : cmp.delta < 0)
                    ? "text-rose-700"
                    : "text-muted-foreground",
            )}
          >
            <span className="text-muted-foreground">{cmp.label}</span>
            <span
              className="flex items-center gap-1 tabular-nums"
              aria-label={comparisonAriaLabel(cmp, lowerIsBetter)}
            >
              <Arrow delta={cmp.delta} />
              {cmp.delta == null || !Number.isFinite(cmp.delta)
                ? "—"
                : signedDelta(cmp.delta)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
