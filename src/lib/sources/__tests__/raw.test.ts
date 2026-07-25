import { describe, it, expect } from "vitest";
import {
  parseSheetRows,
  toCachedRow,
  fromCachedRow,
  projectForCache,
  estimateCacheBytes,
  getDailyRowsForSheet,
  latestDate,
  RAW_CACHE_LOOKBACK_DAYS,
  RAW_CACHE_SIZE_SAFETY_BYTES,
  type DailyRow,
  type WindowedCachePayload,
  type RawSheetFetchDeps,
} from "@/lib/sources/raw";
import type { SheetFetchResult } from "@/lib/sheets";

/**
 * A-27 (2026-07-25) — the ads raw sheet exceeded Next's 2MB unstable_cache
 * write limit (OGC 6.29MB / OGP 7.51MB full-history, measured live), which
 * silently disabled caching on every request and crashed rendering via an
 * uncatchable unhandledRejection. See raw.ts top-of-file comment and
 * projects/mixednuts-web/_reports/2026-07-24_dashboard-phaseA-defect-ledger.md
 * 追記3.
 *
 * These tests cover the pure projection/filter logic and the
 * cache-write-failure degrade-gracefully path, per the task brief. They do
 * NOT touch live Google Sheets or a real Next.js request context —
 * `unstable_cache` throws an "incrementalCache missing" invariant outside
 * one (confirmed empirically), which is exactly why getDailyRowsForSheet
 * takes injectable fetch deps.
 */

function mkRow(overrides: Partial<DailyRow> = {}): DailyRow {
  return {
    media: "Google",
    date: "2026-07-01",
    campaignId: "CPN-1",
    campaignName: "01_Google検索_指名_単体",
    adgroupId: "ADG-1",
    adgroupName: "01_Google検索_指名_単体_AG",
    currency: "JPY",
    cost: 12000,
    impressions: 18000,
    clicks: 900,
    conversions: 40,
    conversionValue: 1_800_000,
    ...overrides,
  };
}

describe("parseSheetRows", () => {
  it("skips the header row and blank rows, trims/normalises fields", () => {
    const values = [
      [
        "日",
        "媒体",
        "CPN ID",
        "CPN",
        "ADG ID",
        "ADG",
        "通貨",
        "費用",
        "imp",
        "click",
        "CV",
        "CV値",
      ],
      [
        "2026-07-01",
        " Google ",
        "[CPN-1]",
        "検索_指名",
        "(ADG-1)",
        "AG名",
        "JPY",
        "1000",
        "2000",
        "10",
        "1",
        "5000",
      ],
      ["", "", "", "", "", "", "", "", "", "", "", ""], // blank row
      [
        "2026/7/2",
        "meta",
        "CPN-2",
        "検索_一般",
        "ADG-2",
        "AG2",
        "JPY",
        "500",
        "1000",
        "5",
        "0",
        "0",
      ],
    ];
    const rows = parseSheetRows(values);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "2026-07-01",
      media: "Google",
      campaignId: "CPN-1", // brackets stripped
      cost: 1000,
    });
    expect(rows[1].date).toBe("2026-07-02"); // "/" date normalised
  });

  it("returns [] for an empty sheet (no header even)", () => {
    expect(parseSheetRows([])).toEqual([]);
  });

  it("returns [] when only the header row is present (e.g. Chakin pre-export)", () => {
    expect(parseSheetRows([["日", "媒体"]])).toEqual([]);
  });
});

describe("latestDate", () => {
  it("returns the max date across rows", () => {
    const rows = [
      mkRow({ date: "2026-07-01" }),
      mkRow({ date: "2026-07-24" }),
      mkRow({ date: "2026-07-10" }),
    ];
    expect(latestDate(rows)).toBe("2026-07-24");
  });
  it("returns null for an empty list", () => {
    expect(latestDate([])).toBeNull();
  });
  it("ignores rows with an empty date (unparseable source date)", () => {
    expect(
      latestDate([mkRow({ date: "" }), mkRow({ date: "2026-01-01" })]),
    ).toBe("2026-01-01");
  });
});

describe("toCachedRow / fromCachedRow round-trip", () => {
  it("preserves every field except currency, which is reconstructed as JPY", () => {
    const row = mkRow({ currency: "USD" }); // even a non-JPY source value...
    const cached = toCachedRow(row);
    const restored = fromCachedRow(cached);
    expect(restored).toEqual({ ...row, currency: "JPY" }); // ...comes back as JPY (dead field, never read)
  });

  it("the cached tuple has no field named currency (positional, not object)", () => {
    const cached = toCachedRow(mkRow());
    expect(Array.isArray(cached)).toBe(true);
    expect(cached).toHaveLength(11); // 12 DailyRow fields minus currency
  });
});

describe("projectForCache — window filtering", () => {
  it("keeps only rows with date >= windowStartInclusive", () => {
    const rows = [
      mkRow({ date: "2026-01-01" }),
      mkRow({ date: "2026-06-30" }),
      mkRow({ date: "2026-07-01" }),
      mkRow({ date: "2026-07-24" }),
    ];
    const projected = projectForCache(rows, "2026-07-01");
    expect(projected.map((r) => r[1])).toEqual(["2026-07-01", "2026-07-24"]);
  });

  it("drops rows with no parseable date", () => {
    const rows = [mkRow({ date: "" }), mkRow({ date: "2026-07-24" })];
    expect(projectForCache(rows, "2026-01-01")).toHaveLength(1);
  });

  it("is a no-op on row content beyond dropping currency (spot-check)", () => {
    const row = mkRow({ date: "2026-07-24" });
    const [projected] = projectForCache([row], "2026-01-01");
    expect(projected).toEqual(toCachedRow(row));
  });
});

/**
 * Generates a synthetic sheet shaped like the real OGP export (measured
 * live 2026-07-25: 56,556 rows / 7.51MB full-history object shape, spanning
 * 2024-04-27 -> 2026-07-25, ~69 rows/day across 8 campaigns/media). Kept
 * self-contained (no network) but realistic in row count, date span, and
 * string-field lengths so the size assertions below are meaningful rather
 * than trivially true on toy data.
 */
function synthesizeOgpScaleRows(): DailyRow[] {
  const MEDIA = ["Google", "Microsoft", "Yahoo", "meta"];
  const CAMPAIGNS = [
    "01_Google検索_指名_単体_オリジナルグッズ",
    "03_Google検索_一般_ノベルティ制作",
    "16_Google_Pmax_バッグ_EC_全国配送対応",
    "01_Microsoft検索_指名_ブランド保護",
    "16_Microsoft_Pmax_EC_リターゲティング",
    "01_Yahoo検索_指名_かけ合わせパターン",
    "01_meta広告_Advantage+_Shopping_カタログ連携",
  ];
  const start = new Date("2024-04-27T00:00:00Z");
  const end = new Date("2026-07-25T00:00:00Z");
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const rows: DailyRow[] = [];
  for (let d = 0; d <= days; d++) {
    const date = new Date(start.getTime() + d * 86_400_000)
      .toISOString()
      .slice(0, 10);
    for (let c = 0; c < CAMPAIGNS.length; c++) {
      for (let g = 0; g < 5; g++) {
        // ~69 rows/day matches the measured OGP density (56556 rows / 820 days).
        rows.push(
          mkRow({
            media: MEDIA[c % MEDIA.length],
            date,
            campaignId: `CPN-${c}`,
            campaignName: CAMPAIGNS[c],
            adgroupId: `ADG-${c}-${g}`,
            adgroupName: `${CAMPAIGNS[c]}_AG${g}_広告グループ名`,
            cost: 1000 + ((d + c + g) % 50) * 137,
            impressions: 2000 + ((d + c + g) % 90) * 211,
            clicks: 10 + ((d + c) % 30),
            conversions: (d + g) % 5,
            conversionValue: ((d + g) % 5) * 45000,
          }),
        );
      }
    }
  }
  return rows;
}

describe("A-27: oversize input shrinks below the cache-write threshold", () => {
  const fullHistory = synthesizeOgpScaleRows();

  it("fixture is genuinely oversize (sanity check the test proves something)", () => {
    // Full un-windowed history, projected, must already exceed Next's 2MB
    // data-cache ceiling — otherwise this test wouldn't be exercising A-27.
    const fullProjected = projectForCache(fullHistory, "0000-01-01");
    expect(estimateCacheBytes(fullProjected)).toBeGreaterThan(2_000_000);
  });

  it("windowing to RAW_CACHE_LOOKBACK_DAYS brings the payload well under Next's 2MB ceiling", () => {
    const anchor = latestDate(fullHistory)!;
    const windowStart = new Date(
      new Date(`${anchor}T00:00:00Z`).getTime() -
        RAW_CACHE_LOOKBACK_DAYS * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    const windowed = projectForCache(fullHistory, windowStart);
    const bytes = estimateCacheBytes(windowed);

    expect(bytes).toBeLessThan(RAW_CACHE_SIZE_SAFETY_BYTES); // our own safety-valve threshold
    expect(bytes).toBeLessThan(2_000_000); // Next's actual hard ceiling
    // "far under", not a squeeze — assert real headroom, not just "< cap".
    expect(bytes).toBeLessThan(1_200_000); // <60% of the 2MB cap
  });

  it("estimateCacheBytes flags a too-large windowed payload above the safety threshold", () => {
    // A pathological case: even the bounded window ends up large (e.g. a
    // sudden data-volume spike). The safety valve must still catch it.
    const anchor = latestDate(fullHistory)!;
    const wideStart = new Date(
      new Date(`${anchor}T00:00:00Z`).getTime() - 400 * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    const wide = projectForCache(fullHistory, wideStart);
    expect(estimateCacheBytes(wide)).toBeGreaterThan(
      RAW_CACHE_SIZE_SAFETY_BYTES,
    );
  });
});

describe("A-27: cache-write failure path returns data rather than throwing", () => {
  const sheetId = "sheet-x";
  const range = "Google_AdGroup_Raw!A:L";
  const liveRows: SheetFetchResult = {
    values: [
      [
        "日",
        "媒体",
        "CPN ID",
        "CPN",
        "ADG ID",
        "ADG",
        "通貨",
        "費用",
        "imp",
        "click",
        "CV",
        "CV値",
      ],
      [
        "2026-07-24",
        "Google",
        "CPN-1",
        "検索_指名",
        "ADG-1",
        "AG1",
        "JPY",
        "1000",
        "2000",
        "10",
        "1",
        "5000",
      ],
    ],
    fetchedAt: 1_700_000_000_000,
    isMock: false,
  };

  it("when the safety valve marks the cache payload tooLargeForCache, falls back to a live fetch and returns real data (does not throw, does not return empty)", async () => {
    let liveFetchCalls = 0;
    const deps: RawSheetFetchDeps = {
      fetchWindowed: async (): Promise<WindowedCachePayload> => ({
        rows: [],
        anchor: "2026-07-24",
        fetchedAt: Date.now(),
        isMock: false,
        tooLargeForCache: true, // simulates the A-27 safety valve tripping
      }),
      fetchLive: async () => {
        liveFetchCalls++;
        return liveRows;
      },
    };

    const result = await getDailyRowsForSheet(
      sheetId,
      range,
      { preset: "thisMonth", cmp: "prev" },
      deps,
    );

    expect(liveFetchCalls).toBe(1); // fell back to live, exactly once
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ campaignId: "CPN-1", cost: 1000 });
    expect(result.warnings.some((w) => /failed/i.test(w))).toBe(false);
  });

  it("when the cache layer itself throws (e.g. unstable_cache's own invariant/network error), degrades to an empty-but-non-throwing result with a warning", async () => {
    const deps: RawSheetFetchDeps = {
      fetchWindowed: async () => {
        throw new Error(
          "Invariant: incrementalCache missing in unstable_cache",
        );
      },
      fetchLive: async () => liveRows,
    };

    // Must not throw — the hard requirement is that a cache-write failure
    // never breaks rendering.
    const result = await getDailyRowsForSheet(
      sheetId,
      range,
      { preset: "thisMonth", cmp: "prev" },
      deps,
    );
    expect(result.rows).toEqual([]);
    expect(result.warnings.some((w) => w.includes("sheet fetch failed"))).toBe(
      true,
    );
  });

  it("a wide preset (last12m) bypasses the cache entirely and goes straight to live — never calls fetchWindowed", async () => {
    let windowedCalls = 0;
    const deps: RawSheetFetchDeps = {
      fetchWindowed: async (): Promise<WindowedCachePayload> => {
        windowedCalls++;
        return {
          rows: [],
          anchor: "2026-07-24",
          fetchedAt: Date.now(),
          isMock: false,
          tooLargeForCache: false,
        };
      },
      fetchLive: async () => liveRows,
    };

    const result = await getDailyRowsForSheet(
      sheetId,
      range,
      { preset: "last12m", cmp: "prevYear" },
      deps,
    );
    expect(windowedCalls).toBe(0);
    expect(result.rows).toHaveLength(1);
  });

  it("a narrow preset (thisMonth) uses the cache path — calls fetchWindowed, not fetchLive", async () => {
    let windowedCalls = 0;
    let liveCalls = 0;
    const deps: RawSheetFetchDeps = {
      fetchWindowed: async (): Promise<WindowedCachePayload> => {
        windowedCalls++;
        return {
          rows: [],
          anchor: "2026-07-24",
          fetchedAt: Date.now(),
          isMock: false,
          tooLargeForCache: false,
        };
      },
      fetchLive: async () => {
        liveCalls++;
        return liveRows;
      },
    };

    await getDailyRowsForSheet(
      sheetId,
      range,
      { preset: "thisMonth", cmp: "prev" },
      deps,
    );
    expect(windowedCalls).toBe(1);
    expect(liveCalls).toBe(0);
  });

  it("no `sp` at all (defensive default) bypasses the cache — conservative, matches pre-fix behaviour", async () => {
    let windowedCalls = 0;
    const deps: RawSheetFetchDeps = {
      fetchWindowed: async (): Promise<WindowedCachePayload> => {
        windowedCalls++;
        return {
          rows: [],
          anchor: "2026-07-24",
          fetchedAt: Date.now(),
          isMock: false,
          tooLargeForCache: false,
        };
      },
      fetchLive: async () => liveRows,
    };
    const result = await getDailyRowsForSheet(sheetId, range, undefined, deps);
    expect(windowedCalls).toBe(0);
    expect(result.rows).toHaveLength(1);
  });
});
