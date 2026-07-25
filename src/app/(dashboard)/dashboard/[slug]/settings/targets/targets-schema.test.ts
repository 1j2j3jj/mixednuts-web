import { describe, expect, it } from "vitest";
import { parseClientTargetsCsv } from "./targets-schema";

describe("parseClientTargetsCsv", () => {
  it("accepts a blank value as an explicit delete marker", () => {
    const result = parseClientTargetsCsv(
      "指標,チャネル,年月,値\n受注金額,全体,2026-07,\n",
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        metric: "受注金額",
        channel: "全体",
        year_month: "2026-07-01",
        value: null,
      },
    ]);
  });

  it("rejects duplicate keys for the whole batch", () => {
    const result = parseClientTargetsCsv(
      "指標,チャネル,年月,値\n受注金額,全体,2026-07,100\n受注金額,全体,2026-07,200\n",
    );
    expect(result.rows).toEqual([
      {
        metric: "受注金額",
        channel: "全体",
        year_month: "2026-07-01",
        value: 100,
      },
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors[0]).toContain("重複");
  });

  it("rejects invalid year-month and negative values", () => {
    const result = parseClientTargetsCsv(
      "指標,チャネル,年月,値\n受注金額,全体,2026-13,-1\n",
    );
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("年月"),
        expect.stringContaining("負値"),
      ]),
    );
  });
});
