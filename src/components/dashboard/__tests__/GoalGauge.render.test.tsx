import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GoalGauge from "@/components/dashboard/GoalGauge";

describe("GoalGauge presentation", () => {
  it("uses the same brand meter and neutral track for every tier", () => {
    const html = renderToStaticMarkup(
      <GoalGauge
        label="売上達成"
        actual="¥19,148,350"
        target="¥36,375,000"
        ratio={0.53}
        expectedProgress={0.65}
      />,
    );
    expect(html).toContain("bg-brand");
    expect(html).toContain("bg-muted");
    expect(html).not.toContain("bg-yellow-400");
    expect(html).not.toContain("bg-emerald-700");
    expect(html).not.toContain("bg-rose-700");
    expect(html).toContain("gap-x-2");
    expect(html).toContain("flex-wrap");
  });
});
