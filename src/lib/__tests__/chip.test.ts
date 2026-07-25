import { describe, it, expect } from "vitest";
import {
  achievementTone,
  sumAchievement,
  meetsRoasTarget,
  computeWinRate,
  winRateTone,
} from "@/lib/chip";

describe("achievementTone", () => {
  it("is positive at or above 100% achievement", () => {
    expect(achievementTone(1)).toBe("positive");
    expect(achievementTone(1.5)).toBe("positive");
  });

  it("is warning between 80% and 100%", () => {
    expect(achievementTone(0.8)).toBe("warning");
    expect(achievementTone(0.99)).toBe("warning");
  });

  it("is negative below 80%", () => {
    expect(achievementTone(0.79)).toBe("negative");
    expect(achievementTone(0)).toBe("negative");
  });

  it("is null when the ratio itself is not computable (no-judgement case)", () => {
    expect(achievementTone(null)).toBeNull();
    expect(achievementTone(NaN)).toBeNull();
  });
});

describe("sumAchievement", () => {
  it("sums actual and target across rows and derives the ratio", () => {
    const totals = sumAchievement([
      { actual: 50, target: 100 },
      { actual: 30, target: 50 },
    ]);
    expect(totals.actual).toBe(80);
    expect(totals.target).toBe(150);
    expect(totals.ratio).toBeCloseTo(80 / 150);
  });

  it("excludes null-target rows from the target sum but keeps their actual (MSEC/unmapped-channel style rows)", () => {
    const totals = sumAchievement([
      { actual: 50, target: 100 },
      { actual: 20, target: null },
    ]);
    expect(totals.actual).toBe(70);
    expect(totals.target).toBe(100);
    expect(totals.ratio).toBeCloseTo(0.7);
  });

  it("ratio is null when no row carries a target at all (MSEC: no targets anywhere)", () => {
    const totals = sumAchievement([
      { actual: 50, target: null },
      { actual: 20, target: null },
    ]);
    expect(totals.ratio).toBeNull();
  });

  it("ratio is null when the summed target is zero", () => {
    const totals = sumAchievement([{ actual: 50, target: 0 }]);
    expect(totals.ratio).toBeNull();
  });

  it("handles an empty row set without throwing", () => {
    const totals = sumAchievement([]);
    expect(totals).toEqual({ actual: 0, target: 0, ratio: null });
  });
});

describe("meetsRoasTarget", () => {
  it("true when actual meets or exceeds target", () => {
    expect(meetsRoasTarget(1300, 1300)).toBe(true);
    expect(meetsRoasTarget(1500, 1300)).toBe(true);
  });

  it("false when actual is below target", () => {
    expect(meetsRoasTarget(1000, 1300)).toBe(false);
  });

  it("false when target is null, zero, or negative (no target configured — MSEC)", () => {
    expect(meetsRoasTarget(1500, null)).toBe(false);
    expect(meetsRoasTarget(1500, 0)).toBe(false);
    expect(meetsRoasTarget(1500, -1)).toBe(false);
  });

  it("false when actual is null or non-finite", () => {
    expect(meetsRoasTarget(null, 1300)).toBe(false);
  });
});

describe("computeWinRate", () => {
  it("computes hits/total", () => {
    expect(computeWinRate(9, 12)).toBeCloseTo(0.75);
  });

  it("returns null when total is zero (no rows to judge — e.g. an empty media set)", () => {
    expect(computeWinRate(0, 0)).toBeNull();
  });

  it("returns null for an impossible hits/total combination rather than a misleading number", () => {
    expect(computeWinRate(-1, 5)).toBeNull();
    expect(computeWinRate(6, 5)).toBeNull();
  });
});

describe("winRateTone", () => {
  it("positive at 70%+", () => {
    expect(winRateTone(0.75)).toBe("positive");
  });

  it("warning between 40% and 70%", () => {
    expect(winRateTone(0.4)).toBe("warning");
    expect(winRateTone(0.55)).toBe("warning");
  });

  it("negative below 40%", () => {
    expect(winRateTone(0.1)).toBe("negative");
  });

  it("null when the rate itself is not computable (no-judgement case, e.g. MSEC with no ROAS target)", () => {
    expect(winRateTone(null)).toBeNull();
  });
});
