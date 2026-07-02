import "server-only";
import { fetchSheetCached } from "@/lib/sheets";
import { getBigQuery } from "@/lib/bigquery";
import { unstable_cache } from "next/cache";
import type { ClientConfig, MonthlyTargets } from "@/config/clients";
import type { ChannelGroup } from "@/lib/sources/ga4";

/**
 * Maps GA4's default channel grouping onto the 計画 sheet's channel labels
 * (organic / direct / mail / referral / 広告). GA4 channels with no mapping
 * (e.g. an "Other" bucket the sheet doesn't budget for) fall into "その他" —
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

/** Channel label shown for GA4 channels with no counterpart in the 計画 sheet. */
export const UNMAPPED_PLAN_CHANNEL = "その他";

/**
 * Monthly targets source. Resolution order (first hit wins):
 *
 *   1. BigQuery `app_analytics.targets_monthly` — fed by the masters CSV
 *      uploader at /dashboard/admin/masters/targets. Highest priority, but
 *      only consulted when env `BQ_SOURCE_TARGETS=1` (defaults OFF, mirrors
 *      BQ_SOURCE_RAW). With the flag OFF the Sheet/static path below is used.
 *   2. CEO's 計画 spreadsheet (HS / DOZO today — see the two layouts below).
 *   3. ClientConfig.monthlyTargets (hardcoded fallback in clients.ts).
 *
 * Each source falls through to the next when it has no row for the
 * requested (clientId, yearMonth) — never breaks the dashboard.
 *
 * Two sheet layouts (tab `シート1`), auto-detected in pivot():
 *
 *   JA matrix (HS):
 *     col A  : metric name        ("セッション" / "受注件数" / "受注金額" / "広告費用")
 *     col B  : channel             ("organic" / "direct" / "mail" / "referral" / "広告")
 *     col C  : "目標" / "実績"     (we read 目標 only for now)
 *     col D+ : month labels        ("2024年9月", "2024年10月", …)
 *
 *   EN annual template (DOZO):
 *     col A  : metric name (English) — "revenue" / "conversions" /
 *              "adSpendBudget" / "roasPct" / "cpa"
 *     col B  : channel — "all" (whole-account total) / "google" / "yahoo" /
 *              "meta" / "microsoft"
 *     col C+ : month labels — "Jan".."Dec" (no year; the template is
 *              recurring, so a row applies to that calendar month in any
 *              requested year)
 *
 * Derived per-month KPIs (matches the dashboard's definitions):
 *   revenue       = sum(受注金額 × all channels), or the "all" row directly
 *                   when present (EN template)
 *   conversions   = sum(受注件数 × all channels), or "all" directly
 *   adSpendBudget = 広告費用 × 広告, or "all" directly
 *   roasPct       = 受注金額(広告) / 広告費用(広告) × 100
 *   cpa           = 広告費用(広告) / 受注件数(広告)
 *
 * When the sheet is absent / empty / inaccessible, falls back to the static
 * ClientConfig.monthlyTargets so the dashboard keeps working.
 */

type Metric = "セッション" | "受注件数" | "受注金額" | "広告費用" | string;

interface TargetPoint {
  yearMonth: string; // YYYY-MM
  metric: Metric;
  channel: string;
  value: number;
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[,¥]/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** "2024年9月" → "2024-09". Returns "" when the label isn't recognisable. */
function parseJaYm(label: string): string {
  const s = String(label ?? "").trim();
  const m = s.match(/^(\d{4})年(\d{1,2})月/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, "0")}`;
  return "";
}

const EN_MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jan"/"jan"/"January" → 1-12 month number. Returns 0 when unrecognised. */
function parseEnMonth(label: string): number {
  const s = String(label ?? "").trim().toLowerCase();
  const idx = EN_MONTH_ABBR.findIndex((abbr) => s === abbr.toLowerCase() || s.startsWith(abbr.toLowerCase()));
  return idx >= 0 ? idx + 1 : 0;
}

/** English metric names (some 計画 sheets, e.g. DOZO, use these directly
 *  instead of the Japanese 受注金額/受注件数/広告費用 vocabulary). Mapped to
 *  the same canonical metric strings the rest of this module reads. */
const EN_METRIC_ALIAS: Record<string, Metric> = {
  revenue: "受注金額",
  conversions: "受注件数",
  adspendbudget: "広告費用",
};

function normaliseMetric(raw: string): Metric {
  const alias = EN_METRIC_ALIAS[raw.toLowerCase()];
  return alias ?? raw;
}

/**
 * Pivot the matrix into a flat list of points. Supports two sheet layouts:
 *
 *   1. JA matrix (HS 計画): col C is "目標"/"実績", months start at col D
 *      (index 3), labelled "YYYY年M月".
 *   2. EN annual template (DOZO 計画): no kind column — months start at
 *      col C (index 2), labelled "Jan".."Dec" with no year (the sheet is a
 *      recurring yearly template). Metric names are English
 *      (revenue/conversions/adSpendBudget/roasPct/cpa) and a `channel='all'`
 *      row carries the whole-account target rather than a per-channel
 *      breakdown — see getChannelTargetsForMonth, which skips it.
 *
 * Layout is detected from the header: if header[2] parses as a bare month
 * name (no "kind" column present), months start at index 2 and every row
 * is expanded across all years the caller might ask for (the EN template
 * has no year, so "Jan" matches Jan of any requested yearMonth).
 */
function pivot(values: string[][]): TargetPoint[] {
  if (values.length < 2) return [];
  const [header, ...rows] = values;
  const isEnTemplate = parseEnMonth(String(header[2] ?? "")) > 0;
  const out: TargetPoint[] = [];

  if (isEnTemplate) {
    const monthNums = header.slice(2).map((h) => parseEnMonth(String(h ?? "")));
    for (const r of rows) {
      const metric = normaliseMetric(String(r[0] ?? "").trim());
      const channel = String(r[1] ?? "").trim();
      if (!metric || !channel) continue;
      for (let i = 0; i < monthNums.length; i++) {
        const mo = monthNums[i];
        if (!mo) continue;
        const v = toNumber(r[2 + i]);
        if (v === 0) continue;
        // No year in the template — value applies to that calendar month in
        // any year. Encode as a wildcard yearMonth ("*-MM") and let callers
        // match it against the requested month.
        out.push({ yearMonth: `*-${String(mo).padStart(2, "0")}`, metric, channel, value: v });
      }
    }
    return out;
  }

  const monthKeys = header.slice(3).map((h) => parseJaYm(String(h ?? "")));
  for (const r of rows) {
    const metric = String(r[0] ?? "").trim();
    const channel = String(r[1] ?? "").trim();
    const kind = String(r[2] ?? "").trim(); // "目標" / "実績"
    if (!metric || !channel) continue;
    if (kind && kind !== "目標") continue; // ignore 実績 for now
    for (let i = 0; i < monthKeys.length; i++) {
      const ym = monthKeys[i];
      if (!ym) continue;
      const v = toNumber(r[3 + i]);
      if (v === 0) continue;
      out.push({ yearMonth: ym, metric, channel, value: v });
    }
  }
  return out;
}

/** True when a point's yearMonth (possibly a "*-MM" wildcard from the EN
 *  annual template) matches the requested "YYYY-MM". */
function matchesYearMonth(point: TargetPoint, yearMonth: string): boolean {
  if (point.yearMonth === yearMonth) return true;
  const wildcardMonth = point.yearMonth.match(/^\*-(\d{2})$/)?.[1];
  return wildcardMonth != null && wildcardMonth === yearMonth.slice(5, 7);
}

/**
 * Try BigQuery `app_analytics.targets_monthly` for the requested month.
 * Returns null when no row exists, letting callers fall through to Sheet/static.
 */
const _bqTargetsCached = unstable_cache(
  async (clientId: string, yearMonth: string): Promise<MonthlyTargets | null> => {
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
      });
      const [rows] = await job.getQueryResults();
      if (!rows || rows.length === 0) return null;
      const r = rows[0] as Record<string, unknown>;
      const num = (v: unknown) => {
        if (v == null) return 0;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      return {
        revenue: num(r.revenue_target),
        conversions: num(r.cv_target),
        adSpendBudget: num(r.ad_spend_budget),
        roasPct: num(r.roas_target_pct),
        cpa: num(r.cpa_target),
      };
    } catch (err) {
      console.error("[target] BQ fetch failed:", err);
      return null;
    }
  },
  ["bq-targets-monthly"],
  { revalidate: 300, tags: ["bq-targets"] },
);

/** Per-channel target row, resolved for a single month. */
export interface ChannelTarget {
  /** Sheet's own channel label — "organic" / "direct" / "mail" / "referral" / "広告". */
  channel: string;
  revenue: number;
  conversions: number;
}

/**
 * Per-channel monthly targets from the CEO's 計画 spreadsheet (matrix
 * layout — see file header). Only meaningful for clients whose targetsRange
 * uses the metric×channel×month matrix with populated 受注金額/受注件数 rows
 * for the requested month (today: HS). Returns `[]` when the sheet is
 * absent, unreadable, mocked, or has no rows for the month — callers should
 * fall back to the aggregate Top-N-by-GA4-channel view in that case.
 */
export async function getChannelTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<ChannelTarget[]> {
  const src = client.dataSource;
  if (!src || !src.targetsRange) return [];
  const sheetId = src.targetsSheetId ?? src.sheetId;

  try {
    const res = await fetchSheetCached(sheetId, src.targetsRange);
    if (!res.values || res.values.length < 2 || res.isMock) return [];
    const points = pivot(res.values);
    // "all" is the whole-account target row on the EN annual template
    // (DOZO) — it's a total, not a channel breakdown, so exclude it here
    // and let getTargetsForMonth's aggregate summation pick it up instead.
    const monthPoints = points.filter((p) => matchesYearMonth(p, yearMonth) && p.channel !== "all");
    if (monthPoints.length === 0) return [];

    const channels = Array.from(new Set(monthPoints.map((p) => p.channel)));
    const out: ChannelTarget[] = [];
    for (const channel of channels) {
      const revenue = monthPoints
        .filter((p) => p.metric === "受注金額" && p.channel === channel)
        .reduce((s, p) => s + p.value, 0);
      const conversions = monthPoints
        .filter((p) => p.metric === "受注件数" && p.channel === channel)
        .reduce((s, p) => s + p.value, 0);
      if (revenue === 0 && conversions === 0) continue;
      out.push({ channel, revenue, conversions });
    }
    return out;
  } catch (err) {
    console.error("[target] channel fetch failed:", err);
    return [];
  }
}

export async function getTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<MonthlyTargets> {
  const fallback = client.monthlyTargets;

  // 1. BigQuery (CSV-uploaded master) — highest priority, flag-gated.
  //    Defaults OFF: set BQ_SOURCE_TARGETS=1 to read from
  //    app_analytics.targets_monthly. Mirrors BQ_SOURCE_RAW in raw.ts. When OFF
  //    the Sheet (HS only) → static fallback behaviour below is preserved.
  if (process.env.BQ_SOURCE_TARGETS === "1") {
    const bqRow = await _bqTargetsCached(client.id, yearMonth);
    if (bqRow) {
      return {
        revenue: bqRow.revenue || fallback.revenue,
        conversions: bqRow.conversions || fallback.conversions,
        adSpendBudget: bqRow.adSpendBudget || fallback.adSpendBudget,
        roasPct: bqRow.roasPct || fallback.roasPct,
        cpa: bqRow.cpa || fallback.cpa,
      };
    }
  }

  // 2. Sheet (CEO 計画 matrix) — only HS today.
  const src = client.dataSource;
  if (!src || !src.targetsRange) return fallback;
  const sheetId = src.targetsSheetId ?? src.sheetId;

  try {
    const res = await fetchSheetCached(sheetId, src.targetsRange);
    if (!res.values || res.values.length < 2 || res.isMock) return fallback;
    const points = pivot(res.values);
    const monthPoints = points.filter((p) => matchesYearMonth(p, yearMonth));
    if (monthPoints.length === 0) return fallback;

    // "all" is the whole-account total on the EN annual template (DOZO) —
    // prefer it when present so per-channel rows (google/yahoo/meta/...)
    // aren't double-counted on top of it. Falls through to summing the
    // requested `channels` set (the JA matrix format's convention, e.g.
    // 広告費用 × ["広告"] for HS) when there's no "all" row for the metric.
    const sumBy = (metric: Metric, channels?: string[]) => {
      const metricPoints = monthPoints.filter((p) => p.metric === metric);
      const allPoints = metricPoints.filter((p) => p.channel === "all");
      if (allPoints.length > 0) return allPoints.reduce((s, p) => s + p.value, 0);
      return metricPoints
        .filter((p) => !channels || channels.includes(p.channel))
        .reduce((s, p) => s + p.value, 0);
    };

    const revenue = sumBy("受注金額") || fallback.revenue;
    const conversions = sumBy("受注件数") || fallback.conversions;
    const adSpendBudget = sumBy("広告費用", ["広告"]) || fallback.adSpendBudget;
    const adRevenue = sumBy("受注金額", ["広告"]);
    const adCv = sumBy("受注件数", ["広告"]);
    const roasPct = adSpendBudget > 0 ? Math.round((adRevenue / adSpendBudget) * 100) : fallback.roasPct;
    const cpa = adCv > 0 ? Math.round(adSpendBudget / adCv) : fallback.cpa;

    return { revenue, conversions, adSpendBudget, roasPct, cpa };
  } catch (err) {
    console.error("[target] fetch failed, using fallback:", err);
    return fallback;
  }
}
