import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf-8");
}

describe("in-progress chart rendering", () => {
  it("keeps DailyTrendChart on one Recharts path with one hatch definition", () => {
    const code = source("src/components/dashboard/DailyTrendChart.tsx");

    expect(code).not.toContain("if (width && height)");
    expect(code).not.toContain("<svg");
    expect(code.match(/<pattern/g)).toHaveLength(1);
    expect(code).toContain("url(#${inProgressPatternId})");
  });

  it("keeps ChannelStackedBar on one Recharts path with per-series hatches", () => {
    const code = source("src/components/dashboard/ChannelStackedBar.tsx");

    expect(code).not.toContain("if (width && height)");
    expect(code).not.toContain("<svg");
    expect(code.match(/<pattern/g)).toHaveLength(1);
    expect(code).toContain("url(#${inProgressPatternBase}-${idx})");
  });
});
