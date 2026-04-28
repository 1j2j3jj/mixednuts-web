import "server-only";
import { fetchSheetCached } from "@/lib/sheets";
import { getBigQuery } from "@/lib/bigquery";
import { unstable_cache } from "next/cache";
import type { ClientConfig, MonthlyTargets } from "@/config/clients";

/**
 * Monthly targets source. Resolution order (first hit wins):
 *
 *   1. BigQuery `app_analytics.targets_monthly` — fed by the masters CSV
 *      uploader at /dashboard/admin/masters/targets. Highest priority.
 *   2. CEO's HS_計画 spreadsheet (matrix layout, only HS has it today).
 *   3. ClientConfig.monthlyTargets (hardcoded fallback in clients.ts).
 *
 * Each source falls through to the next when it has no row for the
 * requested (clientId, yearMonth) — never breaks the dashboard.
 *
 * Expected layout (tab `シート1`):
 *   col A  : metric name        ("セッション" / "受注件数" / "受注金額" / "広告費用")
 *   col B  : channel             ("organic" / "direct" / "mail" / "referral" / "広告")
 *   col C  : "目標" / "実績"     (we read 目標 only for now)
 *   col D+ : month labels        ("2024年9月", "2024年10月", …)
 *
 * Derived per-month KPIs (matches the dashboard's definitions):
 *   revenue       = sum(受注金額 × all channels)
 *   conversions   = sum(受注件数 × all channels)
 *   adSpendBudget = 広告費用 × 広告
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

/** Pivot the matrix into a flat list of points. */
function pivot(values: string[][]): TargetPoint[] {
  if (values.length < 2) return [];
  const [header, ...rows] = values;
  const monthKeys = header.slice(3).map((h) => parseJaYm(String(h ?? "")));
  const out: TargetPoint[] = [];
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

export async function getTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<MonthlyTargets> {
  const fallback = client.monthlyTargets;

  // 1. BigQuery (CSV-uploaded master) — highest priority.
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

  // 2. Sheet (CEO 計画 matrix) — only HS today.
  const src = client.dataSource;
  if (!src || !src.targetsRange) return fallback;
  const sheetId = src.targetsSheetId ?? src.sheetId;

  try {
    const res = await fetchSheetCached(sheetId, src.targetsRange);
    if (!res.values || res.values.length < 2 || res.isMock) return fallback;
    const points = pivot(res.values);
    const monthPoints = points.filter((p) => p.yearMonth === yearMonth);
    if (monthPoints.length === 0) return fallback;

    const sumBy = (metric: Metric, channels?: string[]) =>
      monthPoints
        .filter((p) => p.metric === metric && (!channels || channels.includes(p.channel)))
        .reduce((s, p) => s + p.value, 0);

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
