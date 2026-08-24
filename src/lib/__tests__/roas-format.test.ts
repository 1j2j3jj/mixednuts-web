import { describe, expect, it } from "vitest";
import {
  formatRoas,
  ROAS_MULTIPLIER_THRESHOLD_PCT,
} from "@/lib/roas-format";

describe("formatRoas", () => {
  it("keeps percentages through the shared threshold", () => {
    expect(formatRoas(ROAS_MULTIPLIER_THRESHOLD_PCT)).toBe("1,000%");
  });

  it("switches oversized percentages to a multiplier", () => {
    expect(formatRoas(17_756)).toBe("×178");
  });
});
