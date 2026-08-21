import { describe, expect, it } from "vitest";
import { chakinCostPresentation } from "@/lib/chakin-cost-presentation";

describe("Chakin cost presentation", () => {
  it("keeps the summary and ads labels distinct and cross-references both definitions", () => {
    const summary = chakinCostPresentation("summary");
    const ads = chakinCostPresentation("ads");

    expect(summary.label).not.toBe(ads.label);
    expect(summary.note).toContain(ads.label);
    expect(ads.note).toContain(summary.label);
    expect(summary.label).toContain("広告チャネル");
    expect(summary.label).toContain("申込ベース");
    expect(summary.note).not.toContain("マート");
    expect(ads.label).toContain("媒体計上");
  });
});
