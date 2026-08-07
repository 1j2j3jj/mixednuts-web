import "server-only";
import { unstable_cache } from "next/cache";
import { BQ_LOCATION, getBigQuery } from "@/lib/bigquery";
import { classifyFetchError, tagWarning } from "@/lib/fetch-warnings";

const CACHE_TTL_SECONDS = 3600;
export const BQ_CHAKIN_CACHE_TAG = "bq-chakin";

export type ChakinClientId = "chakin";

const CHAKIN_DATASET: Record<ChakinClientId, string> = {
  chakin: "chakin_marts",
};

type BqVal = string | number | null | undefined | { value: string };

// BQ NUMERIC は Node クライアントでは Big インスタンス（.value を持たない）で返る。
// v.value 参照だと NaN→0 に化けて COST が全額消える（実測 2026-08-07）。
// String(v) は Big/BigQueryDate どちらも正しい文字列になる。
function coerceNum(v: NonNullable<BqVal>): number {
  if (typeof v === "number") return v;
  if (typeof v === "object") {
    const inner = (v as { value?: unknown }).value;
    return Number(inner != null ? inner : String(v));
  }
  return Number(v);
}

function asNum(v: BqVal): number {
  if (v == null) return 0;
  const n = coerceNum(v);
  return Number.isFinite(n) ? n : 0;
}

function asNumOrNull(v: BqVal): number | null {
  if (v == null) return null;
  const n = coerceNum(v);
  return Number.isFinite(n) ? n : null;
}

function asDate(v: BqVal): string | null {
  if (v == null) return null;
  if (typeof v === "object") return v.value ?? null;
  return String(v);
}

function canonicalMediaExpr(col: string): string {
  return `CASE LOWER(${col})
    WHEN 'google' THEN 'Google'
    WHEN 'meta' THEN 'Meta'
    WHEN 'yahoo' THEN 'Yahoo'
    WHEN 'tiktok' THEN 'TikTok'
    ELSE ${col}
  END`;
}

export interface ChakinChannelRow {
  channelGroup: "広告" | "アライアンス" | "非広告" | "不明";
  validCv: number;
  cost: number;
  avgMonthlyPremium: number | null;
  cpa: number | null;
}

export interface ChakinMediaRow {
  media: string;
  cost: number;
  clicks: number;
  platformCv: number;
  ga4Complete: number;
  validCv: number;
  avgMonthlyPremium: number | null;
  cpa: number | null;
}

export interface ChakinCampaignRow {
  media: string;
  campaignName: string;
  cost: number;
  clicks: number;
  platformCv: number;
  ga4Complete: number;
  validCv: number;
  avgMonthlyPremium: number | null;
  cpa: number | null;
}

export interface ChakinFunnel {
  sessions: number;
  insuranceStart: number;
  insuranceSubmit: number;
  ga4Complete: number;
  grapheneValidCv: number;
  mediaCv: number;
}

export interface ChakinDashboardData {
  channelRows: ChakinChannelRow[];
  mediaRows: ChakinMediaRow[];
  campaignRows: ChakinCampaignRow[];
  funnel: ChakinFunnel;
  adCost: number;
  adClicks: number;
  adValidCv: number;
  totalValidCv: number;
  unattributedValidCv: number;
}

export interface ChakinDashboardResult {
  data: ChakinDashboardData;
  fetchedAt: number;
  warnings: string[];
}

export interface ChakinAnchorResult {
  anchorDate: string | null;
  sourceLatestDates: {
    graphene: string | null;
    ads: string | null;
    ga4: string | null;
  };
  fetchedAt: number;
  warnings: string[];
}

function emptyData(): ChakinDashboardData {
  return {
    channelRows: [
      {
        channelGroup: "広告",
        validCv: 0,
        cost: 0,
        avgMonthlyPremium: null,
        cpa: null,
      },
      {
        channelGroup: "アライアンス",
        validCv: 0,
        cost: 0,
        avgMonthlyPremium: null,
        cpa: null,
      },
      {
        channelGroup: "非広告",
        validCv: 0,
        cost: 0,
        avgMonthlyPremium: null,
        cpa: null,
      },
      {
        channelGroup: "不明",
        validCv: 0,
        cost: 0,
        avgMonthlyPremium: null,
        cpa: null,
      },
    ],
    mediaRows: [],
    campaignRows: [],
    funnel: {
      sessions: 0,
      insuranceStart: 0,
      insuranceSubmit: 0,
      ga4Complete: 0,
      grapheneValidCv: 0,
      mediaCv: 0,
    },
    adCost: 0,
    adClicks: 0,
    adValidCv: 0,
    totalValidCv: 0,
    unattributedValidCv: 0,
  };
}

const EMPTY_SOURCE_LATEST = {
  graphene: null,
  ads: null,
  ga4: null,
} as const;

async function runQuery(
  query: string,
  params: Record<string, string>,
): Promise<Array<Record<string, BqVal>>> {
  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query,
    location: BQ_LOCATION,
    // NOTE: `types: { start: "DATE" }` を付けると @google-cloud/bigquery が
    // 文字列値を黙って不一致にし全クエリが0件になる（実測 2026-08-07:
    // types+文字列=0件 / 素の文字列=3,270件）。型はライブラリの推論に任せる。
    params,
    jobTimeoutMs: 30_000,
    maximumBytesBilled: String(2 * 1024 * 1024 * 1024),
  });
  const [rows] = await job.getQueryResults();
  return rows as Array<Record<string, BqVal>>;
}

async function _runAnchorQuery(clientId: ChakinClientId): Promise<{
  anchorDate: string | null;
  sourceLatestDates: {
    graphene: string | null;
    ads: string | null;
    ga4: string | null;
  };
}> {
  const project = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  const dataset = CHAKIN_DATASET[clientId];
  const ds = `\`${project}.${dataset}\``;

  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: `
      WITH latest AS (
        SELECT
          (SELECT MAX(date) FROM ${ds}.graphene_cv) AS graphene_max_date,
          (SELECT MAX(date) FROM ${ds}.v_ads_daily_unified) AS ads_max_date,
          (SELECT MAX(date) FROM ${ds}.ga4_ad_daily) AS ga4_max_date
      )
      SELECT
        graphene_max_date,
        ads_max_date,
        ga4_max_date,
        (SELECT MAX(d) FROM UNNEST([graphene_max_date, ads_max_date, ga4_max_date]) AS d) AS anchor_date
      FROM latest
    `,
    location: BQ_LOCATION,
    jobTimeoutMs: 30_000,
    maximumBytesBilled: String(2 * 1024 * 1024 * 1024),
  });
  const [rows] = await job.getQueryResults();
  const row = (rows as Array<Record<string, BqVal>>)[0];
  if (!row) {
    return {
      anchorDate: null,
      sourceLatestDates: { ...EMPTY_SOURCE_LATEST },
    };
  }
  return {
    anchorDate: asDate(row.anchor_date),
    sourceLatestDates: {
      graphene: asDate(row.graphene_max_date),
      ads: asDate(row.ads_max_date),
      ga4: asDate(row.ga4_max_date),
    },
  };
}

async function _runDashboardQuery(
  clientId: ChakinClientId,
  start: string,
  end: string,
): Promise<ChakinDashboardData> {
  const project = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  const dataset = CHAKIN_DATASET[clientId];
  const ds = `\`${project}.${dataset}\``;

  const mediaExpr = canonicalMediaExpr("media");
  const gaMediaExpr = canonicalMediaExpr("platform");

  const channelSql = `
    WITH channel_defs AS (  -- "groups" は BQ 予約語
      SELECT channel_group
      FROM UNNEST(['広告', 'アライアンス', '非広告', '不明']) AS channel_group
    ),
    cv AS (
      SELECT
        channel_group,
        COUNTIF(is_valid) AS valid_cv,
        AVG(IF(is_valid, CAST(monthly_premium AS FLOAT64), NULL)) AS avg_monthly_premium
      FROM ${ds}.graphene_cv
      WHERE date BETWEEN @start AND @end
      GROUP BY channel_group
    ),
    ad_cost AS (
      SELECT SUM(cost_net) AS cost
      FROM ${ds}.v_ads_daily_unified
      WHERE date BETWEEN @start AND @end
    )
    SELECT
      g.channel_group,
      COALESCE(cv.valid_cv, 0) AS valid_cv,
      IF(g.channel_group = '広告', COALESCE(ad_cost.cost, 0), 0) AS cost,
      cv.avg_monthly_premium
    FROM channel_defs g
    LEFT JOIN cv USING(channel_group)
    CROSS JOIN ad_cost
    ORDER BY CASE g.channel_group
      WHEN '広告' THEN 1
      WHEN 'アライアンス' THEN 2
      WHEN '非広告' THEN 3
      WHEN '不明' THEN 4
      ELSE 99
    END
  `;

  const mediaSql = `
    WITH ads AS (
      SELECT
        COALESCE(${mediaExpr}, '媒体不明') AS media,
        SUM(cost_net) AS cost,
        SUM(clicks) AS clicks,
        SUM(conversions) AS platform_cv
      FROM ${ds}.v_ads_daily_unified
      WHERE date BETWEEN @start AND @end
      GROUP BY 1
    ),
    cv AS (
      SELECT
        -- media IS NULL も「媒体不明」行として含める（KPI広告CVとの合計一致、監修3巡目P0-1）
        COALESCE(${mediaExpr}, '媒体不明') AS media,
        COUNTIF(is_valid) AS valid_cv,
        AVG(IF(is_valid, CAST(monthly_premium AS FLOAT64), NULL)) AS avg_monthly_premium
      FROM ${ds}.graphene_cv
      WHERE date BETWEEN @start AND @end
        AND channel_group = '広告'
      GROUP BY 1
    ),
    ga AS (
      SELECT
        COALESCE(${gaMediaExpr}, '媒体不明') AS media,
        SUM(ga_cv_insurance_complete) AS ga4_complete
      FROM ${ds}.ga4_ad_daily
      WHERE date BETWEEN @start AND @end
      GROUP BY 1
    )
    SELECT
      COALESCE(a.media, cv.media, ga.media) AS media,
      COALESCE(a.cost, 0) AS cost,
      COALESCE(a.clicks, 0) AS clicks,
      COALESCE(a.platform_cv, 0) AS platform_cv,
      COALESCE(ga.ga4_complete, 0) AS ga4_complete,
      COALESCE(cv.valid_cv, 0) AS valid_cv,
      cv.avg_monthly_premium
    FROM ads a
    FULL OUTER JOIN cv USING(media)
    FULL OUTER JOIN ga USING(media)
    WHERE COALESCE(a.cost, 0) > 0 OR COALESCE(cv.valid_cv, 0) > 0 OR COALESCE(ga.ga4_complete, 0) > 0
    ORDER BY cost DESC, valid_cv DESC
  `;

  const campaignSql = `
    WITH ads AS (
      SELECT
        COALESCE(${mediaExpr}, '媒体不明') AS media,
        COALESCE(NULLIF(campaign_name, ''), '(no campaign)') AS campaign_name,
        SUM(cost_net) AS cost,
        SUM(clicks) AS clicks,
        SUM(conversions) AS platform_cv
      FROM ${ds}.v_ads_daily_unified
      WHERE date BETWEEN @start AND @end
      GROUP BY 1, 2
    ),
    ga AS (
      SELECT
        COALESCE(${gaMediaExpr}, '媒体不明') AS media,
        -- ga4_ad_daily の列名は campaign（campaign_name ではない）
        COALESCE(NULLIF(campaign, ''), '(no campaign)') AS campaign_name,
        SUM(ga_cv_insurance_complete) AS ga4_complete
      FROM ${ds}.ga4_ad_daily
      WHERE date BETWEEN @start AND @end
      GROUP BY 1, 2
    ),
    cv AS (
      SELECT
        COALESCE(${mediaExpr}, '媒体不明') AS media,
        COALESCE(NULLIF(campaign_name, ''), '(no campaign)') AS campaign_name,
        COUNTIF(is_valid) AS valid_cv,
        AVG(IF(is_valid, CAST(monthly_premium AS FLOAT64), NULL)) AS avg_monthly_premium
      FROM ${ds}.graphene_cv
      WHERE date BETWEEN @start AND @end
        AND channel_group = '広告'
      GROUP BY 1, 2
    )
    SELECT
      COALESCE(a.media, cv.media, ga.media) AS media,
      COALESCE(a.campaign_name, cv.campaign_name, ga.campaign_name) AS campaign_name,
      COALESCE(a.cost, 0) AS cost,
      COALESCE(a.clicks, 0) AS clicks,
      COALESCE(a.platform_cv, 0) AS platform_cv,
      COALESCE(ga.ga4_complete, 0) AS ga4_complete,
      COALESCE(cv.valid_cv, 0) AS valid_cv,
      cv.avg_monthly_premium
    FROM ads a
    FULL OUTER JOIN cv USING(media, campaign_name)
    FULL OUTER JOIN ga USING(media, campaign_name)
    WHERE COALESCE(a.cost, 0) > 0 OR COALESCE(cv.valid_cv, 0) > 0 OR COALESCE(ga.ga4_complete, 0) > 0
    ORDER BY cost DESC, valid_cv DESC
    LIMIT 120
  `;

  const funnelSql = `
    SELECT
      (SELECT SUM(sessions) FROM ${ds}.ga4_ad_daily WHERE date BETWEEN @start AND @end) AS sessions,
      (SELECT SUM(ga_cv_insurance_start) FROM ${ds}.ga4_ad_daily WHERE date BETWEEN @start AND @end) AS insurance_start,
      (SELECT SUM(ga_cv_insurance_submit) FROM ${ds}.ga4_ad_daily WHERE date BETWEEN @start AND @end) AS insurance_submit,
      (SELECT SUM(ga_cv_insurance_complete) FROM ${ds}.ga4_ad_daily WHERE date BETWEEN @start AND @end) AS ga4_complete,
      (SELECT COUNT(*) FROM ${ds}.graphene_cv WHERE date BETWEEN @start AND @end AND is_valid) AS graphene_valid_cv,
      (SELECT SUM(conversions) FROM ${ds}.v_ads_daily_unified WHERE date BETWEEN @start AND @end) AS media_cv
  `;

  const params = { start, end };
  const [channelRowsRaw, mediaRowsRaw, campaignRowsRaw, funnelRowsRaw] =
    await Promise.all([
      runQuery(channelSql, params),
      runQuery(mediaSql, params),
      runQuery(campaignSql, params),
      runQuery(funnelSql, params),
    ]);

  const channelRows = channelRowsRaw.map((row) => {
    const cost = asNum(row.cost);
    const validCv = asNum(row.valid_cv);
    const avgMonthlyPremium = asNumOrNull(row.avg_monthly_premium);
    const cpa = validCv > 0 && cost > 0 ? cost / validCv : null;
    return {
      channelGroup: String(row.channel_group) as ChakinChannelRow["channelGroup"],
      validCv,
      cost,
      avgMonthlyPremium,
      cpa,
    };
  });

  const mediaRows = mediaRowsRaw.map((row) => {
    const cost = asNum(row.cost);
    const validCv = asNum(row.valid_cv);
    const avgMonthlyPremium = asNumOrNull(row.avg_monthly_premium);
    const cpa = validCv > 0 && cost > 0 ? cost / validCv : null;
    return {
      media: String(row.media ?? ""),
      cost,
      clicks: asNum(row.clicks),
      platformCv: asNum(row.platform_cv),
      ga4Complete: asNum(row.ga4_complete),
      validCv,
      avgMonthlyPremium,
      cpa,
    };
  });

  const campaignRows = campaignRowsRaw.map((row) => {
    const cost = asNum(row.cost);
    const validCv = asNum(row.valid_cv);
    const avgMonthlyPremium = asNumOrNull(row.avg_monthly_premium);
    const cpa = validCv > 0 && cost > 0 ? cost / validCv : null;
    return {
      media: String(row.media ?? ""),
      campaignName: String(row.campaign_name ?? "(no campaign)").replace(
        "(no campaign)",
        "キャンペーン未判定",
      ),
      cost,
      clicks: asNum(row.clicks),
      platformCv: asNum(row.platform_cv),
      ga4Complete: asNum(row.ga4_complete),
      validCv,
      avgMonthlyPremium,
      cpa,
    };
  });

  const funnelRow = funnelRowsRaw[0] ?? {};
  const funnel: ChakinFunnel = {
    sessions: asNum(funnelRow.sessions),
    insuranceStart: asNum(funnelRow.insurance_start),
    insuranceSubmit: asNum(funnelRow.insurance_submit),
    ga4Complete: asNum(funnelRow.ga4_complete),
    grapheneValidCv: asNum(funnelRow.graphene_valid_cv),
    mediaCv: asNum(funnelRow.media_cv),
  };

  const adRow = channelRows.find((r) => r.channelGroup === "広告");
  const unattributedRow = channelRows.find((r) => r.channelGroup === "不明");
  const adCost = adRow?.cost ?? 0;
  const adClicks = mediaRows.reduce((sum, row) => sum + row.clicks, 0);
  const adValidCv = adRow?.validCv ?? 0;
  const totalValidCv = channelRows.reduce((sum, r) => sum + r.validCv, 0);
  const unattributedValidCv = unattributedRow?.validCv ?? 0;

  return {
    channelRows,
    mediaRows,
    campaignRows,
    funnel,
    adCost,
    adClicks,
    adValidCv,
    totalValidCv,
    unattributedValidCv,
  };
}

const _cachedAnchorQuery = unstable_cache(
  _runAnchorQuery,
  ["bq-chakin-anchor"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: [BQ_CHAKIN_CACHE_TAG],
  },
);

const _cachedDashboardQuery = unstable_cache(
  _runDashboardQuery,
  ["bq-chakin-dashboard"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: [BQ_CHAKIN_CACHE_TAG],
  },
);

export async function getChakinAnchorDate(
  clientId: string,
): Promise<ChakinAnchorResult> {
  if (clientId !== "chakin") {
    return {
      anchorDate: null,
      sourceLatestDates: { ...EMPTY_SOURCE_LATEST },
      fetchedAt: Date.now(),
      warnings: [`bq-chakin: unsupported client ${clientId}`],
    };
  }
  try {
    const anchor = await _cachedAnchorQuery(clientId);
    return { ...anchor, fetchedAt: Date.now(), warnings: [] };
  } catch (err) {
    console.error("[bq-chakin] anchor fetch failed:", err);
    return {
      anchorDate: null,
      sourceLatestDates: { ...EMPTY_SOURCE_LATEST },
      fetchedAt: Date.now(),
      warnings: [
        tagWarning(
          classifyFetchError(err),
          `bq chakin anchor fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      ],
    };
  }
}

export async function getChakinDashboardData(
  clientId: string,
  range: { start: string; end: string },
): Promise<ChakinDashboardResult> {
  if (clientId !== "chakin") {
    return {
      data: emptyData(),
      fetchedAt: Date.now(),
      warnings: [`bq-chakin: unsupported client ${clientId}`],
    };
  }
  try {
    const data = await _cachedDashboardQuery(clientId, range.start, range.end);
    return { data, fetchedAt: Date.now(), warnings: [] };
  } catch (err) {
    console.error("[bq-chakin] dashboard fetch failed:", err);
    return {
      data: emptyData(),
      fetchedAt: Date.now(),
      warnings: [
        tagWarning(
          classifyFetchError(err),
          `bq chakin fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      ],
    };
  }
}
