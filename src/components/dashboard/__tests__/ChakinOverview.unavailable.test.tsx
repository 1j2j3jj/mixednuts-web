import { describe, expect, it } from "vitest";
import { resolveConfirmedKpiRange } from "@/components/dashboard/ChakinOverview";

describe("ChakinOverview confirmed KPI range", () => {
  it("returns no range when the common confirmed end is before the selected period", () => {
    expect(
      resolveConfirmedKpiRange(
        { start: "2026-08-01", end: "2026-08-21" },
        "2026-07-06",
      ),
    ).toBeNull();
  });

  it("clips a valid overlapping range to the common confirmed end", () => {
    expect(
      resolveConfirmedKpiRange(
        { start: "2026-07-01", end: "2026-07-31" },
        "2026-07-06",
      ),
    ).toEqual({ start: "2026-07-01", end: "2026-07-06" });
  });
});
