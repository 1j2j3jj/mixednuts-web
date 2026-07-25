import "server-only";
import { unstable_cache } from "next/cache";
import {
  fetchSheetRaw,
  sheetCacheTag,
  type SheetFetchResult,
} from "@/lib/sheets";
import type { ClientConfig } from "@/config/clients";
import {
  neededLookbackDays,
  type CompareKey,
  type PresetKey,
} from "@/lib/range";

/**
 * Normalised daily row — output of the raw-data source.
 *
 * Column names kept close to the source sheet (費用 → cost, etc.) so the
 * mapping stays obvious. Brand/General is not tracked per CEO decision
 * (2026-04-22): the dashboard works off media × campaign × ADG alone.
 */
export interface DailyRow {
  media: "Google" | "Microsoft" | "Yahoo" | "meta" | "LinkedIn" | string;
  date: string; // ISO yyyy-mm-dd
  campaignId: string;
  campaignName: string;
  /** Ad group id. May be empty when the source doesn't expose ADG (e.g. the
   *  current HS_Raw_Ads sheet is campaign-grain). The mock generates two
   *  synthetic ADGs per campaign so drilldown UX can be exercised. */
  adgroupId: string;
  adgroupName: string;
  currency: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

export interface DailyFetchResult {
  rows: DailyRow[];
  fetchedAt: number;
  isMock: boolean;
  warnings: string[];
}

/**
 * Column index map for the HS ADG-grained multi-media export sheet
 * (HS_202410_202603 / シート1). 12 columns, media values seen in the wild:
 * Google / Yahoo / Microsoft / meta / LinkedIn.
 *
 * Brand/General is not exported; we infer it from the campaign name
 * (contains 指名 → Brand) so the downstream filters still work.
 */
const HS_COLS = {
  date: 0,
  media: 1,
  campaignId: 2,
  campaignName: 3,
  adgroupId: 4,
  adgroupName: 5,
  currency: 6,
  cost: 7,
  impressions: 8,
  clicks: 9,
  conversions: 10,
  conversionValue: 11,
} as const;

/** Strip leading/trailing brackets often present in Microsoft Ads export
 *  (e.g. "[518730332]" → "518730332") so the JOIN key with GA4 matches. */
function stripBrackets(s: string): string {
  return s.replace(/^[[(]+|[\])]+$/g, "").trim();
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Split one (campaign × date) row into two synthetic ADGs with a 60/40
 *  spend split. Kept deterministic so the drill UI is stable across
 *  reloads. Used only when the source sheet has no ADG columns. */
function expandWithSyntheticAdgs(rows: DailyRow[]): DailyRow[] {
  const out: DailyRow[] = [];
  for (const r of rows) {
    const base = r.campaignId || r.campaignName || "CPN";
    const splits: Array<{ id: string; name: string; share: number }> = [
      {
        id: `${base}-AG1`,
        name: `${r.campaignName || "CPN"} · AG1`,
        share: 0.6,
      },
      {
        id: `${base}-AG2`,
        name: `${r.campaignName || "CPN"} · AG2`,
        share: 0.4,
      },
    ];
    for (const s of splits) {
      out.push({
        ...r,
        adgroupId: s.id,
        adgroupName: s.name,
        cost: Math.round(r.cost * s.share),
        impressions: Math.round(r.impressions * s.share),
        clicks: Math.round(r.clicks * s.share),
        conversions: Math.round(r.conversions * s.share),
        conversionValue: Math.round(r.conversionValue * s.share),
      });
    }
  }
  return out;
}

function normaliseDate(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  // Accept "2026-04-21", "2026/4/21".
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Unrecognised input (including the media name when column mapping is wrong
  // on a partial import): return empty so downstream `filter(Boolean)` drops
  // the row instead of propagating garbage to date arithmetic.
  return "";
}

/**
 * Parse raw Sheets values (header + data rows) into DailyRow[]. Pure —
 * extracted so it's reused by both the bounded-cache path and the
 * live-fallback path below (A-27 fix), and so it can be unit-tested without
 * touching the network.
 */
export function parseSheetRows(values: string[][]): DailyRow[] {
  if (values.length === 0) return [];
  const dataRows = values.slice(1);
  const rows: DailyRow[] = [];
  for (const r of dataRows) {
    if (r.every((c) => c == null || String(c).trim() === "")) continue;
    const campaignName = String(r[HS_COLS.campaignName] ?? "").trim();
    rows.push({
      media: String(r[HS_COLS.media] ?? "").trim(),
      date: normaliseDate(r[HS_COLS.date]),
      campaignId: stripBrackets(String(r[HS_COLS.campaignId] ?? "")),
      campaignName,
      adgroupId: stripBrackets(String(r[HS_COLS.adgroupId] ?? "")),
      adgroupName: String(r[HS_COLS.adgroupName] ?? "").trim(),
      currency: String(r[HS_COLS.currency] ?? "JPY").trim(),
      cost: toNumber(r[HS_COLS.cost]),
      impressions: toNumber(r[HS_COLS.impressions]),
      clicks: toNumber(r[HS_COLS.clicks]),
      conversions: toNumber(r[HS_COLS.conversions]),
      conversionValue: toNumber(r[HS_COLS.conversionValue]),
    });
  }
  return rows;
}

/** Latest (max) date across rows, or null when there are none. Pure. */
export function latestDate(rows: DailyRow[]): string | null {
  let max: string | null = null;
  for (const r of rows) {
    if (!r.date) continue;
    if (max === null || r.date > max) max = r.date;
  }
  return max;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------------ */
/* A-27 fix: bounded, size-safe caching for the ads raw sheet               */
/*                                                                          */
/* Root cause (projects/mixednuts-web/_reports/                            */
/* 2026-07-24_dashboard-phaseA-defect-ledger.md, 追記3): the ads raw sheet   */
/* used to be fetched and cached in full — every date since the sheet's    */
/* first export, with no date dimension in the cache key/value. OGC/OGP     */
/* already exceed Next's (and Vercel's) 2MB data-cache write limit          */
/* (measured 2026-07-25 live: OGC 6.29MB / OGP 7.51MB full-history object   */
/* shape), and HS crossed it too the same day. Every cache write failed,    */
/* so caching was silently disabled on every request (the true cause of    */
/* the ~19s loads), and the write failure is an unawaited/uncatchable      */
/* promise inside next/cache that surfaces as a process-wide                */
/* unhandledRejection — see src/instrumentation-node.ts for the narrow,     */
/* filtered safety net that stops that from ever blanking a page again,     */
/* independent of the size fix below.                                       */
/*                                                                          */
/* Fix: cache only a bounded, recent window (RAW_CACHE_LOOKBACK_DAYS), in a */
/* compact positional shape (no unused `currency` field — confirmed dead    */
/* below). Requests whose resolved date range (current ∪ previous) could    */
/* reach further back than the cached window — last6m/last12m, any          */
/* prevYear compare, far-back custom ranges — bypass the cache and fetch    */
/* live instead, exactly like today's (correct, just slow) behaviour for    */
/* those cases; the difference is they now never hand next/cache a payload  */
/* that can trip the 2MB ceiling. A byte-size safety valve is a second,     */
/* independent guard against the window itself growing unexpectedly large   */
/* before the next review (sheet growth is not steady — OGC went 9.9x in   */
/* 94 days per the same ledger entry).                                      */
/* ------------------------------------------------------------------------ */

/** How many days of ad data (back from the true data anchor) the shared 60s
 *  cache holds. Sized from a live measurement (2026-07-25, all 6 clients):
 *  at 100d the largest client (OGP) compacts to ~0.79MB, ~40% of Next's 2MB
 *  cache-write ceiling — comfortable headroom, not a squeeze. It also
 *  covers every non-prevYear preset up to and including lastMonth/last3m
 *  (worst-case exact lookback verified in range.ts `worstCaseLookbackDays`:
 *  lastMonth+prev=92d, last3m+none=92d — both <=100). Wider selections
 *  (last6m/last12m, any prevYear compare, far custom ranges) always exceed
 *  100d and correctly bypass the cache below. */
export const RAW_CACHE_LOOKBACK_DAYS = 100;

/** Hard byte ceiling for what this module will ever hand to unstable_cache
 *  — well under Next's 2MB limit (25% margin) so unexpected future growth
 *  inside the 100-day window (sheets have grown non-linearly before) still
 *  can't reproduce A-27. Measured via JSON.stringify size, a close proxy
 *  for what Next actually persists. */
export const RAW_CACHE_SIZE_SAFETY_BYTES = 1_500_000;

const RAW_CACHE_TTL_SECONDS = 60; // unchanged from the previous fetchSheetCached TTL

/** The default (preset, compare) used to ESTIMATE lookback need when the
 *  caller doesn't resolve one explicitly from `sp` (all 3 current callers
 *  do). "prev" is used even for drill's "none" default because it's the
 *  larger (safe, superset) estimate — using it never under-estimates. */
const DEFAULT_RANGE_HINT: { preset: PresetKey; compare: CompareKey } = {
  preset: "thisMonth",
  compare: "prev",
};

/**
 * Compact, positional projection of DailyRow used ONLY for the cached
 * payload (never returned to callers directly — see fromCachedRow).
 *
 * `currency` is dropped. Evidence it's safe: `grep -rn "\.currency" src`
 * (2026-07-25) shows exactly one read-adjacent hit outside this file's own
 * assignment — `ClientConfig.currency` in
 * ClientDetailTabs.tsx:77/config/clients.ts — a *different* field on a
 * *different* type (the client's billing currency, not a per-row value).
 * DailyRow.currency itself has zero read sites anywhere in src/ besides its
 * assignment at the bottom of parseSheetRows. It is reconstructed as the
 * fixed "JPY" in fromCachedRow so DailyRow's shape and every rendered
 * number are unaffected — nothing was reading the real value regardless.
 *
 * Positional (not named-key) shape matters too: measured on live OGC data
 * (2026-07-25), the equivalent named-key DailyRow[] serializes ~2.2x larger
 * than this tuple shape for the same rows.
 */
export type CachedRow = [
  media: string,
  date: string,
  campaignId: string,
  campaignName: string,
  adgroupId: string,
  adgroupName: string,
  cost: number,
  impressions: number,
  clicks: number,
  conversions: number,
  conversionValue: number,
];

export function toCachedRow(r: DailyRow): CachedRow {
  return [
    r.media,
    r.date,
    r.campaignId,
    r.campaignName,
    r.adgroupId,
    r.adgroupName,
    r.cost,
    r.impressions,
    r.clicks,
    r.conversions,
    r.conversionValue,
  ];
}

export function fromCachedRow(c: CachedRow): DailyRow {
  const [
    media,
    date,
    campaignId,
    campaignName,
    adgroupId,
    adgroupName,
    cost,
    impressions,
    clicks,
    conversions,
    conversionValue,
  ] = c;
  return {
    media,
    date,
    campaignId,
    campaignName,
    adgroupId,
    adgroupName,
    currency: "JPY", // dead field downstream — see CachedRow doc comment above
    cost,
    impressions,
    clicks,
    conversions,
    conversionValue,
  };
}

/** Filter to `date >= windowStartInclusive` and project to the compact
 *  cache shape. Pure — this is the function under test for "a realistic
 *  oversize input reduces below threshold" (see raw.test.ts). */
export function projectForCache(
  rows: DailyRow[],
  windowStartInclusive: string,
): CachedRow[] {
  const out: CachedRow[] = [];
  for (const r of rows) {
    if (r.date && r.date >= windowStartInclusive) out.push(toCachedRow(r));
  }
  return out;
}

/** Cheap proxy for what Next.js would actually serialize into the data
 *  cache for this value. */
export function estimateCacheBytes(rows: CachedRow[]): number {
  return Buffer.byteLength(JSON.stringify(rows), "utf8");
}

export interface WindowedCachePayload {
  rows: CachedRow[];
  anchor: string;
  fetchedAt: number;
  isMock: boolean;
  /** True when the safety valve refused to persist the projected rows
   *  because their estimated size landed too close to Next's cache-write
   *  ceiling. getDailyRows treats this exactly like a cache miss and falls
   *  back to a live (uncached) fetch for the actual data — it never trusts
   *  the (deliberately empty) `rows` on this payload. */
  tooLargeForCache: boolean;
}

/**
 * The only place this module calls `unstable_cache` for the ads raw sheet.
 * On a cache miss (or TTL expiry) it does ONE live fetch of the full sheet
 * — unavoidable, Sheets API has no server-side date filter for this range —
 * computes the true anchor from the full parse, and caches only a bounded,
 * size-checked slice around that anchor.
 */
function fetchWindowedRowsCached(
  sheetId: string,
  range: string,
): Promise<WindowedCachePayload> {
  const tag = sheetCacheTag(sheetId, range);
  return unstable_cache(
    async (): Promise<WindowedCachePayload> => {
      const { values, fetchedAt, isMock } = await fetchSheetRaw(sheetId, range);
      const allRows = parseSheetRows(values);
      const anchor =
        latestDate(allRows) ?? new Date().toISOString().slice(0, 10);
      const windowStart = addDaysIso(anchor, -RAW_CACHE_LOOKBACK_DAYS);
      const projected = projectForCache(allRows, windowStart);
      if (estimateCacheBytes(projected) > RAW_CACHE_SIZE_SAFETY_BYTES) {
        // Structural safety valve (A-27 recommendation #2): never attempt a
        // write anywhere near Next's 2MB ceiling. Cache a tiny sentinel
        // instead (cheap on repeat hits within the TTL) and let the caller
        // fall back to a live fetch for the real data this cycle.
        return { rows: [], anchor, fetchedAt, isMock, tooLargeForCache: true };
      }
      return {
        rows: projected,
        anchor,
        fetchedAt,
        isMock,
        tooLargeForCache: false,
      };
    },
    [`raw-window:${sheetId}:${range}`],
    { revalidate: RAW_CACHE_TTL_SECONDS, tags: [tag] },
  )();
}

/** Fetch functions used by {@link getDailyRowsForSheet}. Defaults to the
 *  real `unstable_cache`-backed / live implementations; tests inject fakes
 *  so the "cache-write failure path returns data rather than throwing"
 *  behaviour can be exercised deterministically without a real Next.js
 *  request context or live Google Sheets access (unstable_cache throws an
 *  "incrementalCache missing" invariant outside one — confirmed empirically
 *  under vitest; see raw.test.ts). */
export interface RawSheetFetchDeps {
  fetchWindowed: (
    sheetId: string,
    range: string,
  ) => Promise<WindowedCachePayload>;
  fetchLive: (sheetId: string, range: string) => Promise<SheetFetchResult>;
}

const defaultRawSheetFetchDeps: RawSheetFetchDeps = {
  fetchWindowed: fetchWindowedRowsCached,
  fetchLive: fetchSheetRaw,
};

/**
 * Core sheet-fetching logic, factored out of {@link getDailyRows} so it can
 * be unit-tested with injected fetch functions (see RawSheetFetchDeps).
 *
 * @param sp Optional raw searchParams (`?preset=` / `?cmp=` / `?start=` /
 *   `?end=`) from the calling page. Used ONLY to decide whether the bounded
 *   cache (see fetchWindowedRowsCached above) can safely answer this
 *   request — never to filter what's returned. When omitted, this always
 *   takes the live (uncached but correct) path, same as before this fix.
 */
export async function getDailyRowsForSheet(
  sheetId: string,
  rawAdsRange: string,
  sp: Record<string, string | undefined> | undefined,
  deps: RawSheetFetchDeps = defaultRawSheetFetchDeps,
): Promise<DailyFetchResult> {
  const warnings: string[] = [];
  const todayIso = new Date().toISOString().slice(0, 10);
  const lookback = sp
    ? neededLookbackDays(sp, DEFAULT_RANGE_HINT, todayIso)
    : Number.POSITIVE_INFINITY;
  const canUseWindowCache = lookback <= RAW_CACHE_LOOKBACK_DAYS;

  if (canUseWindowCache) {
    try {
      const payload = await deps.fetchWindowed(sheetId, rawAdsRange);
      if (!payload.tooLargeForCache) {
        const rows = payload.rows.map(fromCachedRow);
        if (rows.length === 0) warnings.push("sheet returned 0 rows");
        // Synthetic ADG expansion runs ONLY for mock data — unchanged
        // behaviour from before this fix.
        if (
          payload.isMock &&
          rows.length > 0 &&
          rows.every((r) => !r.adgroupId)
        ) {
          return {
            rows: expandWithSyntheticAdgs(rows),
            fetchedAt: payload.fetchedAt,
            isMock: payload.isMock,
            warnings,
          };
        }
        return {
          rows,
          fetchedAt: payload.fetchedAt,
          isMock: payload.isMock,
          warnings,
        };
      }
      // tooLargeForCache: the cache write was structurally refused (A-27
      // safety valve) rather than attempted-and-failed, so no data was
      // lost — fall through to the live path below and return it for real.
    } catch (err) {
      // The cache LAYER itself failed (e.g. the underlying live fetch it
      // wraps errored) — there is no data to recover here, same as the
      // pre-A-27-fix behaviour and the same convention bq-raw.ts uses.
      warnings.push(
        `sheet fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { rows: [], fetchedAt: Date.now(), isMock: false, warnings };
    }
  }

  // Wide preset / far-back custom range / no window hint from the caller /
  // tooLargeForCache fallthrough: never safe to cache (could be multi-year
  // history), so fetch live — the same behaviour production has always had
  // for these cases, just without ever handing next/cache a payload that
  // can trip the 2MB write ceiling.
  let result: SheetFetchResult;
  try {
    result = await deps.fetchLive(sheetId, rawAdsRange);
  } catch (err) {
    warnings.push(
      `sheet fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { rows: [], fetchedAt: Date.now(), isMock: false, warnings };
  }
  const { values, fetchedAt, isMock } = result;
  if (values.length === 0) {
    return { rows: [], fetchedAt, isMock, warnings: ["sheet returned 0 rows"] };
  }
  const rows = parseSheetRows(values);
  if (isMock && rows.length > 0 && rows.every((r) => !r.adgroupId)) {
    return { rows: expandWithSyntheticAdgs(rows), fetchedAt, isMock, warnings };
  }
  return { rows, fetchedAt, isMock, warnings };
}

/**
 * Load daily ads rows for a client. Silently falls back to a mock sheet when
 * GOOGLE_SERVICE_ACCOUNT_JSON is not configured (dev-time).
 *
 * Storage backend: defaults to Google Sheets (legacy). Set
 * `BQ_SOURCE_RAW=1` env var to read from BigQuery {client}_marts.ads_*_daily
 * tables instead. Used by the GCP migration roll-out — flag-gated for safety.
 *
 * @param sp Optional raw searchParams — see {@link getDailyRowsForSheet}.
 */
export async function getDailyRows(
  client: ClientConfig,
  sp?: Record<string, string | undefined>,
): Promise<DailyFetchResult> {
  if (process.env.BQ_SOURCE_RAW === "1") {
    const { getDailyRowsFromBq } = await import("./bq-raw");
    return getDailyRowsFromBq(client);
  }
  if (!client.dataSource || client.dataSource.kind !== "google_sheets") {
    return {
      rows: [],
      fetchedAt: Date.now(),
      isMock: true,
      warnings: ["no data source configured"],
    };
  }
  const { sheetId, rawAdsRange } = client.dataSource;
  return getDailyRowsForSheet(sheetId, rawAdsRange, sp);
}
