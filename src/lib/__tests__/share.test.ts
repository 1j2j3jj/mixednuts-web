import { describe, it, expect } from "vitest";
import { computeShare, shareToPercent } from "@/lib/share";

describe("computeShare", () => {
  it("computes a normal ratio", () => {
    expect(computeShare(78, 100)).toBeCloseTo(0.78);
  });

  it("returns null when the denominator is zero (A-27/chakin-style: real numerator, zero total)", () => {
    expect(computeShare(500, 0)).toBeNull();
  });

  it("returns null when the denominator is negative", () => {
    expect(computeShare(500, -10)).toBeNull();
  });

  it("returns null when the denominator is null or undefined", () => {
    expect(computeShare(500, null)).toBeNull();
    expect(computeShare(500, undefined)).toBeNull();
  });

  it("returns null when the numerator is null or undefined", () => {
    expect(computeShare(null, 100)).toBeNull();
    expect(computeShare(undefined, 100)).toBeNull();
  });

  it("returns null when either input is non-finite", () => {
    expect(computeShare(Infinity, 100)).toBeNull();
    expect(computeShare(50, Infinity)).toBeNull();
    expect(computeShare(NaN, 100)).toBeNull();
  });

  it("a row equal to the total is a 100% share", () => {
    expect(computeShare(100, 100)).toBe(1);
  });

  it("a zero-value row against a positive total is a legitimate 0% share (not null)", () => {
    expect(computeShare(0, 100)).toBe(0);
  });
});

describe("shareToPercent", () => {
  it("rounds to the nearest integer percent", () => {
    expect(shareToPercent(0.784)).toBe(78);
    expect(shareToPercent(0.786)).toBe(79);
  });

  it("passes null through", () => {
    expect(shareToPercent(null)).toBeNull();
  });

  it("clamps out-of-range ratios instead of rendering an impossible bar/label", () => {
    expect(shareToPercent(1.2)).toBe(100);
    expect(shareToPercent(-0.1)).toBe(0);
  });
});
