import "server-only";
import { fetchSheetCached } from "@/lib/sheets";
import type { ClientConfig, MonthlyTargets } from "@/config/clients";

/**
 * Monthly targets source — reads the CEO's HS_計画 spreadsheet and pivots
 * its matrix layout into per-month aggregated targets.
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

export async function getTargetsForMonth(
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
