import "server-only";
import { getBigQuery } from "@/lib/bigquery";
import { unstable_cache } from "next/cache";
import type { ClientConfig, MonthlyTargets } from "@/config/clients";
import type { ChannelGroup } from "@/lib/sources/ga4";

/**
 * Maps GA4's default channel grouping onto the 計画データの channel labels
 * (organic / direct / mail / referral / 広告). GA4 channels with no mapping
 * (e.g. an "Other" bucket no target budgets for) fall into "その他" —
 * rendered with actuals only, no target/achievement.
 *
 * Input is the already-normalised `ChannelGroup` (see ga4.ts CHANNEL_NORMAL),
 * not GA4's raw defaultChannelGroup string — raw names like "Paid Shopping"
 * and "Cross-network" are folded into "Paid Search" upstream, and "Display"
 * into "Paid Social", before reaching this map.
 */
export const GA4_TO_PLAN_CHANNEL: Record<ChannelGroup, string> = {
  "Organic Search": "organic",
  Direct: "direct",
  Email: "mail",
  Referral: "referral",
  "Paid Search": "広告",
  "Paid Social": "広告",
  Other: "その他",
};

/** Channel label shown for GA4 channels with no counterpart in 計画データ. */
export const UNMAPPED_PLAN_CHANNEL = "その他";

/**
 * Monthly targets source. Resolution order (first hit wins), evaluated
 * per-field so a partially-populated higher source doesn't blank out lower ones:
 *
 *   1. BigQuery `app_analytics.targets_long` — 正本（tidy 形式・2026-07-03 統一）。
 *      client-facing self-upload (settings/targets) の書き込み先。metric×channel×
 *      year_month の long 行を月内で SUM して MonthlyTargets に集計する（_bqTargetsCached）。
 *   2. BigQuery `app_analytics.targets_monthly` — wide fallback。admin 一括
 *      アップローダ (masters.ts) のテーブル。long に行が無い月のフォールバック。
 *   3. なければ **null（未設定）** — UI は「—」を表示し、達成率・ペース計算を
 *      スキップする。旧 CEO 計画 Sheet / ClientConfig.monthlyTargets の静的
 *      フォールバックは 2026-07-08 に廃止（CEO 決定: アップロードが無ければ
 *      目標は未設定として扱う。Sheet はタブ改名で 400 を出し続けており、
 *      targets_long 正本化後は値としても使われていなかった）。
 *
 * 0 と null の区別: アップロードされた 0 は「目標ゼロを設定した」として per-field
 * で採用される。null は「未設定」でフォールスルー/「—」表示。
 */

/**
 * Preserve NULL as null (so it can fall through per-field) while coercing real
 * values to a finite number. BQ NUMERIC columns arrive as Big.js instances
 * (no plain number) — Number() coerces them via valueOf()/toString(). An empty
 * string or non-finite value is treated as "not set" (null), same as NULL.
 */
function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** All-null targets — "目標未設定". Fresh object per call (callers may spread). */
export function emptyTargets(): MonthlyTargets {
  return { revenue: null, conversions: null, adSpendBudget: null, roasPct: null, cpa: null };
}

/**
 * Aggregate app_analytics.targets_long (tidy 形式・2026-07-03 統一) for one month
 * into the MonthlyTargets shape, matching the dashboard's KPI definitions.
 * This is the primary target of record.
 *
 *   revenue       = SUM(value WHERE metric='受注金額')         全チャネル合計
 *   conversions   = SUM(value WHERE metric='受注件数')         全チャネル合計
 *   adSpendBudget = SUM(value WHERE metric='広告費用')         全チャネル合計
 *   roasPct       = 受注金額(広告) / 広告費用(広告) × 100
 *   cpa           = 広告費用(広告) / 受注件数(広告)
 *
 * 「全体」チャネル行を metric に持つデータ（全体集計のみで channel 別が無い）にも
 * 対応: 全チャネル SUM は '全体' 行だけでも合計として成立する。ただし roasPct/cpa は
 * 「広告」チャネルの内訳が要るため、'広告' 行が無いときは下位ソースに委ねる。
 *
 * kind='目標' のみを読む（将来 '実績' が同居しても目標だけを対象にする）。
 * 各フィールドは 0 と「行なし(NULL)」を区別する: 該当 metric の行が 1 件でもあれば
 * その SUM（0 でも）を採用、行が皆無なら null にしてフォールスルー。
 */
const _bqTargetsCached = unstable_cache(
  async (clientId: string, yearMonth: string): Promise<Partial<MonthlyTargets> | null> => {
    try {
      const bq = getBigQuery();
      const [job] = await bq.createQueryJob({
        query: `
          SELECT
            SUM(IF(metric='受注金額', value, NULL)) AS revenue,
            SUM(IF(metric='受注件数', value, NULL)) AS conversions,
            SUM(IF(metric='広告費用', value, NULL)) AS ad_spend_budget,
            SUM(IF(metric='受注金額' AND channel='広告', value, NULL)) AS ad_revenue,
            SUM(IF(metric='受注件数' AND channel='広告', value, NULL)) AS ad_cv,
            SUM(IF(metric='広告費用' AND channel='広告', value, NULL)) AS ad_spend
          FROM \`ai-agent-mixednuts.app_analytics.targets_long\`
          WHERE client_id = @cid
            AND year_month = DATE(@ym || '-01')
            AND (kind = '目標' OR kind IS NULL)
        `,
        location: "asia-northeast1",
        params: { cid: clientId, ym: yearMonth },
        types: { cid: "STRING", ym: "STRING" },
      });
      const [rows] = await job.getQueryResults();
      if (!rows || rows.length === 0) return null;
      const r = rows[0] as Record<string, unknown>;

      // SUM over zero matched rows is NULL in BQ → numOrNull → null → fall
      // through for that field. A matched metric (even summing to 0)
      // yields a finite number and wins.
      const revenue = numOrNull(r.revenue);
      const conversions = numOrNull(r.conversions);
      const adSpendBudget = numOrNull(r.ad_spend_budget);
      const adRevenue = numOrNull(r.ad_revenue);
      const adCv = numOrNull(r.ad_cv);
      const adSpend = numOrNull(r.ad_spend);

      // No target rows at all for this (client, month).
      if (
        revenue == null &&
        conversions == null &&
        adSpendBudget == null &&
        adRevenue == null &&
        adCv == null &&
        adSpend == null
      ) {
        return null;
      }

      const out: Partial<MonthlyTargets> = {};
      if (revenue != null) out.revenue = revenue;
      if (conversions != null) out.conversions = conversions;
      if (adSpendBudget != null) out.adSpendBudget = adSpendBudget;
      // roasPct / cpa は「広告」チャネル内訳から導出。内訳が無ければ下位へ委ねる。
      if (adSpend != null && adSpend > 0 && adRevenue != null) {
        out.roasPct = Math.round((adRevenue / adSpend) * 100);
      }
      if (adCv != null && adCv > 0 && adSpend != null) {
        out.cpa = Math.round(adSpend / adCv);
      }
      return out;
    } catch (err) {
      console.error("[target] BQ targets_long fetch failed:", err);
      return null;
    }
  },
  ["bq-targets-long"],
  { revalidate: 300, tags: ["bq-targets"] },
);

/** Per-channel target from targets_long for one month (channel='全体' を除く). */
interface ChannelLongTarget {
  channel: string;
  revenue: number;
  conversions: number;
}

const _bqChannelTargetsLongCached = unstable_cache(
  async (clientId: string, yearMonth: string): Promise<ChannelLongTarget[]> => {
    try {
      const bq = getBigQuery();
      const [job] = await bq.createQueryJob({
        query: `
          SELECT
            channel,
            SUM(IF(metric='受注金額', value, 0)) AS revenue,
            SUM(IF(metric='受注件数', value, 0)) AS conversions
          FROM \`ai-agent-mixednuts.app_analytics.targets_long\`
          WHERE client_id = @cid
            AND year_month = DATE(@ym || '-01')
            AND (kind = '目標' OR kind IS NULL)
            AND channel != '全体'
            AND metric IN ('受注金額', '受注件数')
          GROUP BY channel
        `,
        location: "asia-northeast1",
        params: { cid: clientId, ym: yearMonth },
        types: { cid: "STRING", ym: "STRING" },
      });
      const [rows] = await job.getQueryResults();
      if (!rows || rows.length === 0) return [];
      return (rows as Array<Record<string, unknown>>)
        .map((r) => ({
          channel: String(r.channel ?? "").trim(),
          revenue: numOrNull(r.revenue) ?? 0,
          conversions: numOrNull(r.conversions) ?? 0,
        }))
        .filter((r) => r.channel !== "" && (r.revenue !== 0 || r.conversions !== 0));
    } catch (err) {
      console.error("[target] BQ channel targets_long fetch failed:", err);
      return [];
    }
  },
  ["bq-channel-targets-long"],
  { revalidate: 300, tags: ["bq-targets"] },
);

/** Per-channel target row, resolved for a single month. */
export interface ChannelTarget {
  /** 計画データの channel label — "organic" / "direct" / "mail" / "referral" / "広告". */
  channel: string;
  revenue: number;
  conversions: number;
}

/**
 * Per-channel monthly targets from targets_long（self-upload 正本）. Returns
 * the channel-level 受注金額/受注件数 rows ('全体' excluded) for the requested
 * month, or `[]` when none are uploaded — callers fall back to the aggregate
 * Top-N-by-GA4-channel view in that case.
 *
 * 2026-07-08: 旧 CEO 計画 Sheet fallback を廃止（targets_long のみ）。
 */
export async function getChannelTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<ChannelTarget[]> {
  const longRows = await _bqChannelTargetsLongCached(client.id, yearMonth);
  return longRows.map((r) => ({
    channel: r.channel,
    revenue: r.revenue,
    conversions: r.conversions,
  }));
}

/**
 * Wide `targets_monthly` — fallback layer below targets_long (2026-07-03 降格).
 * Read per-field, keeping only non-NULL columns so a present value overrides
 * "未設定" and a NULL column stays null. Returns null when there is no row at
 * all. This is the admin cross-client uploader's table (masters.ts) — kept as
 * fallback while long adoption spreads.
 */
const _bqMonthlyWideCached = unstable_cache(
  async (clientId: string, yearMonth: string): Promise<Partial<MonthlyTargets> | null> => {
    try {
      const bq = getBigQuery();
      const [job] = await bq.createQueryJob({
        query: `
          SELECT revenue_target, cv_target, ad_spend_budget, roas_target_pct, cpa_target
          FROM \`ai-agent-mixednuts.app_analytics.targets_monthly\`
          WHERE client_id = @cid AND year_month = DATE(@ym || '-01')
          LIMIT 1
        `,
        location: "asia-northeast1",
        params: { cid: clientId, ym: yearMonth },
        types: { cid: "STRING", ym: "STRING" },
      });
      const [rows] = await job.getQueryResults();
      if (!rows || rows.length === 0) return null;
      const r = rows[0] as Record<string, unknown>;
      const out: Partial<MonthlyTargets> = {};
      const revenue = numOrNull(r.revenue_target);
      const conversions = numOrNull(r.cv_target);
      const adSpendBudget = numOrNull(r.ad_spend_budget);
      const roasPct = numOrNull(r.roas_target_pct);
      const cpa = numOrNull(r.cpa_target);
      if (revenue != null) out.revenue = revenue;
      if (conversions != null) out.conversions = conversions;
      if (adSpendBudget != null) out.adSpendBudget = adSpendBudget;
      if (roasPct != null) out.roasPct = roasPct;
      if (cpa != null) out.cpa = cpa;
      return out;
    } catch (err) {
      console.error("[target] BQ targets_monthly (fallback) fetch failed:", err);
      return null;
    }
  },
  ["bq-targets-monthly-fallback"],
  { revalidate: 300, tags: ["bq-targets"] },
);

/**
 * Resolution order (first non-NULL per field wins):
 *   1. targets_long    — 正本（tidy 形式・self-upload の書き込み先）
 *   2. targets_monthly — wide fallback（admin 一括アップロード）
 *   3. null（未設定）  — UI は「—」表示・達成率/ペース計算をスキップ
 *
 * 2026-07-08: CEO 計画 Sheet / ClientConfig 静的フォールバックを廃止。
 * アップロードが無いフィールドは null のまま返る（0 と混同しない）。
 */
export async function getTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<MonthlyTargets> {
  const [longRow, wide] = await Promise.all([
    _bqTargetsCached(client.id, yearMonth),
    _bqMonthlyWideCached(client.id, yearMonth),
  ]);

  return {
    revenue: longRow?.revenue ?? wide?.revenue ?? null,
    conversions: longRow?.conversions ?? wide?.conversions ?? null,
    adSpendBudget: longRow?.adSpendBudget ?? wide?.adSpendBudget ?? null,
    roasPct: longRow?.roasPct ?? wide?.roasPct ?? null,
    cpa: longRow?.cpa ?? wide?.cpa ?? null,
  };
}
