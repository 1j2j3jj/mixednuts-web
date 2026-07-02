import "server-only";
import { unstable_cache } from "next/cache";
import { getBigQuery, BQ_LOCATION } from "@/lib/bigquery";

/**
 * BigQuery-backed fetchers for the rpt_* reporting views
 * ({client}_marts.rpt_{daily,media,cpn,adg,all} — built 2026-07-02 on the
 * mixednutsinc side; GA × ads auto-reconciled marts).
 *
 * Deliberately separate from bq-raw.ts: that module rebuilds the Sheet
 * DailyRow shape from per-media tables, while these views are already
 * aggregated / reconciled. Nothing here changes bq-raw behaviour.
 *
 * Semantics (verified against the DDL in
 * mixednutsinc/scripts/integrations/{dozo,hs}/sql/*.sql and
 * INFORMATION_SCHEMA.COLUMNS on 2026-07-02):
 *
 *  - rpt_daily / rpt_media / rpt_cpn / rpt_adg are grained on
 *    fct_ad_daily, so their sessions / ga_cv / ga_value are the
 *    **ad-attributed** GA numbers (GA joined to the ad entity).
 *  - rpt_all is the **site-wide** picture: sessions / ga_cv / ga_value
 *    cover the whole GA property (returns floored at 0), plus the
 *    overall-CV layer (dozo: shopify_cv — currently NULL by design;
 *    hs: eccube_cv / eccube_value) and ad_media_cv/value for reference.
 *  - Ratio columns exist in the views but are intentionally NOT read here;
 *    callers must recompute ratios from the summed numerators/denominators
 *    (averaging pre-computed ratios is wrong). Note the view ROAS columns
 *    are multipliers (16.77 = 1677%) — another reason to recompute.
 *
 * Column differences are normalised in this module:
 *  - dozo rpt_all.shopify_cv / rpt_media.shopify_cv → overallCv
 *  - hs rpt_all.eccube_cv / eccube_value → overallCv / overallValue
 *  - media strings are lowercase in the views ("google" / "meta" / ...)
 *    and mapped to the display labels the rest of the dashboard uses.
 *
 * All queries are SELECT-only. Caching: 5-min unstable_cache (same TTL as
 * bq-raw.ts) tagged "bq-rpt" so the manual refresh action can purge it.
 */

const CACHE_TTL_SECONDS = 300;
export const BQ_RPT_CACHE_TAG = "bq-rpt";

export type RptClientId = "dozo" | "hs";

export interface RptClientMeta {
  /** Display label for the overall-CV layer (the shop system of record). */
  overallCvLabel: string;
  /** Whether the overall layer also carries a revenue value column. */
  hasOverallValue: boolean;
  /** Whether rpt_media carries a per-media overall CV column (dozo only). */
  mediaHasOverallCv: boolean;
}

export const RPT_SUPPORTED: Record<RptClientId, RptClientMeta> = {
  dozo: {
    overallCvLabel: "Shopify CV",
    hasOverallValue: false,
    mediaHasOverallCv: true,
  },
  hs: {
    overallCvLabel: "EC-CUBE CV",
    hasOverallValue: true,
    mediaHasOverallCv: false,
  },
};

export function isRptSupported(clientId: string): clientId is RptClientId {
  return clientId in RPT_SUPPORTED;
}

/** Lowercase view value → display label (matches bq-raw.ts mediaLabel). */
const MEDIA_LABEL: Record<string, string> = {
  google: "Google",
  meta: "meta",
  microsoft: "Microsoft",
  yahoo: "Yahoo",
};

function mediaLabel(m: string | null): string {
  if (!m) return "";
  return MEDIA_LABEL[m.toLowerCase()] ?? m;
}

/* ------------------------------------------------------------------ */
/* Row shapes returned to pages                                        */
/* ------------------------------------------------------------------ */

/** Shared additive metrics. Ratios are derived by callers from these. */
export interface RptMetrics {
  cost: number;
  impressions: number;
  clicks: number;
  /** Ad-attributed GA sessions (entity views) / site sessions (rpt_all). */
  sessions: number;
  mediaCv: number;
  mediaValue: number;
  gaCv: number;
  gaValue: number;
}

export interface RptDailyRow extends RptMetrics {
  date: string; // yyyy-mm-dd
}

export interface RptMediaRow extends RptMetrics {
  date: string;
  media: string;
  /** dozo only (shopify_cv); null for hs and when the mart has no value. */
  overallCv: number | null;
}

export interface RptCpnRow extends RptMetrics {
  date: string;
  media: string;
  campaignId: string;
  campaignName: string;
  matchStatus: string; // matched | unmapped | ad_only
}

export interface RptAdgRow extends RptMetrics {
  date: string;
  media: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  grainLevel: string; // adgroup | campaign (campaign = PMax fold-back)
  matchStatus: string;
}

export interface RptAllRow {
  granularity: "daily" | "monthly";
  date: string;
  cost: number;
  /** Site-wide GA sessions. */
  sessions: number;
  /** Site-wide GA CV / value (returns floored at 0 in the mart). */
  gaCv: number;
  gaValue: number;
  /** Overall CV layer (dozo: shopify_cv / hs: eccube_cv). NULL until the
   *  shop-side ingest lands — render as "—", never as 0. */
  overallCv: number | null;
  overallValue: number | null;
  /** Ad-platform CV / value rolled up across media (reference columns). */
  adMediaCv: number;
  adMediaValue: number;
}

/* ------------------------------------------------------------------ */
/* BQ plumbing                                                         */
/* ------------------------------------------------------------------ */

type BqVal = string | number | null | undefined | { value: string };

function _date(v: BqVal): string {
  if (v == null) return "";
  if (typeof v === "object") return v.value ?? "";
  return String(v);
}

function _num(v: BqVal): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Like _num but preserves NULL (for the overall-CV layer where NULL means
 *  "no data yet", which must not display as 0). */
function _numOrNull(v: BqVal): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

type RptView = "daily" | "media" | "cpn" | "adg" | "all";

function buildSql(clientId: RptClientId, view: RptView): string {
  const project = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  const ds = `\`${project}.${clientId}_marts\``;
  // Explicit column lists only — never SELECT * (view column order differs
  // between clients: dozo has wedding_* columns, hs has eccube_*).
  switch (view) {
    case "daily":
      return `
        SELECT date, cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value
        FROM ${ds}.rpt_daily
        ORDER BY date`;
    case "media": {
      const overall =
        clientId === "dozo" ? "shopify_cv" : "CAST(NULL AS INT64)";
      return `
        SELECT date, media, cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value,
               ${overall} AS overall_cv
        FROM ${ds}.rpt_media
        ORDER BY date, media`;
    }
    case "cpn":
      return `
        SELECT date, media, campaign_id, campaign_name, match_status,
               cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value
        FROM ${ds}.rpt_cpn
        ORDER BY date, media, campaign_id`;
    case "adg":
      return `
        SELECT date, media, campaign_id, campaign_name,
               ad_group_id, ad_group_name, grain_level, match_status,
               cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value
        FROM ${ds}.rpt_adg
        ORDER BY date, media, campaign_id, ad_group_id`;
    case "all": {
      const overallCv =
        clientId === "dozo" ? "shopify_cv" : "eccube_cv";
      const overallValue =
        clientId === "dozo" ? "CAST(NULL AS NUMERIC)" : "eccube_value";
      return `
        SELECT granularity, date, cost, sessions, ga_cv, ga_value,
               ${overallCv} AS overall_cv,
               ${overallValue} AS overall_value,
               ad_media_cv, ad_media_value
        FROM ${ds}.rpt_all
        ORDER BY granularity, date`;
    }
  }
}

interface RawRow {
  [k: string]: BqVal;
}

async function _runRptQuery(
  clientId: RptClientId,
  view: RptView,
): Promise<RawRow[]> {
  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: buildSql(clientId, view),
    location: BQ_LOCATION,
  });
  const [rows] = await job.getQueryResults();
  // Map to plain JSON-safe objects *before* unstable_cache serialises the
  // result: BigQueryDate → string, NUMERIC (Big) → number.
  return (rows as unknown as RawRow[]).map((r) => {
    const out: RawRow = {};
    for (const [k, v] of Object.entries(r)) {
      if (v == null) out[k] = null;
      else if (typeof v === "object") out[k] = (v as { value: string }).value;
      else out[k] = v;
    }
    return out;
  });
}

const _cachedRptQuery = unstable_cache(_runRptQuery, ["bq-rpt-rows"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [BQ_RPT_CACHE_TAG],
});

function metrics(r: RawRow): RptMetrics {
  return {
    cost: _num(r.cost),
    impressions: _num(r.impressions),
    clicks: _num(r.clicks),
    sessions: _num(r.sessions),
    mediaCv: _num(r.media_cv),
    mediaValue: _num(r.media_value),
    gaCv: _num(r.ga_cv),
    gaValue: _num(r.ga_value),
  };
}

/* ------------------------------------------------------------------ */
/* Public fetchers                                                     */
/* ------------------------------------------------------------------ */

export interface RptFetchResult<T> {
  rows: T[];
  fetchedAt: number;
  warnings: string[];
}

async function fetchView<T>(
  clientId: RptClientId,
  view: RptView,
  map: (r: RawRow) => T,
): Promise<RptFetchResult<T>> {
  try {
    const raw = await _cachedRptQuery(clientId, view);
    return { rows: raw.map(map), fetchedAt: Date.now(), warnings: [] };
  } catch (err) {
    return {
      rows: [],
      fetchedAt: Date.now(),
      warnings: [
        `bq rpt_${view} fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
}

export function getRptDaily(clientId: RptClientId): Promise<RptFetchResult<RptDailyRow>> {
  return fetchView(clientId, "daily", (r) => ({
    date: _date(r.date),
    ...metrics(r),
  }));
}

export function getRptMedia(clientId: RptClientId): Promise<RptFetchResult<RptMediaRow>> {
  return fetchView(clientId, "media", (r) => ({
    date: _date(r.date),
    media: mediaLabel(typeof r.media === "string" ? r.media : null),
    ...metrics(r),
    overallCv: _numOrNull(r.overall_cv),
  }));
}

export function getRptCpn(clientId: RptClientId): Promise<RptFetchResult<RptCpnRow>> {
  return fetchView(clientId, "cpn", (r) => ({
    date: _date(r.date),
    media: mediaLabel(typeof r.media === "string" ? r.media : null),
    campaignId: _date(r.campaign_id),
    campaignName: _date(r.campaign_name),
    matchStatus: _date(r.match_status),
    ...metrics(r),
  }));
}

export function getRptAdg(clientId: RptClientId): Promise<RptFetchResult<RptAdgRow>> {
  return fetchView(clientId, "adg", (r) => ({
    date: _date(r.date),
    media: mediaLabel(typeof r.media === "string" ? r.media : null),
    campaignId: _date(r.campaign_id),
    campaignName: _date(r.campaign_name),
    adGroupId: _date(r.ad_group_id),
    adGroupName: _date(r.ad_group_name),
    grainLevel: _date(r.grain_level),
    matchStatus: _date(r.match_status),
    ...metrics(r),
  }));
}

export function getRptAll(clientId: RptClientId): Promise<RptFetchResult<RptAllRow>> {
  return fetchView(clientId, "all", (r) => ({
    granularity: (_date(r.granularity) === "monthly" ? "monthly" : "daily") as
      | "daily"
      | "monthly",
    date: _date(r.date),
    cost: _num(r.cost),
    sessions: _num(r.sessions),
    gaCv: _num(r.ga_cv),
    gaValue: _num(r.ga_value),
    overallCv: _numOrNull(r.overall_cv),
    overallValue: _numOrNull(r.overall_value),
    adMediaCv: _num(r.ad_media_cv),
    adMediaValue: _num(r.ad_media_value),
  }));
}
