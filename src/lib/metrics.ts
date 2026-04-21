import type { DailyRow } from "@/lib/sources/raw";
import { safeDiv } from "@/lib/utils";

/**
 * Pure aggregation helpers. No I/O. Kept small so that when CEO shares the
 * 突合ルール (GA4 × Ads join via campaign id / ADG id — see ga4.ts) we can
 * rewrite this file without touching the UI.
 */

export interface KpiTotals {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  /** Derived. */
  ctr: number | null;
  cpa: number | null;
  cvr: number | null;
  roasPct: number | null;
}

export function sumRows(rows: DailyRow[]): KpiTotals {
  let cost = 0, impressions = 0, clicks = 0, conversions = 0, conversionValue = 0;
  for (const r of rows) {
    cost += r.cost;
    impressions += r.impressions;
    clicks += r.clicks;
    conversions += r.conversions;
    conversionValue += r.conversionValue;
  }
  return {
    cost,
    impressions,
    clicks,
    conversions,
    conversionValue,
    ctr: safeDiv(clicks, impressions),
    cpa: safeDiv(cost, conversions),
    cvr: safeDiv(conversions, clicks),
    // ROAS is typically shown as %; keep as number where 300 means 300%.
    roasPct: cost > 0 ? (conversionValue / cost) * 100 : null,
  };
}

/** Date range utility (exclusive-on-end is easier to reason about for windows). */
export function filterByRange(rows: DailyRow[], startInclusive: string, endInclusive: string): DailyRow[] {
  return rows.filter((r) => r.date >= startInclusive && r.date <= endInclusive);
}

export interface DailySeriesPoint {
  date: string;
  cost: number;
  conversions: number;
  conversionValue: number;
  clicks: number;
}

/** Aggregate to (date → totals). Missing dates are NOT filled — caller decides. */
export function aggregateByDate(rows: DailyRow[]): DailySeriesPoint[] {
  const map = new Map<string, DailySeriesPoint>();
  for (const r of rows) {
    const key = r.date;
    const cur = map.get(key) ?? { date: key, cost: 0, conversions: 0, conversionValue: 0, clicks: 0 };
    cur.cost += r.cost;
    cur.conversions += r.conversions;
    cur.conversionValue += r.conversionValue;
    cur.clicks += r.clicks;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface CampaignRow extends KpiTotals {
  media: string;
  campaignId: string;
  campaignName: string;
}

/** Aggregate to (campaignId → totals), preserving media/name for display. */
export function aggregateByCampaign(rows: DailyRow[]): CampaignRow[] {
  const map = new Map<string, { meta: Omit<CampaignRow, keyof KpiTotals>; sum: DailyRow[] }>();
  for (const r of rows) {
    const key = r.campaignId || r.campaignName;
    const entry = map.get(key);
    if (entry) entry.sum.push(r);
    else map.set(key, {
      meta: {
        media: r.media,
        campaignId: r.campaignId,
        campaignName: r.campaignName,
      },
      sum: [r],
    });
  }
  return Array.from(map.values()).map(({ meta, sum }) => ({
    ...meta,
    ...sumRows(sum),
  }));
}

/** Period-over-period delta. Returns ratio (e.g. 0.15 = +15%). */
export function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}
