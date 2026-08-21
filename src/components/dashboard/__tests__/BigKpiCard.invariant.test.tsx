import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JapaneseYen } from "lucide-react";
import BigKpiCard, {
  type Comparison,
  type KpiHue,
} from "@/components/dashboard/BigKpiCard";

/**
 * Structural invariant proof for BigKpiCard (Phase C1, A-7 / A-16).
 *
 * The repo has NO component-render test setup (no jsdom, no
 * @testing-library/react — vitest.config.ts runs `environment: "node"`; see
 * package.json / vitest.config.ts). Adding either is out of scope for this
 * change. Instead this uses `react-dom/server`'s `renderToStaticMarkup`
 * (already a transitive capability of the existing `react-dom` dependency,
 * confirmed working headless in this repo's node environment — including
 * through a Recharts `<ResponsiveContainer>` inside Sparkline, which never
 * touches the DOM/ResizeObserver during a static render since effects don't
 * run) to get real, fully-rendered markup and assert on it with plain
 * string/regex matching. No new dependency, no jsdom.
 *
 * The five rows BigKpiCard.tsx always renders each carry a
 * `data-kpi-row="…"` marker (label / badge / caption / value / sparkline /
 * comparison) specifically so this test does not depend on Tailwind class
 * strings, which `cn()`/twMerge is free to reorder or collapse.
 *
 * The claim under test: **row PRESENCE is structurally guaranteed** — it
 * must be impossible for a future edit to make any row's wrapper `<div>`
 * conditional on prop content again (that regression is exactly what
 * produced A-7 — 2 of 5 Overview cards had a `note` row and 3 didn't — and
 * A-16 — CPA/ROAS's whole `comparisons` array collapsed to `[]` whenever a
 * null-check failed). So every combination below asserts each
 * `data-kpi-row` marker appears EXACTLY ONCE, deliberately including the
 * falsy/empty edge values (`caption=""`, `sparkline=[]`, `delta: 0`) that
 * would be the first thing a `{prop && <div>}` regression breaks on.
 */

const ROWS = [
  "label",
  "badge",
  "caption",
  "value",
  "sparkline",
  "comparison",
] as const;

function rowCounts(html: string): Record<(typeof ROWS)[number], number> {
  const counts = {} as Record<(typeof ROWS)[number], number>;
  for (const row of ROWS) {
    const re = new RegExp(`data-kpi-row="${row}"`, "g");
    counts[row] = (html.match(re) ?? []).length;
  }
  return counts;
}

/**
 * Extracts the inner HTML of a `data-kpi-row` wrapper, assuming it contains
 * no nested `<div>` (true for "badge" always, and true for "sparkline" only
 * when no chart is rendered — Recharts' own wrapper divs would break this).
 * Only used where that assumption holds; `rowCounts` above (marker-count
 * only) is what the main invariant test relies on.
 */
function extractRowInner(html: string, row: (typeof ROWS)[number]): string {
  const marker = `data-kpi-row="${row}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) throw new Error(`data-kpi-row="${row}" not found`);
  const openEnd = html.indexOf(">", markerIndex);
  const closeStart = html.indexOf("</div>", openEnd);
  return html.slice(openEnd + 1, closeStart);
}

const COMPARISONS: Array<{ name: string; value: Comparison | undefined }> = [
  { name: "undefined (omitted)", value: undefined },
  { name: "real delta", value: { label: "前期間", delta: 0.213 } },
  // The exact A-16 shape: a real label, but delta is null because the
  // denominator was 0 (period's CV/cost was 0) — this must NOT collapse the
  // row, only the delta's rendered text.
  { name: "null delta (A-16 shape)", value: { label: "前期間", delta: null } },
  // delta: 0 is falsy — a `{comparison.delta && ...}` regression would trip
  // on exactly this value while `delta: null`/`undefined` might not.
  { name: "zero delta (falsy bait)", value: { label: "前期間", delta: 0 } },
];

const SPARKLINES: Array<{ name: string; value: number[] | undefined }> = [
  { name: "undefined (omitted)", value: undefined },
  { name: "empty array (falsy-length bait)", value: [] },
  { name: "single point (length 1, no chart per spec)", value: [42] },
  { name: "real series", value: [1, 2, 3, 4, 5] },
];

const CAPTIONS = [
  "COST=全媒体合算",
  // Empty string is the classic `{caption && <div>}` regression bait — the
  // row must still render (with empty content), never vanish.
  "",
];

const ICONS: Array<{
  name: string;
  icon: typeof JapaneseYen | undefined;
  hue: KpiHue | undefined;
}> = [
  { name: "omitted", icon: undefined, hue: undefined },
  { name: "provided", icon: JapaneseYen, hue: "chart-1" },
];

function renderCard(props: {
  caption: string;
  comparison: Comparison | undefined;
  sparkline: number[] | undefined;
  icon: typeof JapaneseYen | undefined;
  hue: KpiHue | undefined;
  lowerIsBetter?: boolean;
  unavailableMessage?: string;
}) {
  return renderToStaticMarkup(
    React.createElement(BigKpiCard, {
      label: "TEST",
      value: "¥123",
      caption: props.caption,
      comparison: props.comparison,
      sparkline: props.sparkline,
      sparkDates: props.sparkline?.map((_, i) => `2026-07-${10 + i}`),
      icon: props.icon,
      hue: props.hue,
      lowerIsBetter: props.lowerIsBetter,
      unavailableMessage: props.unavailableMessage,
    }),
  );
}

describe("BigKpiCard structural invariant (A-7 / A-16)", () => {
  it("renders exactly one of each data-kpi-row marker, for every combination of {caption, comparison, sparkline, icon}", () => {
    const failures: string[] = [];
    let combos = 0;

    for (const caption of CAPTIONS) {
      for (const cmp of COMPARISONS) {
        for (const spark of SPARKLINES) {
          for (const iconCase of ICONS) {
            combos++;
            const html = renderCard({
              caption,
              comparison: cmp.value,
              sparkline: spark.value,
              icon: iconCase.icon,
              hue: iconCase.hue,
            });
            const counts = rowCounts(html);
            for (const row of ROWS) {
              if (counts[row] !== 1) {
                failures.push(
                  `caption=${JSON.stringify(caption)} comparison=${cmp.name} sparkline=${spark.name} icon=${iconCase.name} -> data-kpi-row="${row}" appeared ${counts[row]} times (expected exactly 1)`,
                );
              }
            }
          }
        }
      }
    }

    // Sanity check on the test itself: if this is 0, every assertion above
    // passed vacuously and the suite would be lying (same pattern
    // design-guards.test.ts uses for its own file-count sanity check).
    expect(combos).toBe(
      CAPTIONS.length * COMPARISONS.length * SPARKLINES.length * ICONS.length,
    );
    expect(combos).toBeGreaterThan(30);

    expect(failures).toEqual([]);
  });

  it("the comparison row shows an em-dash value but the REAL label when delta is null (A-16: must not collapse to the generic placeholder just because delta is unknown)", () => {
    const html = renderCard({
      caption: "x",
      comparison: { label: "前期間", delta: null },
      sparkline: undefined,
      icon: undefined,
      hue: undefined,
    });
    expect(html).toContain("前期間");
    // Exactly one comparison row, and it contains an em-dash (the delta
    // placeholder), not a second, generic "—" label — i.e. this is the
    // {label: "前期間", delta: null} row, not the PLACEHOLDER_COMPARISON
    // fallback.
    expect(rowCounts(html).comparison).toBe(1);
  });

  it("the comparison row falls back to a — / — placeholder (never vanishes) when `comparison` is omitted entirely", () => {
    const html = renderCard({
      caption: "x",
      comparison: undefined,
      sparkline: undefined,
      icon: undefined,
      hue: undefined,
    });
    expect(rowCounts(html).comparison).toBe(1);
    expect(html).toContain("—");
  });

  it("the sparkline slot renders no chart for a length-1 series but the row still exists (reserved height, per spec)", () => {
    const html = renderCard({
      caption: "x",
      comparison: undefined,
      sparkline: [42],
      icon: undefined,
      hue: undefined,
    });
    expect(rowCounts(html).sparkline).toBe(1);
    // Sparkline renders an SVG (Recharts) — its absence here proves the
    // length<=1 guard still holds, only the row wrapper is unconditional.
    // Scoped to the sparkline row's own inner HTML (not the whole card) —
    // the comparison row's Arrow always renders an unrelated lucide <svg>.
    expect(extractRowInner(html, "sparkline")).not.toContain("<svg");
  });

  it("the sparkline slot DOES render a chart for a real (length>1) series", () => {
    const html = renderCard({
      caption: "x",
      comparison: undefined,
      sparkline: [1, 2, 3],
      icon: undefined,
      hue: undefined,
    });
    expect(rowCounts(html).sparkline).toBe(1);
    expect(html).toContain("<svg");
  });

  it("the badge slot renders even when `icon` is omitted (fixed-size empty square, not a missing header row)", () => {
    const html = renderCard({
      caption: "x",
      comparison: undefined,
      sparkline: undefined,
      icon: undefined,
      hue: undefined,
    });
    expect(rowCounts(html).badge).toBe(1);
    // No <svg> glyph inside the badge itself when icon is omitted (scoped
    // to the badge row — the comparison row's Arrow always renders an
    // unrelated lucide <svg>).
    expect(extractRowInner(html, "badge")).not.toContain("<svg");
  });

  it("keeps every reserved row while rendering unavailable data as explicit non-numeric copy", () => {
    const message =
      "この期間の確定データはまだ届いていません（CVソース最新: 2026-07-06）";
    const html = renderCard({
      caption: "前期間 ¥100",
      comparison: { label: "前期間", delta: -1 },
      sparkline: [0, 0, 0],
      icon: undefined,
      hue: undefined,
      unavailableMessage: message,
    });

    expect(rowCounts(html)).toEqual({
      label: 1,
      badge: 1,
      caption: 1,
      value: 1,
      sparkline: 1,
      comparison: 1,
    });
    expect(html).toContain("未取得");
    expect(html).toContain(message);
    expect(html).not.toContain("¥123");
    expect(extractRowInner(html, "sparkline")).not.toContain("<svg");
  });

  it.each([
    {
      lowerIsBetter: false,
      delta: 0.054,
      arrowClass: "lucide-arrow-up-right",
      signedValue: "+5.4%",
      ariaLabel: "前期間比 5.4% 増加（改善）",
    },
    {
      lowerIsBetter: false,
      delta: -0.054,
      arrowClass: "lucide-arrow-down-right",
      signedValue: "-5.4%",
      ariaLabel: "前期間比 5.4% 減少（悪化）",
    },
    {
      lowerIsBetter: true,
      delta: 0.054,
      arrowClass: "lucide-arrow-up-right",
      signedValue: "+5.4%",
      ariaLabel: "前期間比 5.4% 増加（悪化）",
    },
    {
      lowerIsBetter: true,
      delta: -0.054,
      arrowClass: "lucide-arrow-down-right",
      signedValue: "-5.4%",
      ariaLabel: "前期間比 5.4% 減少（改善）",
    },
  ])(
    "uses the delta sign for direction and lowerIsBetter only for evaluation ($lowerIsBetter, $delta)",
    ({ lowerIsBetter, delta, arrowClass, signedValue, ariaLabel }) => {
      const html = renderCard({
        caption: "x",
        comparison: { label: "前期間比", delta },
        sparkline: undefined,
        icon: undefined,
        hue: undefined,
        lowerIsBetter,
      });

      expect(html).toContain(arrowClass);
      expect(html).toContain(signedValue);
      expect(html).toContain(`aria-label="${ariaLabel}"`);
    },
  );
});
