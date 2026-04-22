import "server-only";
import { fetchSheetCached } from "@/lib/sheets";
import type { ClientConfig } from "@/config/clients";

/**
 * ECCUBE daily-aggregate source. The sheet is maintained by the client
 * (currently HS — 販促スタイル) exporting shop-DB aggregates. Columns:
 *
 *   A 期間           yyyy/m/d or yyyy-mm-dd
 *   B 購入件数       orders count (this is the CV we count)
 *   C 男性           gender breakdown — unused, kept for future
 *   D 女性
 *   E 不明
 *   F 男性(会員)     member × gender cross-tab — unused
 *   G 男性(非会員)
 *   H 女性(会員)
 *   I 女性(非会員)
 *   J 購入合計        total revenue (string with ¥ + commas, e.g. "¥6,233,001")
 *   K 購入平均        avg order value (string)
 *
 * ECCUBE is the **shop-DB truth** for revenue/CV — GA4 can under-count
 * (consent / ad-blocker), ad platforms over-count (platform attribution).
 * We keep all three sources and let the user toggle.
 */

export interface EccubeDay {
  /** ISO yyyy-mm-dd. */
  date: string;
  /** 購入件数 — conversions (orders). */
  conversions: number;
  /** 購入合計 — total revenue in JPY (parsed from ¥… string). */
  revenue: number;
  /** 購入平均 — avg order value. Parsed from ¥… string, but also derivable
   *  as revenue/conversions — we keep the sheet-reported value for fidelity. */
  avgOrderValue: number;
  /** Member-segment order count. Optional — zero when the sheet leaves it
   *  blank. Kept for future segmentation. */
  memberOrders?: number;
  nonMemberOrders?: number;
}

export interface EccubeFetchResult {
  rows: EccubeDay[];
  fetchedAt: number;
  isMock: boolean;
  warnings: string[];
}

function parseYen(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  // "¥6,233,001" → 6233001
  const s = String(v).replace(/[¥,\s]/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseInt0(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function normaliseDate(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return "";
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/**
 * Load ECCUBE daily rows for a client. Returns empty rows (not mock) when
 * the client has no ECCUBE sheet configured — callers should treat that as
 * "source unavailable" and hide the ECCUBE toggle option.
 */
export async function getEccubeDaily(client: ClientConfig): Promise<EccubeFetchResult> {
  const warnings: string[] = [];
  const ds = client.dataSource;
  if (!ds || !ds.eccubeSheetId || !ds.eccubeRange) {
    return { rows: [], fetchedAt: Date.now(), isMock: false, warnings: ["no eccube source"] };
  }
  let res;
  try {
    res = await fetchSheetCached(ds.eccubeSheetId, ds.eccubeRange);
  } catch (err) {
    warnings.push(`eccube sheet fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return { rows: [], fetchedAt: Date.now(), isMock: false, warnings };
  }
  const { values, fetchedAt, isMock } = res;
  if (values.length === 0) {
    return { rows: [], fetchedAt, isMock, warnings: ["empty sheet"] };
  }
  // Skip header row.
  const rows: EccubeDay[] = [];
  for (const r of values.slice(1)) {
    if (!r || r.every((c) => c == null || String(c).trim() === "")) continue;
    const date = normaliseDate(r[0]);
    if (!date) continue;
    const conversions = parseInt0(r[1]);
    const revenue = parseYen(r[9]);
    const avgOrderValue = parseYen(r[10]);
    // Member segmentation: (男性会員 + 女性会員) = member, (男性非会員 + 女性非会員) = non-member.
    const memberOrders = parseInt0(r[5]) + parseInt0(r[7]);
    const nonMemberOrders = parseInt0(r[6]) + parseInt0(r[8]);
    rows.push({ date, conversions, revenue, avgOrderValue, memberOrders, nonMemberOrders });
  }
  // Sort by date asc so downstream code can rely on monotonic order.
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, fetchedAt, isMock, warnings };
}

/** Sum ECCUBE rows within [start, end] inclusive. */
export function sumEccubeRange(
  rows: EccubeDay[],
  startInclusive: string,
  endInclusive: string
): { conversions: number; revenue: number; avgOrderValue: number | null } {
  let conv = 0;
  let rev = 0;
  let days = 0;
  for (const r of rows) {
    if (r.date < startInclusive || r.date > endInclusive) continue;
    conv += r.conversions;
    rev += r.revenue;
    days++;
  }
  return {
    conversions: conv,
    revenue: rev,
    avgOrderValue: conv > 0 ? rev / conv : null,
    // days count intentionally kept local for the caller if needed
  };
}

/** Earliest date in the ECCUBE dataset — useful for showing a "データあり:
 *  YYYY-MM-DD 以降" hint near the toggle. Returns "" if empty. */
export function eccubeEarliestDate(rows: EccubeDay[]): string {
  return rows.length > 0 ? rows[0].date : "";
}
