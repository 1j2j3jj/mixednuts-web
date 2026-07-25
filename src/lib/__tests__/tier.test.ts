import { describe, it, expect } from "vitest";
import { higherIsBetterTier, lowerIsBetterTier } from "@/lib/tier";

/**
 * Pure-function tests for the shared 3-tier threshold module (E-3, Phase E).
 * These thresholds used to be hand-duplicated across MediaTable.roasClass /
 * MediaCampaignTable.roasClass / DrillTable.roasClass / DrillTable.cpaClass /
 * ChannelTargetTable.achievementColour — this is the one place the cutoffs
 * (>=target / >=80% for higher-is-better, <=target / <=120% for
 * lower-is-better) are now asserted, so a future edit to any call site can't
 * silently drift the threshold without this failing.
 */

describe("higherIsBetterTier", () => {
  it("returns null when actual is missing or non-finite", () => {
    expect(higherIsBetterTier(null, 100)).toBeNull();
    expect(higherIsBetterTier(NaN, 100)).toBeNull();
    expect(higherIsBetterTier(Infinity, 100)).toBeNull();
  });

  it("returns null when there is no configured target (null or <=0)", () => {
    expect(higherIsBetterTier(150, null)).toBeNull();
    expect(higherIsBetterTier(150, 0)).toBeNull();
    expect(higherIsBetterTier(150, -10)).toBeNull();
  });

  it("returns 'good' at and above target", () => {
    expect(higherIsBetterTier(100, 100)).toBe("good");
    expect(higherIsBetterTier(150, 100)).toBe("good");
  });

  it("returns 'warning' in the [80%, target) band", () => {
    expect(higherIsBetterTier(80, 100)).toBe("warning");
    expect(higherIsBetterTier(99.9, 100)).toBe("warning");
  });

  it("returns 'bad' below 80% of target", () => {
    expect(higherIsBetterTier(79.9, 100)).toBe("bad");
    expect(higherIsBetterTier(0, 100)).toBe("bad");
  });
});

describe("lowerIsBetterTier", () => {
  it("returns null when actual is missing or non-finite", () => {
    expect(lowerIsBetterTier(null, 1000)).toBeNull();
    expect(lowerIsBetterTier(NaN, 1000)).toBeNull();
  });

  it("returns null when there is no configured target (null or <=0)", () => {
    expect(lowerIsBetterTier(500, null)).toBeNull();
    expect(lowerIsBetterTier(500, 0)).toBeNull();
  });

  it("returns 'good' at and below target", () => {
    expect(lowerIsBetterTier(1000, 1000)).toBe("good");
    expect(lowerIsBetterTier(500, 1000)).toBe("good");
  });

  it("returns 'warning' in the (target, 120%] band", () => {
    expect(lowerIsBetterTier(1100, 1000)).toBe("warning");
    expect(lowerIsBetterTier(1200, 1000)).toBe("warning");
  });

  it("returns 'bad' above 120% of target", () => {
    expect(lowerIsBetterTier(1200.1, 1000)).toBe("bad");
    expect(lowerIsBetterTier(5000, 1000)).toBe("bad");
  });
});
