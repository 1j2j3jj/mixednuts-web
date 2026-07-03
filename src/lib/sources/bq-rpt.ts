import "server-only";
import { unstable_cache } from "next/cache";
import { getBigQuery, BQ_LOCATION } from "@/lib/bigquery";
import { classifyFetchError, tagWarning } from "@/lib/fetch-warnings";

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
 * Event-level CV (added 2026-07-02, per-client key events on top of the
 * ga_cv aggregate that already existed):
 *  - hs:   ga_cv_purchase / ga_cv_member / ga_cv_contact / ga_cv_add_to_cart
 *  - dozo: ga_cv_purchase / ga_cv_thanks / ga_cv_wedding_ev / ga_cv_add_to_cart
 *  - ga_cv_purchase is the PRIMARY conversion for GA_CVR/GA_CPA/GA_ROAS on
 *    the **ad-attributed** views (rpt_daily / rpt_weekly / rpt_media /
 *    rpt_cpn / rpt_adg) — there it is genuinely GA joined to the ad entity.
 *  - add_to_cart is fetched but intentionally not part of EVENT_CV_COLUMNS
 *    (soft signal, not a report-default column); it is still selected in
 *    SQL so it is available if a caller needs it later.
 *  - 🔴 IMPORTANT (verified 2026-07-02 against ga4_daily / fct_ad_daily /
 *    rpt_all.sql): on rpt_all, ga_cv_purchase (and every ga_cv_{event}
 *    column) is summed from fct_ad_daily's `ad` CTE — i.e. it is STILL
 *    ad-attributed, not site-wide, even though it lives on the "site-wide"
 *    view. rpt_all's only genuinely site-wide purchase-count metric is
 *    ga_cv / ga_value (sourced from ga4_daily's `ga_total` CTE, whose
 *    `conversions` column is GA4's `ecommercePurchases` metric — i.e. despite
 *    the "legacy aggregate of all key events" name, for this mart it IS a
 *    purchase count, GA4 has no eventName dimension on this pull). Verified
 *    2026-06 actuals: dozo site ga_cv=2,334 vs ad-attributed
 *    ga_cv_purchase=369 (6.3x); hs site ga_cv=1,846 vs ad-attributed
 *    ga_cv_purchase=842 (2.2x). Callers on daily/monthly (RptAllRow) must
 *    use gaCv/gaValue for the "site-wide purchases" figure and treat
 *    gaCvPurchase there as a separate ad-attributed reference column (see
 *    RptAllRow doc below).
 *
 * Weekly / monthly granularity (added 2026-07-02):
 *  - Weekly rolls up rpt_daily by ISO week (Monday start).
 *  - Monthly joins the rpt_all monthly rows (which already carry
 *    target_cv/target_value + the overall-CV layer) with a rpt_daily
 *    month-truncated rollup (ads-side media_cv/media_value + event CVs).
 *    rpt_all's own media_cv/media_value are NOT reliable substitutes here
 *    (that mart tracks ad_media_cv/value as a reference column only), so
 *    the ads block always comes from rpt_daily, the site/overall block
 *    always comes from rpt_all.
 *
 * All queries are SELECT-only. Caching: 5-min unstable_cache (same TTL as
 * bq-raw.ts) tagged "bq-rpt" so the manual refresh action can purge it.
 */

const CACHE_TTL_SECONDS = 300;
export const BQ_RPT_CACHE_TAG = "bq-rpt";

export type RptClientId = "dozo" | "hs" | "msec" | "ogc" | "ogp";

/** One of the client-specific GA4 key-event columns (ga_cv_* in the marts). */
export interface EventCvDef {
  /** Column suffix — matches ga_cv_{key} in the SQL. */
  key: string;
  /** Display label for the table column / footer. */
  label: string;
}

export interface RptClientMeta {
  /** Display label for the overall-CV layer (the shop system of record). */
  overallCvLabel: string;
  /** Whether the overall layer also carries a revenue value column. */
  hasOverallValue: boolean;
  /** Whether rpt_media carries a per-media overall CV column (dozo only). */
  mediaHasOverallCv: boolean;
  /**
   * Event-level CV columns beyond the primary conversion (purchase).
   * Rendered as additional 会員登録等 columns; excludes add_to_cart
   * (soft signal, not shown by default) and excludes purchase itself
   * (that's the primary GA_CV column, not a secondary one).
   */
  secondaryEvents: EventCvDef[];
}

export const RPT_SUPPORTED: Record<RptClientId, RptClientMeta> = {
  dozo: {
    overallCvLabel: "Shopify CV",
    hasOverallValue: false,
    mediaHasOverallCv: true,
    secondaryEvents: [
      { key: "thanks", label: "Thanks CV" },
      { key: "wedding_ev", label: "Wedding CV" },
    ],
  },
  hs: {
    overallCvLabel: "EC-CUBE CV",
    hasOverallValue: true,
    mediaHasOverallCv: false,
    secondaryEvents: [
      { key: "member", label: "会員登録CV" },
      { key: "contact", label: "問合せCV" },
    ],
  },
  msec: {
    // MSEC は自社EC/shopの売上ソースが無いため overall(全体)売上は持たない
    // （overallCv は null 表示）。レポートの主眼は 媒体CV×GA_CV(購入) の突合。
    overallCvLabel: "全体CV",
    hasOverallValue: false,
    mediaHasOverallCv: false,
    secondaryEvents: [
      { key: "signup", label: "会員登録CV" },
    ],
  },
  ogc: {
    // OGC も自社受注集計ソースなし（overallCv=null）。4媒体の GA×広告突合。
    overallCvLabel: "全体CV",
    hasOverallValue: false,
    mediaHasOverallCv: false,
    secondaryEvents: [
      { key: "member", label: "会員登録CV" },
    ],
  },
  ogp: {
    overallCvLabel: "全体CV",
    hasOverallValue: false,
    mediaHasOverallCv: false,
    secondaryEvents: [
      { key: "member", label: "会員登録CV" },
      { key: "contact", label: "問合せCV" },
    ],
  },
};

export function isRptSupported(clientId: string): clientId is RptClientId {
  // Object.hasOwn を使う（`in` は Object.prototype 継承キー __proto__/constructor/
  // toString/hasOwnProperty 等を true にしてしまい、この allow-list をすり抜けて
  // buildSql の `${clientId}_marts` に混入しうるため）。自社データセットのみ許可。
  return Object.hasOwn(RPT_SUPPORTED, clientId);
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
  /** Legacy aggregate (sum of all GA4 key events). Kept for reference only —
   *  gaCvPurchase is the primary conversion used for GA_CVR/GA_CPA/GA_ROAS. */
  gaCv: number;
  gaValue: number;
  /** Primary conversion (purchase completion). Drives GA_CVR/GA_CPA/GA_ROAS. */
  gaCvPurchase: number;
  /** Per-client secondary key events, keyed by EventCvDef.key
   *  (dozo: thanks/wedding_ev, hs: member/contact). */
  gaCvEvents: Record<string, number>;
  /** GA4 add_to_cart events. Soft signal — not shown as a report column by
   *  default but retained for callers that need it. */
  gaCvAddToCart: number;
}

export interface RptDailyRow extends RptMetrics {
  date: string; // yyyy-mm-dd
}

export interface RptWeeklyRow extends RptMetrics {
  /** Monday of the ISO week (yyyy-mm-dd). */
  weekStart: string;
}

export interface RptMonthlyRow extends RptMetrics {
  /** First day of month (yyyy-mm-dd). */
  month: string;
  /** Target CV/value for the month, from rpt_all.target_cv/target_value.
   *  NULL when no target is set for that month. */
  targetCv: number | null;
  targetValue: number | null;
  /** Overall-CV layer for the month (dozo: shopify_cv/value, hs:
   *  eccube_cv/value), from rpt_all — NULL when not yet available. */
  overallCv: number | null;
  overallValue: number | null;
  /** Achievement rate = overallValue / targetValue (0-1), null if either
   *  side is missing. Callers format as %. */
  achievementRate: number | null;
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
  /** Site-wide GA purchase CV / value (ga4_daily's ecommercePurchases /
   *  purchase_revenue, returns floored at 0 in the mart). This is the
   *  PRIMARY site-wide conversion figure — use this, not gaCvPurchase,
   *  for "GA(サイト全体)" reporting. */
  gaCv: number;
  gaValue: number;
  /** 🔴 Ad-attributed purchase CV (summed from fct_ad_daily via rpt_all's
   *  `ad` CTE — NOT site-wide, despite living on this "site-wide" view).
   *  Kept as a reference/comparison column; do not label it "サイト全体".
   *  See module doc for the verified divergence (dozo 6.3x / hs 2.2x). */
  gaCvPurchase: number;
  /** Ad-attributed secondary key events (same `ad` CTE as gaCvPurchase —
   *  NOT site-wide; ga4_daily has no eventName dimension to derive a
   *  site-wide equivalent), keyed by EventCvDef.key. */
  gaCvEvents: Record<string, number>;
  /** Overall CV layer (dozo: shopify_cv / hs: eccube_cv). NULL until the
   *  shop-side ingest lands — render as "—", never as 0. */
  overallCv: number | null;
  overallValue: number | null;
  /** Ad-platform CV / value rolled up across media (reference columns). */
  adMediaCv: number;
  adMediaValue: number;
  /** Monthly target (rpt_all.target_cv/target_value). NULL for daily rows
   *  and for months with no target configured. */
  targetCv: number | null;
  targetValue: number | null;
  /** External (offline) CV, broken down by source type and totalled.
   *  Uploaded via admin/masters/external-cv → {client}_marts.external_cv_daily,
   *  pre-aggregated to month grain and LEFT JOINed into rpt_all's monthly
   *  rollup only (external CV is an offline, month-oriented layer — the same
   *  monthly-only treatment as shopify_cv / targets). NULL on daily rows and
   *  on months with no external CV uploaded (render as "—", never 0). Kept
   *  separate from the ad-attribution join (no mkey mixing) so it never
   *  distorts GA×ads reconciliation. */
  externalCv: ExternalCvBreakdown | null;
}

/** Per-source external CV counts + total conversions/value for one month. */
export interface ExternalCvBreakdown {
  phone: number;
  store: number;
  event: number;
  form: number;
  other: number;
  /** SUM(conversions) across all sources. */
  total: number;
  /** SUM(conversions_value) across all sources. NULL when no value uploaded. */
  value: number | null;
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

type RptView = "daily" | "weekly" | "monthly" | "media" | "cpn" | "adg" | "all";

/** Per-client event-CV column list: purchase (primary) + secondaryEvents +
 *  add_to_cart, all selected as ga_cv_{key} AS event_{key}. */
function eventCvColumns(clientId: RptClientId): { key: string; expr: string; alias: string }[] {
  const meta = RPT_SUPPORTED[clientId];
  const keys = ["purchase", ...meta.secondaryEvents.map((e) => e.key), "add_to_cart"];
  return keys.map((k) => ({ key: k, expr: `ga_cv_${k}`, alias: `event_${k}` }));
}

function eventCvSelectList(clientId: RptClientId): string {
  return eventCvColumns(clientId)
    .map((c) => `${c.expr} AS ${c.alias}`)
    .join(",\n               ");
}

function eventCvSumSelectList(clientId: RptClientId): string {
  return eventCvColumns(clientId)
    .map((c) => `SUM(${c.expr}) AS ${c.alias}`)
    .join(",\n               ");
}

/** yyyy-mm-dd validation for values interpolated directly into SQL (BQ
 *  client-library parameterisation isn't threaded through buildSql's plain
 *  string return — this module is SELECT-only and range bounds come from
 *  range.ts's ISO-formatted DateRange, but we still guard against malformed
 *  input reaching the query string). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isoDateLiteral(d: string): string {
  if (!ISO_DATE_RE.test(d)) {
    throw new Error(`bq-rpt: invalid ISO date passed to buildSql: ${JSON.stringify(d)}`);
  }
  return `DATE('${d}')`;
}

function buildSql(clientId: RptClientId, view: RptView, range?: { start: string; end: string }): string {
  const project = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  const ds = `\`${project}.${clientId}_marts\``;
  const events = eventCvSelectList(clientId);
  // Explicit column lists only — never SELECT * (view column order differs
  // between clients: dozo has wedding_* columns, hs has eccube_*).
  switch (view) {
    case "daily":
      return `
        SELECT date, cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value,
               ${events}
        FROM ${ds}.rpt_daily
        ORDER BY date`;
    case "weekly": {
      // Filter rpt_daily to the selected [start,end] window BEFORE truncating
      // to week — grouping first and filtering by week_start afterwards
      // (the old approach) pulls in whole weeks that straddle a month
      // boundary, double-counting/leaking days outside the window whenever
      // the 1st of the month isn't a Monday. Filtering first means a
      // straddling week's row only sums the in-window days, so a "This
      // Month" selection never includes the prior month's tail.
      const whereClause = range
        ? `WHERE date >= ${isoDateLiteral(range.start)} AND date <= ${isoDateLiteral(range.end)}`
        : "";
      return `
        SELECT DATE_TRUNC(date, WEEK(MONDAY)) AS week_start,
               SUM(cost) AS cost, SUM(impressions) AS impressions,
               SUM(clicks) AS clicks, SUM(sessions) AS sessions,
               SUM(media_cv) AS media_cv, SUM(media_value) AS media_value,
               SUM(ga_cv) AS ga_cv, SUM(ga_value) AS ga_value,
               ${eventCvSumSelectList(clientId)}
        FROM ${ds}.rpt_daily
        ${whereClause}
        GROUP BY week_start
        ORDER BY week_start`;
    }
    case "monthly":
      // Ads-side block (media_cv/media_value + event CVs), month-truncated
      // from rpt_daily. Site/overall/target block comes from rpt_all
      // (view "all") — combined in the caller (report/page.tsx), not here.
      return `
        SELECT DATE_TRUNC(date, MONTH) AS month,
               SUM(cost) AS cost, SUM(impressions) AS impressions,
               SUM(clicks) AS clicks, SUM(sessions) AS sessions,
               SUM(media_cv) AS media_cv, SUM(media_value) AS media_value,
               SUM(ga_cv) AS ga_cv, SUM(ga_value) AS ga_value,
               ${eventCvSumSelectList(clientId)}
        FROM ${ds}.rpt_daily
        GROUP BY month
        ORDER BY month`;
    case "media": {
      const overall =
        clientId === "dozo" ? "shopify_cv" : "CAST(NULL AS INT64)";
      return `
        SELECT date, media, cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value,
               ${events},
               ${overall} AS overall_cv
        FROM ${ds}.rpt_media
        ORDER BY date, media`;
    }
    case "cpn":
      return `
        SELECT date, media, campaign_id, campaign_name, match_status,
               cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value,
               ${events}
        FROM ${ds}.rpt_cpn
        ORDER BY date, media, campaign_id`;
    case "adg":
      return `
        SELECT date, media, campaign_id, campaign_name,
               ad_group_id, ad_group_name, grain_level, match_status,
               cost, impressions, clicks, sessions,
               media_cv, media_value, ga_cv, ga_value,
               ${events}
        FROM ${ds}.rpt_adg
        ORDER BY date, media, campaign_id, ad_group_id`;
    case "all": {
      const overallCv =
        clientId === "dozo" ? "shopify_cv" : "eccube_cv";
      const overallValue =
        clientId === "dozo" ? "CAST(NULL AS NUMERIC)" : "eccube_value";
      return `
        SELECT granularity, date, cost, sessions, ga_cv, ga_value,
               ${events},
               ${overallCv} AS overall_cv,
               ${overallValue} AS overall_value,
               ad_media_cv, ad_media_value,
               target_cv, target_value,
               ext_cv_phone, ext_cv_store, ext_cv_event, ext_cv_form,
               ext_cv_other, external_cv_total, external_cv_value
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
  // unstable_cache requires JSON-serialisable positional args for its cache
  // key — pass "" (not undefined) when there's no range so the cache key
  // shape stays stable; buildSql treats "" as "no range".
  rangeStart: string,
  rangeEnd: string,
): Promise<RawRow[]> {
  const bq = getBigQuery();
  const range = rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : undefined;
  const [job] = await bq.createQueryJob({
    query: buildSql(clientId, view, range),
    location: BQ_LOCATION,
  });
  const [rows] = await job.getQueryResults();
  // Map to plain JSON-safe objects *before* unstable_cache serialises the
  // result. Two object wrappers appear in results: BigQueryDate ({ value })
  // and NUMERIC as Big.js instances (no .value — coerce via toString()).
  return (rows as unknown as RawRow[]).map((r) => {
    const out: RawRow = {};
    for (const [k, v] of Object.entries(r)) {
      if (v == null) {
        out[k] = null;
      } else if (typeof v === "object") {
        const wrapped = (v as { value?: unknown }).value;
        out[k] =
          typeof wrapped === "string" || typeof wrapped === "number"
            ? wrapped
            : String(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

const _cachedRptQuery = unstable_cache(_runRptQuery, ["bq-rpt-rows"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [BQ_RPT_CACHE_TAG],
});

/** Reads the event_{key} columns produced by eventCvSelectList() into the
 *  {gaCvPurchase, gaCvEvents, gaCvAddToCart} shape. */
function eventCvs(
  clientId: RptClientId,
  r: RawRow,
): { gaCvPurchase: number; gaCvEvents: Record<string, number>; gaCvAddToCart: number } {
  const meta = RPT_SUPPORTED[clientId];
  const gaCvEvents: Record<string, number> = {};
  for (const ev of meta.secondaryEvents) {
    gaCvEvents[ev.key] = _num(r[`event_${ev.key}`]);
  }
  return {
    gaCvPurchase: _num(r.event_purchase),
    gaCvEvents,
    gaCvAddToCart: _num(r.event_add_to_cart),
  };
}

/** Reads the ext_cv_* / external_cv_* columns (present on rpt_all only, and
 *  non-NULL only on monthly rows) into ExternalCvBreakdown. Returns null when
 *  no external CV exists for the row (daily rows, or months with nothing
 *  uploaded) so callers render "—" rather than a spurious all-zero row. */
function externalCv(r: RawRow): ExternalCvBreakdown | null {
  if (r.external_cv_total == null) return null;
  return {
    phone: _num(r.ext_cv_phone),
    store: _num(r.ext_cv_store),
    event: _num(r.ext_cv_event),
    form: _num(r.ext_cv_form),
    other: _num(r.ext_cv_other),
    total: _num(r.external_cv_total),
    value: _numOrNull(r.external_cv_value),
  };
}

function metrics(clientId: RptClientId, r: RawRow): RptMetrics {
  return {
    cost: _num(r.cost),
    impressions: _num(r.impressions),
    clicks: _num(r.clicks),
    sessions: _num(r.sessions),
    mediaCv: _num(r.media_cv),
    mediaValue: _num(r.media_value),
    gaCv: _num(r.ga_cv),
    gaValue: _num(r.ga_value),
    ...eventCvs(clientId, r),
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
  range?: { start: string; end: string },
): Promise<RptFetchResult<T>> {
  try {
    const raw = await _cachedRptQuery(clientId, view, range?.start ?? "", range?.end ?? "");
    return { rows: raw.map(map), fetchedAt: Date.now(), warnings: [] };
  } catch (err) {
    // Tagged with a machine-readable reason ([permission] / [fetch_failed])
    // so the display layer can tell「権限なし」from「取得失敗」without
    // parsing free-form BQ error text (Batch2 監査P0 §4, fetch-warnings.ts).
    return {
      rows: [],
      fetchedAt: Date.now(),
      warnings: [
        tagWarning(
          classifyFetchError(err),
          `bq rpt_${view} fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      ],
    };
  }
}

export function getRptDaily(clientId: RptClientId): Promise<RptFetchResult<RptDailyRow>> {
  return fetchView(clientId, "daily", (r) => ({
    date: _date(r.date),
    ...metrics(clientId, r),
  }));
}

/**
 * Weekly rollup, filtered to [range.start, range.end] BEFORE grouping by
 * ISO week (see buildSql's "weekly" case doc). When range is omitted, all
 * of rpt_daily is grouped (back-compat for callers that want the full
 * history) — report/page.tsx always passes the selected period's range so
 * a week straddling a month boundary only sums the in-window days.
 */
export function getRptWeekly(
  clientId: RptClientId,
  range?: { start: string; end: string },
): Promise<RptFetchResult<RptWeeklyRow>> {
  return fetchView(
    clientId,
    "weekly",
    (r) => ({
      weekStart: _date(r.week_start),
      ...metrics(clientId, r),
    }),
    range,
  );
}

/**
 * Monthly ads-side rollup only (media_cv/media_value/event CVs from
 * rpt_daily, month-truncated). Callers that need targetCv/overallCv must
 * separately merge with getRptAll()'s granularity="monthly" rows (see
 * report/page.tsx) — this fetcher does not join rpt_all itself so it stays
 * a single-table query per fetchView() convention.
 */
export function getRptMonthlyAds(
  clientId: RptClientId,
): Promise<RptFetchResult<RptMetrics & { month: string }>> {
  return fetchView(clientId, "monthly", (r) => ({
    month: _date(r.month),
    ...metrics(clientId, r),
  }));
}

export function getRptMedia(clientId: RptClientId): Promise<RptFetchResult<RptMediaRow>> {
  return fetchView(clientId, "media", (r) => ({
    date: _date(r.date),
    media: mediaLabel(typeof r.media === "string" ? r.media : null),
    ...metrics(clientId, r),
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
    ...metrics(clientId, r),
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
    ...metrics(clientId, r),
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
    ...eventCvs(clientId, r),
    overallCv: _numOrNull(r.overall_cv),
    overallValue: _numOrNull(r.overall_value),
    adMediaCv: _num(r.ad_media_cv),
    adMediaValue: _num(r.ad_media_value),
    targetCv: _numOrNull(r.target_cv),
    targetValue: _numOrNull(r.target_value),
    externalCv: externalCv(r),
  }));
}
