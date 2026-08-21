import { describe, expect, it } from "vitest";
import {
  formatCompactAxis,
  formatCompactRevenueAxis,
} from "@/lib/chart-format";

describe("chart axis formatting", () => {
  it("does not append k below 1000", () => {
    expect(formatCompactAxis(0)).toBe("0");
    expect(formatCompactAxis(999)).toBe("999");
    expect(formatCompactAxis(999.6)).toBe("1,000");
    expect(formatCompactAxis(0, true)).toBe("¥0");
    expect(formatCompactRevenueAxis(875)).toBe("¥875");
  });

  it("uses compact units for larger values", () => {
    expect(formatCompactAxis(20_000)).toBe("20k");
    expect(formatCompactAxis(20_000, true)).toBe("¥20k");
    expect(formatCompactRevenueAxis(2_000_000)).toBe("¥2M");
  });
});
