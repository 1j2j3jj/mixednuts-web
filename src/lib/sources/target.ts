import "server-only";
import { fetchSheetCached } from "@/lib/sheets";
import type { ClientConfig, MonthlyTargets } from "@/config/clients";

/**
 * Monthly targets / budgets loaded from a dedicated Sheet tab.
 *
 * Expected schema (tab: `目標`, columns A–F):
 *   A: year_month        "2026-04" or "2026/4" etc
 *   B: revenue_target    JPY
 *   C: conversions       count
 *   D: ad_spend_budget   JPY
 *   E: roas_target_pct   percentage (e.g. 1300 = 1300%)
 *   F: cpa_target        JPY
 *
 * When the sheet tab is absent or empty, we fall back to the static values
 * in ClientConfig.monthlyTargets so the dashboard keeps working.
 */

function normaliseYm(v: string): string {
  const s = v.trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export async function getTargetsForMonth(
  client: ClientConfig,
  yearMonth: string
): Promise<MonthlyTargets> {
  const fallback = client.monthlyTargets;
  const src = client.dataSource;
  if (!src || !src.targetsRange) return fallback;

  try {
    const res = await fetchSheetCached(src.sheetId, src.targetsRange);
    if (!res.values || res.values.length < 2) return fallback;
    const [, ...dataRows] = res.values;
    const target = normaliseYm(yearMonth);
    for (const r of dataRows) {
      const ym = normaliseYm(String(r[0] ?? ""));
      if (ym !== target) continue;
      return {
        revenue: toNumber(r[1]) || fallback.revenue,
        conversions: toNumber(r[2]) || fallback.conversions,
        adSpendBudget: toNumber(r[3]) || fallback.adSpendBudget,
        roasPct: toNumber(r[4]) || fallback.roasPct,
        cpa: toNumber(r[5]) || fallback.cpa,
      };
    }
    return fallback;
  } catch (err) {
    console.error("[target] fetch failed, using fallback:", err);
    return fallback;
  }
}
