import "server-only";
import { unstable_cache } from "next/cache";
import { getBigQuery } from "@/lib/bigquery";
import { classifyFetchError, tagWarning } from "@/lib/fetch-warnings";
import type { ClientConfig } from "@/config/clients";
import type { DailyRow, DailyFetchResult } from "@/lib/sources/raw";

/**
 * BigQuery-backed implementation of getDailyRows. UNIONs the per-media tables
 * under {client}_marts.* and returns the same DailyRow shape as the
 * Sheet-backed implementation in raw.ts.
 *
 * Why per-media tables: dataset-per-client + table-per-source is the GCP
 * migration v2 layout. We rebuild the unified shape here so callers don't
 * need to know about the storage split.
 *
 * Caching: 1-hour unstable_cache, same TTL as bq-rpt.ts. The marts refresh
 * once daily (daily_sync_all.py), so 1h loses no practical freshness; the
 * dashboard「更新」button purges the "bq-raw" tag via revalidateTag
 * (dashboard/actions.ts refreshClientData) for on-demand re-reads. Raised
 * from 300s on 2026-07-04 (監査#11: concurrent visitors each re-triggering
 * full BQ scans every 5 min).
 */

const CACHE_TTL_SECONDS = 3600;

const SUPPORTED_CLIENTS = new Set([
  "hs",
  "dozo",
  "msec",
  "ogc",
  "ogp",
  "chakin",
]);

interface RawBqRow {
  date: string | { value: string };
  media: string;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_group_id: string | null;
  ad_group_name: string | null;
  cost: string | number | null;
  impressions: string | number | null;
  clicks: string | number | null;
  conversions: string | number | null;
  conversions_value: string | number | null;
  /** Yahoo-only: ads_yahoo_daily.campaign_tracking_id, the numeric id GA4
   *  surfaces (as sessionCampaignName) for Yahoo paid sessions. NULL for all
   *  other media. See DailyRowWithTracking below. */
  campaign_tracking_id: string | null;
}

/**
 * DailyRow widened with the optional GA4 JOIN key for media where the
 * platform campaign id doesn't surface directly in GA4 (currently: Yahoo,
 * via ads_yahoo_daily.campaign_tracking_id — confirmed 2026-07-02 that GA4
 * sessionCampaignName carries this same numeric id for yhl/cpc sessions,
 * while sessionCampaignId is always "(not set)"). `DailyRow` itself (raw.ts)
 * is not extended so the Sheet-backed path is unaffected; callers that need
 * this field read it off rows returned by getDailyRowsFromBq via a local
 * cast (see ads/page.tsx).
 */
export interface DailyRowWithTracking extends DailyRow {
  trackingId?: string;
}

function _date(v: string | { value: string }): string {
  if (typeof v === "string") return v;
  return v?.value ?? "";
}

function _num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function _runQuery(client: string): Promise<DailyRowWithTracking[]> {
  const project = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  // Build UNION ALL across the 4 media tables. NULL casts let us include
  // tables that don't exist for this client by wrapping each SELECT with a
  // table-existence check via system metadata. Simpler: only union tables
  // that are known to exist per the client matrix.
  const matrix: Record<string, string[]> = {
    hs: ["google", "meta", "microsoft", "yahoo"],
    dozo: ["google", "meta"],
    msec: ["google"],
    ogc: ["google", "meta", "microsoft", "yahoo"],
    ogp: ["google", "meta", "microsoft", "yahoo"],
    chakin: ["google", "meta"],
  };
  const sources = matrix[client] ?? [];
  if (sources.length === 0) return [];

  const mediaLabel: Record<string, string> = {
    google: "Google",
    meta: "meta",
    microsoft: "Microsoft",
    yahoo: "Yahoo",
  };

  const selects = sources.map((src) => {
    const costCol = src === "google" || src === "yahoo" ? "cost" : "spend";
    const adgIdCol = src === "meta" ? "adset_id" : "ad_group_id";
    const adgNameCol = src === "meta" ? "adset_name" : "ad_group_name";
    // Only ads_yahoo_daily has campaign_tracking_id (the numeric id GA4
    // echoes back as sessionCampaignName for yhl/cpc sessions). Other media
    // NULL this out so the UNION ALL column set stays aligned.
    const trackingCol = src === "yahoo" ? "campaign_tracking_id" : "CAST(NULL AS STRING)";
    return `
      SELECT
        date,
        '${mediaLabel[src]}' AS media,
        campaign_id,
        campaign_name,
        ${adgIdCol} AS ad_group_id,
        ${adgNameCol} AS ad_group_name,
        ${costCol} AS cost,
        impressions,
        clicks,
        conversions,
        conversions_value,
        ${trackingCol} AS campaign_tracking_id
      FROM \`${project}.${client}_marts.ads_${src}_daily\`
    `;
  });

  // LEFT JOIN campaign_master for the utm_* echo. Display name prefers the ad
  // platform's native campaign_name — utm_campaign is a JOIN key that under
  // the 入稿規約 is often just the numeric campaign_id (Meta/Yahoo/MS), so
  // using it as the label rendered raw IDs in the UI (CEO-reported 2026-07-02;
  // supersedes the Step-7 utm-override decision in 068946e).
  const sql = `
    WITH ads AS (
      ${selects.join("\nUNION ALL\n")}
    )
    SELECT
      a.date,
      a.media,
      a.campaign_id,
      COALESCE(
        NULLIF(a.campaign_name, ''),
        cm_ad.utm_campaign,
        cm_adg.utm_campaign,
        cm_cpn.utm_campaign,
        a.campaign_id
      ) AS campaign_name,
      a.ad_group_id,
      a.ad_group_name,
      a.cost,
      a.impressions,
      a.clicks,
      a.conversions,
      a.conversions_value,
      a.campaign_tracking_id,
      -- utm_* echoed for transparency (debug / future explicit JOIN)
      COALESCE(cm_ad.utm_source, cm_adg.utm_source, cm_cpn.utm_source) AS utm_source,
      COALESCE(cm_ad.utm_medium, cm_adg.utm_medium, cm_cpn.utm_medium) AS utm_medium
    FROM ads a
    LEFT JOIN \`${project}.${client}_marts.campaign_master\` cm_ad
      ON LOWER(cm_ad.media) = LOWER(a.media)
      AND cm_ad.platform_campaign_id = a.campaign_id
      AND cm_ad.platform_adgroup_id = a.ad_group_id
      AND cm_ad.platform_ad_id IS NOT NULL
    LEFT JOIN \`${project}.${client}_marts.campaign_master\` cm_adg
      ON LOWER(cm_adg.media) = LOWER(a.media)
      AND cm_adg.platform_campaign_id = a.campaign_id
      AND cm_adg.platform_adgroup_id = a.ad_group_id
      AND cm_adg.platform_ad_id IS NULL
    LEFT JOIN \`${project}.${client}_marts.campaign_master\` cm_cpn
      ON LOWER(cm_cpn.media) = LOWER(a.media)
      AND cm_cpn.platform_campaign_id = a.campaign_id
      AND cm_cpn.platform_adgroup_id IS NULL
      AND cm_cpn.platform_ad_id IS NULL
    ORDER BY a.date, a.media, a.campaign_id, a.ad_group_id
  `;

  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: sql,
    location: "asia-northeast1",
    // Cost/latency guards (監査#11) — same rationale as bq-rpt.ts: kill
    // runaway jobs at 30s and fail (charge-free) any query scanning >2GB.
    // Normal reads are far below the cap, so returned values are unaffected;
    // a tripped cap surfaces through the existing catch → warnings path.
    jobTimeoutMs: 30_000,
    maximumBytesBilled: String(2 * 1024 * 1024 * 1024), // 2 GiB
  });
  const [rows] = await job.getQueryResults();
  const typed = rows as unknown as RawBqRow[];

  return typed.map((r) => ({
    media: r.media,
    date: _date(r.date),
    campaignId: r.campaign_id ?? "",
    campaignName: r.campaign_name ?? "",
    adgroupId: r.ad_group_id ?? "",
    adgroupName: r.ad_group_name ?? "",
    currency: "JPY",
    cost: _num(r.cost),
    impressions: _num(r.impressions),
    clicks: _num(r.clicks),
    conversions: _num(r.conversions),
    conversionValue: _num(r.conversions_value),
    ...(r.campaign_tracking_id ? { trackingId: r.campaign_tracking_id } : {}),
  }));
}

const _cachedQuery = unstable_cache(
  _runQuery,
  ["bq-raw-daily-rows"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["bq-raw"] },
);

/**
 * BigQuery-backed equivalent of getDailyRows in raw.ts.
 *
 * Returns the same DailyFetchResult shape so callers can swap implementations
 * via the BQ_SOURCE_RAW env flag (see raw.ts).
 */
export async function getDailyRowsFromBq(
  client: ClientConfig,
): Promise<DailyFetchResult> {
  const warnings: string[] = [];
  if (!SUPPORTED_CLIENTS.has(client.id)) {
    return {
      rows: [],
      fetchedAt: Date.now(),
      isMock: false,
      warnings: [`bq: client ${client.id} not in supported set`],
    };
  }
  try {
    const rows = await _cachedQuery(client.id);
    return { rows, fetchedAt: Date.now(), isMock: false, warnings };
  } catch (err) {
    // Reason-tagged ([permission] / [fetch_failed]) — see fetch-warnings.ts.
    warnings.push(
      tagWarning(
        classifyFetchError(err),
        `bq fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    return { rows: [], fetchedAt: Date.now(), isMock: false, warnings };
  }
}
