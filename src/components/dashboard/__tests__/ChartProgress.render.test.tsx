import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";

describe("in-progress chart rendering", () => {
  it("renders the final daily bucket with a hatch in the static preview path", () => {
    const html = renderToStaticMarkup(
      <DailyTrendChart
        data={[
          { date: "2026-08-20", cost: 1000, conversions: 1, conversionValue: 0, clicks: 10 },
          { date: "2026-08-21", cost: 1200, conversions: 2, conversionValue: 0, clicks: 12 },
        ]}
        inProgressDate="2026-08-21"
        width={640}
        height={240}
      />,
    );
    expect(html).toContain("<pattern");
    expect(html).toContain("縞: 進行中");
  });

  it("renders the current month with per-series hatch patterns", () => {
    const html = renderToStaticMarkup(
      <ChannelStackedBar
        data={[
          {
            yearMonth: "2026-07",
            channel: "Paid Search",
            sessions: 100,
            conversions: 2,
            revenue: 1000,
            secondary: {},
            newUsers: 0,
            returningUsers: 0,
          },
          {
            yearMonth: "2026-08",
            channel: "Paid Search",
            sessions: 80,
            conversions: 1,
            revenue: 800,
            secondary: {},
            newUsers: 0,
            returningUsers: 0,
          },
        ]}
        inProgressMonth="2026-08"
        width={640}
        height={240}
      />,
    );
    expect(html).toContain("<pattern");
    expect(html).toContain("縞: 進行中");
  });
});
