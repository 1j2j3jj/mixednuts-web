import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ChannelTargetTable from "@/components/dashboard/ChannelTargetTable";

function rowHtml(html: string, channel: string): string {
  const labelIndex = html.indexOf(`>${channel}</`);
  if (labelIndex === -1) throw new Error(`row ${channel} not found`);
  const start = html.lastIndexOf("<tr", labelIndex);
  const end = html.indexOf("</tr>", labelIndex);
  return html.slice(start, end + 5);
}

describe("ChannelTargetTable monthly pace judgement", () => {
  it("renders × / △ / ✓ / ✓ across 40% / 65% / 74% / 105% when 65% of the month has elapsed", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChannelTargetTable, {
        expectedProgress: 0.65,
        rows: [
          { channel: "40pct", revenue: 40, revenueTarget: 100, conversions: 40, conversionsTarget: 100 },
          { channel: "65pct", revenue: 65, revenueTarget: 100, conversions: 65, conversionsTarget: 100 },
          { channel: "74pct", revenue: 74, revenueTarget: 100, conversions: 74, conversionsTarget: 100 },
          { channel: "105pct", revenue: 105, revenueTarget: 100, conversions: 105, conversionsTarget: 100 },
        ],
      }),
    );

    expect(rowHtml(html, "40pct")).toContain("lucide-x");
    expect(rowHtml(html, "65pct")).toContain("lucide-triangle-alert");
    expect(rowHtml(html, "74pct")).toContain("lucide-check");
    expect(rowHtml(html, "105pct")).toContain("lucide-check");
    expect(html).toContain("達成率（対月次目標）");
    expect(html).toContain("対ペース: 期待 65% / 実績 74%");
  });
});
