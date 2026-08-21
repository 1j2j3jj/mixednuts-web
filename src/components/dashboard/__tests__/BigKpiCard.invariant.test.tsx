import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BigKpiCard, {
  type Comparison,
} from "@/components/dashboard/BigKpiCard";

/**
 * Visual invariant proof for BigKpiCard (A-7 / A-16).
 *
 * This test intentionally replaced the former "every optional row must exist"
 * assertion. That assertion preserved equal card height by drawing empty DOM
 * slots, which is the behaviour P1 removes. The real invariant is that sibling
 * cards share a row height: `.kpi-card-grid` stretches every card, subgrid
 * aligns the label/caption/value tracks, and the flex fallback keeps the value
 * block bottom-aligned when subgrid is unavailable. Optional rows must now be
 * absent from the markup when they have no information to show.
 */

function renderCard(props: {
  caption?: string;
  comparison?: Comparison;
  sparkline?: number[];
  lowerIsBetter?: boolean;
  unavailableMessage?: string;
}) {
  return renderToStaticMarkup(
    React.createElement(BigKpiCard, {
      label: "TEST",
      value: "¥123",
      caption: props.caption ?? "比較対象なし",
      comparison: props.comparison,
      sparkline: props.sparkline,
      lowerIsBetter: props.lowerIsBetter,
      unavailableMessage: props.unavailableMessage,
    }),
  );
}

function rowCount(html: string, row: string): number {
  return (html.match(new RegExp(`data-kpi-row="${row}"`, "g")) ?? []).length;
}

describe("BigKpiCard visual invariant", () => {
  it("keeps sparse and dense sibling cards on the same layout contract", () => {
    const html = renderToStaticMarkup(
      <div className="kpi-card-grid grid grid-cols-2">
        <BigKpiCard
          label="DENSE"
          value="¥123"
          caption="前期間 ¥100"
          comparison={{ label: "前期間", delta: 0.23 }}
          sparkline={[1, 2, 3]}
        />
        <BigKpiCard
          label="SPARSE"
          value="¥0"
          caption="比較対象なし"
        />
      </div>,
    );

    expect(rowCount(html, "label")).toBe(2);
    expect(rowCount(html, "caption")).toBe(2);
    expect(rowCount(html, "value")).toBe(2);
    expect(
      html.match(/data-kpi-layout="subgrid-flex-fallback"/g),
    ).toHaveLength(2);
    expect(html.match(/big-kpi-card h-full/g)).toHaveLength(2);
    expect(html.match(/big-kpi-card__value-block mt-auto/g)).toHaveLength(2);
  });

  it("omits the comparison row when comparison is unavailable", () => {
    const html = renderCard({ caption: "比較対象なし" });
    expect(rowCount(html, "comparison")).toBe(0);
    expect(html).not.toContain("— —");
    expect(html).toContain("比較対象なし");
  });

  it("keeps a real comparison label when only its delta is incalculable", () => {
    const html = renderCard({
      comparison: { label: "前期間", delta: null },
    });
    expect(rowCount(html, "comparison")).toBe(1);
    expect(html).toContain("前期間");
    expect(html).toContain("比較不能");
  });

  it.each([
    { series: undefined, name: "missing" },
    { series: [], name: "empty" },
    { series: [42], name: "single point" },
    { series: [0, 0, 0], name: "all zero" },
  ])("omits the sparkline row for a $name series", ({ series }) => {
    const html = renderCard({ sparkline: series });
    expect(rowCount(html, "sparkline")).toBe(0);
  });

  it("renders a sparkline row for a multi-point series containing data", () => {
    const html = renderCard({ sparkline: [0, 2, 3] });
    expect(rowCount(html, "sparkline")).toBe(1);
    // ResponsiveContainer intentionally resolves to a zero-size shell during
    // static rendering; row presence proves BigKpiCard passed the series on.
    expect(html).toContain("recharts-responsive-container");
  });

  it("renders unavailable data as explicit copy without optional rows", () => {
    const message =
      "この期間の確定データはまだ届いていません（CVソース最新: 2026-07-06）";
    const html = renderCard({
      caption: "前期間 ¥100",
      comparison: { label: "前期間", delta: -1 },
      sparkline: [1, 2, 3],
      unavailableMessage: message,
    });

    expect(html).toContain("未取得");
    expect(html).toContain(message);
    expect(html).not.toContain("¥123");
    expect(rowCount(html, "sparkline")).toBe(0);
    expect(rowCount(html, "comparison")).toBe(0);
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
    "uses delta direction and lowerIsBetter evaluation ($lowerIsBetter, $delta)",
    ({ lowerIsBetter, delta, arrowClass, signedValue, ariaLabel }) => {
      const html = renderCard({
        comparison: { label: "前期間比", delta },
        lowerIsBetter,
      });

      expect(html).toContain(arrowClass);
      expect(html).toContain(signedValue);
      expect(html).toContain(`aria-label="${ariaLabel}"`);
    },
  );
});
