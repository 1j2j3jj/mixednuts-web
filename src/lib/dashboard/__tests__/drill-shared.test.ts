import { describe, it, expect } from "vitest";
import {
  bucketKey,
  resolveDrillScope,
  buildJoin,
  aggregateDrillRows,
  buildDrillCsvRows,
  buildDrillCsvHeaders,
  csvLabelHeaderForLevel,
} from "../drill-shared";
import type { DailyRow } from "@/lib/sources/raw";
import type { Ga4CampaignRow, Ga4AdgroupRow } from "@/lib/sources/ga4";
import type { ResolvedRange } from "@/lib/range";

/**
 * Unit coverage for the drill-tab aggregation logic extracted to this
 * module (2026-07-26, G-3 payload fix). These are the exact functions both
 * drill/page.tsx (on-screen table) and drill/export/route.ts (CSV) call —
 * proving them correct here is what lets the two surfaces trust each
 * other's output without re-deriving it independently.
 */

function row(overrides: Partial<DailyRow> = {}): DailyRow {
  return {
    media: "Google",
    date: "2026-07-01",
    campaignId: "cmp-1",
    campaignName: "Campaign One",
    adgroupId: "adg-1",
    adgroupName: "Adgroup One",
    currency: "JPY",
    cost: 1000,
    impressions: 100,
    clicks: 10,
    conversions: 1,
    conversionValue: 5000,
    ...overrides,
  };
}

function rr(start: string, end: string): ResolvedRange {
  return {
    anchor: end,
    preset: "custom",
    compare: "none",
    current: { start, end },
    previous: null,
    compareLabel: "比較なし",
    presetLabel: "カスタム",
  };
}

describe("bucketKey", () => {
  it("day granularity returns the date unchanged", () => {
    expect(bucketKey("2026-07-15", "day")).toBe("2026-07-15");
  });
  it("month granularity truncates to yyyy-mm", () => {
    expect(bucketKey("2026-07-15", "month")).toBe("2026-07");
  });
  it("week granularity returns the Monday of that ISO week", () => {
    // 2026-07-15 is a Wednesday.
    expect(bucketKey("2026-07-15", "week")).toBe("2026-07-13");
  });
});

describe("resolveDrillScope", () => {
  const rows: DailyRow[] = [
    row({ media: "Google", date: "2026-07-01", cost: 100 }),
    row({
      media: "Yahoo",
      date: "2026-07-02",
      cost: 200,
      campaignId: "cmp-2",
      campaignName: "Y Campaign",
    }),
    row({ media: "Google", date: "2026-08-01", cost: 999 }), // outside range
  ];

  it("no facet filter -> media level, scoped to the date range only", () => {
    const scope = resolveDrillScope(rows, rr("2026-07-01", "2026-07-31"), {});
    expect(scope.level).toBe("media");
    expect(scope.filtered).toHaveLength(2);
    expect(scope.mediaFilter).toBe("");
    expect(scope.scopeMedia).toEqual(new Set(["Google", "Yahoo"]));
  });

  it("media filter -> campaign level, filtered rows narrow to that media", () => {
    const scope = resolveDrillScope(rows, rr("2026-07-01", "2026-07-31"), {
      media: "Google",
    });
    expect(scope.level).toBe("campaign");
    expect(scope.filtered).toHaveLength(1);
    expect(scope.isGoogleOnlyScope).toBe(true);
  });

  it("adgroup filter -> bucket level and needAdgroupData true (Google-only scope)", () => {
    const scope = resolveDrillScope(rows, rr("2026-07-01", "2026-07-31"), {
      media: "Google",
      campaign: "cmp-1",
      adgroup: "adg-1",
    });
    expect(scope.level).toBe("bucket");
    expect(scope.needAdgroupData).toBe(true);
  });

  it("campaign level -> needAdgroupData is false (only adgroup level or an ADG filter on a Google-only scope needs ADG data)", () => {
    const scope = resolveDrillScope(rows, rr("2026-07-01", "2026-07-31"), {
      media: "Google",
    });
    expect(scope.level).toBe("campaign");
    expect(scope.needAdgroupData).toBe(false);
  });
});

describe("buildJoin + aggregateDrillRows", () => {
  const rows: DailyRow[] = [
    row({
      media: "Google",
      date: "2026-07-01",
      cost: 100,
      campaignId: "cmp-1",
    }),
    row({ media: "Google", date: "2026-07-01", cost: 50, campaignId: "cmp-1" }),
    row({
      media: "Yahoo",
      date: "2026-07-02",
      cost: 200,
      campaignId: "cmp-2",
      campaignName: "Y Campaign",
    }),
  ];
  const ga4Campaigns: Ga4CampaignRow[] = [
    {
      date: "2026-07-01",
      source: "google",
      medium: "cpc",
      media: "Google",
      campaignId: "cmp-1",
      campaignName: "Campaign One",
      matchKey: "cmp-1",
      sessions: 40,
      conversions: 3,
      revenue: 15000,
    },
  ];
  const ga4Adgroups: Ga4AdgroupRow[] = [];

  it("aggregates media-level rows by (media × bucket), summing spend across duplicate rows", () => {
    const join = buildJoin(ga4Campaigns, ga4Adgroups, "day");
    const table = aggregateDrillRows(rows, "day", "media", join);
    const google = table.find((r) => r.key === "Google");
    expect(google?.spend).toBe(150); // 100 + 50, same bucket
    expect(table).toHaveLength(2); // Google + Yahoo, one bucket each
  });

  it("attaches the GA4 join at media level via mediaByBucket", () => {
    const join = buildJoin(ga4Campaigns, ga4Adgroups, "day");
    const table = aggregateDrillRows(rows, "day", "media", join);
    const google = table.find((r) => r.key === "Google");
    expect(google?.ga4Sessions).toBe(40);
    expect(google?.ga4Conversions).toBe(3);
    expect(google?.ga4Revenue).toBe(15000);
    const yahoo = table.find((r) => r.key === "Yahoo");
    // No GA4 campaign row for Yahoo/2026-07-02 -> stays null, not 0/undefined
    // (the DrillTable / CSV "no data" convention depends on this being null).
    expect(yahoo?.ga4Sessions).toBeNull();
  });

  it("row count is the combinatorial product of distinct(level key) × distinct(bucket) — this is exactly what makes the payload grow with period length / drill depth (G-3)", () => {
    const wideRows: DailyRow[] = [];
    for (let d = 1; d <= 10; d++) {
      for (const media of ["Google", "Yahoo", "Microsoft"]) {
        wideRows.push(
          row({ media, date: `2026-07-${String(d).padStart(2, "0")}` }),
        );
      }
    }
    const join = buildJoin([], [], "day");
    const table = aggregateDrillRows(wideRows, "day", "media", join);
    expect(table).toHaveLength(10 * 3); // 10 days × 3 media, not capped
  });
});

describe("buildDrillCsvRows / buildDrillCsvHeaders — CSV shape parity with the on-screen table", () => {
  it("maps every DrillRow field into the CSV row shape, substituting empty string for null GA4 fields", () => {
    const csvRows = buildDrillCsvRows([
      {
        key: "Google",
        subKey: undefined,
        date: "2026-07-01",
        media: "Google",
        spend: 100,
        clicks: 10,
        impressions: 200,
        conversions: 1,
        conversionValue: 5000,
        ga4Sessions: null,
        ga4Conversions: null,
        ga4Revenue: null,
      },
    ]);
    expect(csvRows).toEqual([
      {
        date: "2026-07-01",
        label: "Google",
        subKey: "",
        media: "Google",
        spend: 100,
        impressions: 200,
        clicks: 10,
        conversions: 1,
        conversionValue: 5000,
        ga4Sessions: "",
        ga4Conversions: "",
        ga4Revenue: "",
      },
    ]);
  });

  it("row count is never capped — CSV export must carry every aggregated row (hard constraint: complete dataset export)", () => {
    const table = Array.from({ length: 5000 }, (_, i) => ({
      key: `entity-${i}`,
      subKey: undefined,
      date: "2026-07-01",
      media: "Google",
      spend: 1,
      clicks: 1,
      impressions: 1,
      conversions: 1,
      conversionValue: 1,
      ga4Sessions: null,
      ga4Conversions: null,
      ga4Revenue: null,
    }));
    expect(buildDrillCsvRows(table)).toHaveLength(5000);
  });

  it("csvLabelHeaderForLevel + buildDrillCsvHeaders agree on the entity-column label per level", () => {
    for (const level of ["media", "campaign", "adgroup", "bucket"] as const) {
      const headers = buildDrillCsvHeaders(level);
      expect(headers[1]).toBe(csvLabelHeaderForLevel(level));
    }
    expect(buildDrillCsvHeaders("media")).toEqual([
      "期間",
      "媒体",
      "ID",
      "媒体",
      "COST",
      "Imp",
      "Click",
      "媒体CV",
      "媒体売上",
      "SESSION",
      "GA_CV",
      "GA売上",
    ]);
  });
});
