import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GoalGauge from "@/components/dashboard/GoalGauge";

describe("GoalGauge warning presentation", () => {
  it("uses bright yellow on a contrasting neutral track and keeps header spacing", () => {
    const html = renderToStaticMarkup(
      <GoalGauge
        label="売上達成"
        actual="¥19,148,350"
        target="¥36,375,000"
        ratio={0.53}
        expectedProgress={0.65}
      />,
    );
    expect(html).toContain("bg-yellow-400");
    expect(html).toContain("bg-slate-700");
    expect(html).toContain("gap-x-2");
    expect(html).toContain("flex-wrap");
  });
});
