import "server-only";
import type { ClientConfig } from "@/config/clients";
import type { DailyRow } from "@/lib/sources/raw";
import type { Ga4CampaignRow, Ga4AdgroupRow } from "@/lib/sources/ga4";
import type { ResolvedRange } from "@/lib/range";
import { filterByRange } from "@/lib/metrics";
import type { DrillRow } from "@/components/dashboard/DrillTable";

/**
 * Shared drill-tab query/aggregation logic — extracted from
 * `drill/page.tsx` (2026-07-26, G-3 payload fix) so the CSV export route
 * (`drill/export/route.ts`) computes the exported rows via the EXACT same
 * functions as the on-screen table, fed by an independently-fetched but
 * identically-shaped input. This is what lets the export route exist
 * without duplicating (and risking drift from) the aggregation rules.
 *
 * Nothing here changes behaviour versus the pre-existing inline code in
 * page.tsx — it is a mechanical extraction, not a rewrite. See page.tsx's
 * historical comments (git blame) for the original rationale on cascade
 * levels, bucket keys, and the GA4 JOIN keying scheme.
 */

export type Level = "media" | "campaign" | "adgroup" | "bucket";

export function bucketKey(
  date: string,
  granularity: "day" | "week" | "month",
): string {
  if (granularity === "day") return date;
  if (granularity === "month") return date.slice(0, 7);
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export interface JoinKeys {
  /** Keyed "<identifier>|<bucket>" → per-bucket GA4 totals. The identifier
   *  depends on level: media name (for media level), campaign id (for
   *  campaign level), ADG id (for adgroup level). */
  mediaByBucket: Map<
    string,
    { sessions: number; conversions: number; revenue: number }
  >;
  campaignByBucket: Map<
    string,
    { sessions: number; conversions: number; revenue: number }
  >;
  adgroupByBucket: Map<
    string,
    { sessions: number; conversions: number; revenue: number }
  >;
}

/** Groups the ad-side sheet rows by (level key × bucket) and attaches the
 *  per-bucket GA4 totals from `join`. Row count is therefore bounded by
 *  distinct(level key) × distinct(bucket) — combinatorial in the filtered
 *  window, which is what makes drill's payload grow with period length and
 *  facet depth (see G-3 in the phase brief). */
export function aggregateDrillRows(
  rows: DailyRow[],
  granularity: "day" | "week" | "month",
  level: Level,
  join: JoinKeys,
): DrillRow[] {
  const map = new Map<string, DrillRow>();
  for (const r of rows) {
    const bucket = bucketKey(r.date, granularity);
    let key: string;
    let subKey: string | undefined;
    if (level === "media") {
      key = r.media;
    } else if (level === "campaign") {
      key = r.campaignName || r.campaignId;
      subKey = r.campaignId;
    } else if (level === "adgroup") {
      key = r.adgroupName || r.adgroupId || "(no adgroup)";
      subKey = r.adgroupId;
    } else {
      key = bucket;
    }
    const id = `${level}|${key}|${bucket}`;
    const cur = map.get(id) ?? {
      key,
      subKey,
      date: bucket,
      media: r.media,
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      conversionValue: 0,
      ga4Sessions: null as number | null,
      ga4Conversions: null as number | null,
      ga4Revenue: null as number | null,
    };
    cur.spend += r.cost;
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.conversions += r.conversions;
    cur.conversionValue += r.conversionValue;
    map.set(id, cur);
  }
  // Attach per-bucket GA4 totals. Key = "<identifier>|<bucket>" so the
  // JOIN is both by-identity and by-date — no more repeated window totals.
  for (const row of map.values()) {
    let hit:
      { sessions: number; conversions: number; revenue: number } | undefined;
    if (level === "media") {
      hit = join.mediaByBucket.get(`${row.media}|${row.date}`);
    } else if (level === "campaign" && row.subKey) {
      hit = join.campaignByBucket.get(`${row.subKey}|${row.date}`);
    } else if (level === "adgroup" && row.subKey) {
      hit = join.adgroupByBucket.get(`${row.subKey}|${row.date}`);
    }
    if (hit) {
      row.ga4Sessions = hit.sessions;
      row.ga4Conversions = hit.conversions;
      row.ga4Revenue = hit.revenue;
    }
  }
  return Array.from(map.values());
}

export interface DrillScope {
  filtered: DailyRow[];
  level: Level;
  granularity: "day" | "week" | "month";
  mediaFilter: string;
  campaignFilter: string;
  adgroupFilter: string;
  scopeMedia: Set<string>;
  scopeCampaignKeys: Set<string>;
  scopeAdgroupIds: Set<string>;
  isGoogleOnlyScope: boolean;
  needAdgroupData: boolean;
}

/** Resolves facet filters + cascade level + GA4 scope sets from the raw
 *  (unfiltered) rows and the already-resolved date range. Mirrors
 *  page.tsx lines ~174-220 verbatim (moved, not rewritten). */
export function resolveDrillScope(
  rows: DailyRow[],
  rr: ResolvedRange,
  sp: Record<string, string | undefined>,
): DrillScope {
  const mediaFilter = sp.media ?? "";
  const campaignFilter = sp.campaign ?? "";
  const adgroupFilter = sp.adgroup ?? "";
  const granularity = (sp.g as "day" | "week" | "month" | undefined) ?? "day";

  let filtered = filterByRange(rows, rr.current.start, rr.current.end);
  if (mediaFilter) filtered = filtered.filter((r) => r.media === mediaFilter);
  if (campaignFilter)
    filtered = filtered.filter((r) => r.campaignId === campaignFilter);
  if (adgroupFilter)
    filtered = filtered.filter((r) => r.adgroupId === adgroupFilter);

  const level: Level = adgroupFilter
    ? "bucket"
    : campaignFilter
      ? "adgroup"
      : mediaFilter
        ? "campaign"
        : "media";

  const scopeMedia = new Set(filtered.map((r) => r.media).filter(Boolean));
  // sheetToGa4MatchKey mirrors ga4MatchKey in ga4.ts from the sheet side —
  // see page.tsx's historical comment for the per-media matchKey rationale.
  const scopeCampaignKeys = new Set(
    filtered
      .map((r) =>
        r.media === "Google" || r.media.toLowerCase() === "meta"
          ? r.campaignId
          : r.campaignName,
      )
      .filter(Boolean),
  );
  const scopeAdgroupIds = new Set(
    filtered.map((r) => r.adgroupId).filter(Boolean),
  );
  const isGoogleOnlyScope = scopeMedia.size === 1 && scopeMedia.has("Google");
  const needAdgroupData =
    level === "adgroup" || (!!adgroupFilter && isGoogleOnlyScope);

  return {
    filtered,
    level,
    granularity,
    mediaFilter,
    campaignFilter,
    adgroupFilter,
    scopeMedia,
    scopeCampaignKeys,
    scopeAdgroupIds,
    isGoogleOnlyScope,
    needAdgroupData,
  };
}

function addTo(
  m: Map<string, { sessions: number; conversions: number; revenue: number }>,
  key: string,
  d: { sessions: number; conversions: number; revenue: number },
) {
  const cur = m.get(key) ?? { sessions: 0, conversions: 0, revenue: 0 };
  cur.sessions += d.sessions;
  cur.conversions += d.conversions;
  cur.revenue += d.revenue;
  m.set(key, cur);
}

/** Buckets the CURRENT-period GA4 rows into (identifier|bucket) → totals.
 *  Only the current period is ever needed here — the drill table (and
 *  therefore its CSV export) never displays a previous-period GA4 value,
 *  only the page's Big KPI cards do (computed separately in page.tsx). */
export function buildJoin(
  ga4Campaigns: Ga4CampaignRow[],
  ga4Adgroups: Ga4AdgroupRow[],
  granularity: "day" | "week" | "month",
): JoinKeys {
  const join: JoinKeys = {
    mediaByBucket: new Map(),
    campaignByBucket: new Map(),
    adgroupByBucket: new Map(),
  };
  for (const g of ga4Campaigns) {
    const bucket = g.date ? bucketKey(g.date, granularity) : "";
    if (!bucket) continue;
    addTo(join.mediaByBucket, `${g.media}|${bucket}`, g);
    if (g.matchKey) addTo(join.campaignByBucket, `${g.matchKey}|${bucket}`, g);
  }
  for (const g of ga4Adgroups) {
    const bucket = g.date ? bucketKey(g.date, granularity) : "";
    if (!bucket) continue;
    if (g.adgroupId) addTo(join.adgroupByBucket, `${g.adgroupId}|${bucket}`, g);
  }
  return join;
}

/** Fetches the CURRENT-period GA4 data the drill table needs (paid
 *  campaigns always; Google adgroups only when the cascade actually needs
 *  ADG grain). Split out from page.tsx's Promise.all (which also fetches
 *  the PREVIOUS period for KPI-card deltas) because the export route only
 *  ever needs current-period data — table/CSV rows carry no previous-period
 *  GA4 field. `client` param typed loosely to avoid a circular import with
 *  @/config/clients from within this module's callers. */
export async function fetchDrillGa4Current(
  client: ClientConfig,
  rr: ResolvedRange,
  needAdgroupData: boolean,
  fetchers: {
    getGa4PaidCampaigns: (
      client: ClientConfig,
      start: string,
      end: string,
    ) => Promise<{ rows: Ga4CampaignRow[] }>;
    getGa4GoogleAdgroups: (
      client: ClientConfig,
      start: string,
      end: string,
    ) => Promise<{ rows: Ga4AdgroupRow[] }>;
  },
): Promise<{ ga4Campaigns: Ga4CampaignRow[]; ga4Adgroups: Ga4AdgroupRow[] }> {
  const [campaignsRes, adgroupsRes] = await Promise.all([
    fetchers.getGa4PaidCampaigns(client, rr.current.start, rr.current.end),
    needAdgroupData
      ? fetchers.getGa4GoogleAdgroups(client, rr.current.start, rr.current.end)
      : Promise.resolve({ rows: [] as Ga4AdgroupRow[] }),
  ]);
  return { ga4Campaigns: campaignsRes.rows, ga4Adgroups: adgroupsRes.rows };
}

/** Column header for the entity column — mirrors the on-screen section
 *  heading (page.tsx's `levelLabel`), kept as its own function since the
 *  CSV wording ("期間" for bucket-level) intentionally differs slightly
 *  from the on-screen heading ("期間のみ"). */
export function csvLabelHeaderForLevel(level: Level): string {
  return level === "media"
    ? "媒体"
    : level === "campaign"
      ? "キャンペーン"
      : level === "adgroup"
        ? "広告グループ"
        : "期間";
}

/** Maps aggregated DrillRow[] to the flat record shape toCsv() expects.
 *  Column labels mirror DrillTable's on-screen headers (期間/媒体/Imp/Click)
 *  plus the app-wide report vocabulary (COST/SESSION/GA_CV/GA売上/媒体CV/
 *  媒体売上) — see drill/page.tsx's historical comment for the full
 *  rationale (CSV always exports both ad-side and GA4-side columns
 *  regardless of the on-screen source toggle). */
export function buildDrillCsvRows(
  table: DrillRow[],
): Array<Record<string, unknown>> {
  return table.map((r) => ({
    date: r.date,
    label: r.key,
    subKey: r.subKey ?? "",
    media: r.media,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    conversionValue: r.conversionValue,
    ga4Sessions: r.ga4Sessions ?? "",
    ga4Conversions: r.ga4Conversions ?? "",
    ga4Revenue: r.ga4Revenue ?? "",
  }));
}

export function buildDrillCsvHeaders(level: Level): string[] {
  return [
    "期間",
    csvLabelHeaderForLevel(level),
    "ID",
    "媒体",
    "広告費",
    "Imp",
    "Click",
    "媒体CV",
    "媒体売上",
    "セッション",
    "コンバージョン（広告経由）",
    "売上（広告経由）",
  ];
}

// ── Drill-table row windowing (G-3b, 2026-07-26) ───────────────────────────
//
// The CSV-payload fix above (buildDrillCsvRows / export/route.ts) stopped
// the full aggregated row set from being serialized into a CLIENT prop, but
// the on-screen DrillTable is a Server Component that was still rendering
// every aggregated row into the response — measured at 18,938,442 bytes of
// HTML (2,394,984 bytes gzip) for hs `?preset=last12m&media=Google` (3,193
// rows). A Server Component's rendered output still has to be serialized
// (both as the SSR HTML and, again, as the RSC flight payload React uses to
// reconcile the tree on subsequent client-side navigations) — so "don't
// serialize an unbounded row set" applies to it too, not only to `"use
// client"` props. Fix: paginate. The full row set is still computed,
// sorted, and reachable (every row remains one Prev/Next click away, and
// the CSV export route above is never paginated — it always streams every
// row), but any SINGLE response only ever renders one bounded window.
//
// Sort MUST run over the complete row set before slicing — sorting only
// the rows that happen to already be on a given page is a different (and
// wrong) operation from slicing a globally-sorted array. See
// paginateDrillRows below and its test in __tests__/drill-shared.test.ts.

/** Bounds how many rows a single drill-table response renders. Tuned so a
 *  full page (12 columns, incl. per-cell anomaly glyphs) stays well under
 *  ~1MB gzip even at the densest (adgroup/bucket) level — see the
 *  measurement in projects/mixednuts-web/_reports/
 *  2026-07-26_dashboard-performance-budget.md. This is a window size, not a
 *  cap: every row beyond it is still reachable via pagination, and the CSV
 *  export is never limited by it. */
export const DRILL_PAGE_SIZE = 200;

/** The on-screen sort order: latest bucket first, then largest spend first
 *  within a bucket. Extracted from DrillTable.tsx (2026-07-26) so page.tsx
 *  can apply it ONCE to the full row set before paginating — DrillTable
 *  itself still calls this on whatever it receives (defensive/idempotent:
 *  re-sorting an already-sorted slice with the same comparator is a no-op,
 *  Array.prototype.sort has been spec-stable since ES2019), so it stays
 *  correct even if a future caller passes it unsorted rows directly. */
export function sortDrillRows(rows: DrillRow[]): DrillRow[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.spend - a.spend;
  });
}

export interface DrillPage {
  /** Full row count across all pages — this is what the on-screen badge and
   *  the sr-only table caption must display, never `pageRows.length`. */
  totalCount: number;
  pageCount: number;
  /** Clamped to [1, pageCount] — an out-of-range or non-numeric `?dpage=`
   *  never produces an empty or crashing page. */
  currentPage: number;
  /** 1-based, inclusive. 0 when totalCount is 0. */
  pageStart: number;
  /** 1-based, inclusive. 0 when totalCount is 0. */
  pageEnd: number;
  pageRows: DrillRow[];
}

/**
 * Slices an ALREADY-sorted row set (see sortDrillRows) into one page. Pure
 * and synchronous so it is directly unit-testable without any of the
 * server-component/fetch machinery around it — see
 * __tests__/drill-shared.test.ts for the "whole-set sort survives
 * pagination" regression lock this specifically exists to guard.
 */
export function paginateDrillRows(
  sortedRows: DrillRow[],
  requestedPage: string | undefined,
  pageSize: number = DRILL_PAGE_SIZE,
): DrillPage {
  const totalCount = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const parsed = Number.parseInt(requestedPage ?? "1", 10);
  const currentPage =
    Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, pageCount) : 1;
  const startOffset = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(startOffset, startOffset + pageSize);
  const pageStart = totalCount === 0 ? 0 : startOffset + 1;
  const pageEnd = totalCount === 0 ? 0 : startOffset + pageRows.length;
  return { totalCount, pageCount, currentPage, pageStart, pageEnd, pageRows };
}
