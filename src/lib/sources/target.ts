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
 * Monthly targets source. Resolution order (first hit wins), evaluated
 * per-field so a partially-populated higher source doesn't blank out lower ones:
 *
 *   1. BigQuery `app_analytics.targets_monthly` — the canonical source, fed by
 *      the client-facing masters CSV uploader at /dashboard/admin/masters/targets.
 *      This is now the primary target of record: uploading a target in the 目標
 *      tab and refreshing the dashboard changes the displayed numbers. Read
 *      unconditionally (no longer gated behind BQ_SOURCE_TARGETS). Each column
 *      that is present (non-NULL) wins; a NULL column falls through to the Sheet
 *      / static value for that field only — so 0 (a deliberately-set zero
 *      target) and NULL ("not set, use fallback") are treated differently.
 *   2. CEO's 計画 spreadsheet (HS / DOZO today — see the two layouts below).
 *      Retained as a fallback while the Sheet-based plan is retired gradually.
 *   3. ClientConfig.monthlyTargets (hardcoded fallback in clients.ts).
 *
 * Each source falls through to the next when it has no row / no value for the
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

/**
 * Read BigQuery `app_analytics.targets_monthly` for the requested month.
 * Returns a per-field-NULL-preserving partial: only columns that have a value
 * are present as numbers; NULL columns are omitted so the caller falls through
 * to the Sheet/static value for those fields only. Returns null when no row
 * exists at all (or the query fails), letting callers use Sheet/static entirely.
 *
 * Crucially, a stored 0 is kept as 0 (a deliberate zero target) and is *not*
 * confused with NULL ("not configured, use fallback").
 */
const _bqTargetsCached = unstable_cache(
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
      });
      const [rows] = await job.getQueryResults();
      if (!rows || rows.length === 0) return null;
      const r = rows[0] as Record<string, unknown>;
      // Map BQ column → MonthlyTargets field, keeping only non-NULL values so
      // each present field overrides the Sheet/static base (see getTargetsForMonth).
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
 *
 * NOTE: unlike getTargetsForMonth (org-level, now sourced primarily from
 * targets_monthly), this stays Sheet-only for now. The client-upload path
 * (targets_monthly) carries org-level targets with no per-channel breakdown,
 * so there is nothing to read here yet. Channel-level targets are planned to
 * move to targets_monthly via a future template extension (per-channel rows);
 * until then the CEO 計画 Sheet remains the sole source for channel targets.
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

/**
 * Sheet-or-static base resolution (sources 2 & 3). Unchanged from the previous
 * behaviour, factored out so BigQuery (source 1) can be layered on top per-field
 * in getTargetsForMonth. Always returns a complete MonthlyTargets — the CEO 計画
 * Sheet when it has a row for the month, else the client's static fallback.
 */
async function resolveSheetOrStatic(
  client: ClientConfig,
  yearMonth: string
): Promise<MonthlyTargets> {
  const fallback = client.monthlyTargets;

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

export async function getTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<MonthlyTargets> {
  // Source 2 & 3 (Sheet → static) resolved first as the complete base, so any
  // BQ column that is NULL/absent inherits the previous behaviour exactly.
  const base = await resolveSheetOrStatic(client, yearMonth);

  // Source 1 (BigQuery targets_monthly) — the canonical target of record.
  // Read unconditionally (the old BQ_SOURCE_TARGETS gate is removed) so the
  // client-uploaded 目標 flows straight to the dashboard. Overlay per field:
  // a present (non-NULL) BQ column overrides base; a NULL column keeps base.
  // When there's no BQ row at all, `base` is returned unchanged — i.e. exact
  // parity with the prior Sheet → static behaviour (no regression).
  const bqRow = await _bqTargetsCached(client.id, yearMonth);
  if (!bqRow) return base;

  return {
    revenue: bqRow.revenue ?? base.revenue,
    conversions: bqRow.conversions ?? base.conversions,
    adSpendBudget: bqRow.adSpendBudget ?? base.adSpendBudget,
    roasPct: bqRow.roasPct ?? base.roasPct,
    cpa: bqRow.cpa ?? base.cpa,
  };
}
