import { beforeEach, describe, expect, it, vi } from "vitest";

const createQueryJob = vi.fn();

vi.mock("@/lib/bigquery", () => ({
  getBigQuery: () => ({ createQueryJob }),
}));

import { upsertTargets } from "@/lib/masters";

describe("upsertTargets", () => {
  beforeEach(() => {
    createQueryJob.mockReset();
  });

  it("skips unchanged updates and returns detailed DML audit counts", async () => {
    const getQueryResults = vi.fn().mockResolvedValue([[]]);
    const getMetadata = vi.fn().mockResolvedValue([
      {
        statistics: {
          query: {
            dmlStats: {
              insertedRowCount: "1",
              updatedRowCount: "1",
              deletedRowCount: "0",
            },
          },
        },
      },
    ]);
    createQueryJob.mockResolvedValue([{ getQueryResults, getMetadata }]);

    const result = await upsertTargets(
      [
        {
          client_id: "hs",
          year_month: "2026-07-01",
          revenue_target: 100,
          cv_target: 2,
          ad_spend_budget: 50,
          roas_target_pct: 200,
          cpa_target: 25,
          notes: null,
        },
        {
          client_id: "ogc",
          year_month: "2026-07-01",
          revenue_target: 200,
          cv_target: 4,
          ad_spend_budget: 80,
          roas_target_pct: 250,
          cpa_target: 20,
          notes: "keep",
        },
        {
          client_id: "ogp",
          year_month: "2026-07-01",
          revenue_target: null,
          cv_target: null,
          ad_spend_budget: null,
          roas_target_pct: null,
          cpa_target: null,
          notes: null,
        },
      ],
      "admin@example.com",
    );

    expect(result).toEqual({ affected: 2, inserted: 1, updated: 1, unchanged: 1 });
    const options = createQueryJob.mock.calls[0][0];
    expect(options.query).toContain("WHEN MATCHED AND (");
    expect(options.query).toContain(
      "T.revenue_target IS DISTINCT FROM S.revenue_target",
    );
    expect(options.query).not.toContain("NOT MATCHED BY SOURCE");
    expect(options.params.cid0).toBe("hs");
    expect(options.params.cid1).toBe("ogc");
    expect(options.params.cid2).toBe("ogp");
  });
});
