import "server-only";
import { unstable_cache } from "next/cache";
import { getBigQuery } from "@/lib/bigquery";
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
 * Caching: 5-minute LRU via unstable_cache, same TTL as the Sheet path.
 */

const CACHE_TTL_SECONDS = 300;

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

async function _runQuery(client: string): Promise<DailyRow[]> {
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
        conversions_value
      FROM \`${project}.${client}_marts.ads_${src}_daily\`
    `;
  });

  const sql = selects.join("\nUNION ALL\n") + "\nORDER BY date, media, campaign_id, ad_group_id";

  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: sql,
    location: "asia-northeast1",
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
    warnings.push(`bq fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return { rows: [], fetchedAt: Date.now(), isMock: false, warnings };
  }
}
