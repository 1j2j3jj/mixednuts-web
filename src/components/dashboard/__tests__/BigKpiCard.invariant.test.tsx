import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
 * cards share label/caption/value/sparkline/comparison tracks through subgrid,
 * while the flex fallback keeps content top-aligned. Optional rows must remain
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
  it("assigns six mixed cards to the same five-track layout contract", () => {
    const html = renderToStaticMarkup(
      <div className="kpi-card-grid grid grid-cols-6">
        <BigKpiCard
          label="DENSE_A"
          value="¥123"
          caption="前期間 ¥100"
          comparison={{ label: "前期間", delta: 0.23 }}
          sparkline={[1, 2, 3]}
        />
        <BigKpiCard
          label="DENSE_B"
          value="¥456"
          caption="前期間 ¥500"
          comparison={{ label: "前期間", delta: -0.08 }}
        />
        <BigKpiCard
          label="SPARK_ONLY"
          value="789"
          caption="比較対象なし"
          sparkline={[3, 2, 4]}
        />
        <BigKpiCard
          label="SPARSE"
          value="¥0"
          caption="比較対象なし"
        />
        <BigKpiCard
          label="UNAVAILABLE"
          value="0"
          caption="比較対象なし"
          unavailableMessage="CVソース最新 2026-07-06"
        />
        <BigKpiCard
          label="INCALCULABLE"
          value="0"
          caption="前期間 0"
          comparison={{ label: "前期間比", delta: null }}
          sparkline={[0, 0, 0]}
        />
      </div>,
    );

    expect(rowCount(html, "label")).toBe(6);
    expect(rowCount(html, "caption")).toBe(6);
    expect(rowCount(html, "value")).toBe(6);
    expect(
      html.match(/data-kpi-layout="subgrid-flex-fallback"/g),
    ).toHaveLength(6);
    expect(html.match(/big-kpi-card h-full/g)).toHaveLength(6);
    expect(html).not.toContain("mt-auto");

    // Static rendering has no layout engine, so this test does not verify
    // geometry. It proves that every value is a direct named row and that the
    // shared stylesheet maps all five rows onto a real subgrid.
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/grid-row:\s*span 5/);
    expect(css).toMatch(/grid-template-rows:\s*subgrid/);
    expect(css).toMatch(
      /\.big-kpi-card__value\s*\{[\s\S]*?grid-row:\s*3/,
    );
    expect(css).toMatch(
      /\.big-kpi-card__sparkline\s*\{[\s\S]*?grid-row:\s*4/,
    );
    expect(css).toMatch(
      /\.big-kpi-card__comparison\s*\{[\s\S]*?grid-row:\s*5/,
    );
  });

  it("omits the comparison row when comparison is unavailable", () => {
    const html = renderCard({ caption: "比較対象なし" });
    expect(rowCount(html, "comparison")).toBe(0);
    expect(html).not.toContain("— —");
    expect(html).toContain("比較対象なし");
  });

  it("keeps an incalculable comparison out of the one-line caption", () => {
    const html = renderCard({
      caption: "前期間 0",
      comparison: { label: "前期間", delta: null },
    });
    expect(rowCount(html, "comparison")).toBe(0);
    expect(html).not.toContain("— —");
    expect(html).toContain("前期間 0");
    expect(html).not.toContain("比較できません");
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
    const message = "CVソース最新 2026-07-06";
    const html = renderCard({
      caption: "前期間 ¥100",
      comparison: { label: "前期間", delta: -1 },
      sparkline: [1, 2, 3],
      unavailableMessage: message,
    });

    expect(html).toContain("確定データ未着");
    expect(html).toContain(message);
    expect(html).toContain("min-h-4 truncate");
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
