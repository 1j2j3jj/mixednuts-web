import { describe, it, expect } from "vitest";
import { fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

/**
 * Phase D — "cover the formatters' unknown-vs-zero distinction" (WORKTREE
 * task). The formatters themselves already null-check correctly; what this
 * locks down is that `null`/`undefined` (unknown) and `0` (a real measured
 * zero) never collapse to the same rendered string — the entire premise the
 * absence vocabulary depends on upstream call sites honouring.
 */

describe("fmtInt — unknown vs measured zero", () => {
  it("renders a real zero as '0', not an em-dash", () => {
    expect(fmtInt(0)).toBe("0");
  });
  it("renders null/undefined (unknown) as an em-dash, never '0'", () => {
    expect(fmtInt(null)).toBe("—");
    expect(fmtInt(undefined)).toBe("—");
  });
  it("the two are never the same string", () => {
    expect(fmtInt(0)).not.toBe(fmtInt(null));
  });
});

describe("fmtJpy — unknown vs measured zero", () => {
  it("renders a real zero as '¥0'", () => {
    expect(fmtJpy(0)).toBe("¥0");
  });
  it("renders unknown as an em-dash", () => {
    expect(fmtJpy(null)).toBe("—");
  });
});

describe("fmtPct / fmtRatioPct — unknown vs measured zero", () => {
  it("renders a real zero rate distinctly from unknown", () => {
    expect(fmtPct(0)).not.toBe(fmtPct(null));
    expect(fmtPct(0)).toBe("0.0%");
    expect(fmtPct(null)).toBe("—");
  });
  it("fmtRatioPct: same distinction for pre-multiplied percentage inputs", () => {
    expect(fmtRatioPct(0)).toBe("0%");
    expect(fmtRatioPct(null)).toBe("—");
  });
});

describe("safeDiv — the one place that correctly manufactures 'unknown' rather than a division artifact", () => {
  it("returns null (unknown) when the denominator is 0, not NaN/Infinity", () => {
    expect(safeDiv(100, 0)).toBeNull();
  });
  it("returns null when either operand is unknown", () => {
    expect(safeDiv(null, 10)).toBeNull();
    expect(safeDiv(10, null)).toBeNull();
  });
  it("returns a real 0 when the numerator genuinely is 0 over a real denominator — distinct from the null cases above", () => {
    expect(safeDiv(0, 10)).toBe(0);
  });
});
