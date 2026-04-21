import "server-only";
import type { ClientConfig } from "@/config/clients";

/**
 * GA4 mock source. Phase 2 will replace the mock with a real GA4 Data API
 * `runReport` call keyed by propertyId + date range. The shape here is the
 * minimum the dashboard UI needs so that swapping implementations is a
 * one-file change.
 */

export type ChannelGroup =
  | "Paid Search"
  | "Paid Social"
  | "Organic Search"
  | "Direct"
  | "Referral"
  | "Email"
  | "Other";

export interface ChannelMonth {
  yearMonth: string; // "2026-04"
  channel: ChannelGroup;
  sessions: number;
  conversions: number;
  revenue: number;
  newUsers: number;
  returningUsers: number;
}

export interface Ga4Totals {
  sessions: number;
  conversions: number;
  revenue: number;
  newCvRatio: number; // 0..1
}

const CHANNELS: ChannelGroup[] = [
  "Paid Search",
  "Paid Social",
  "Organic Search",
  "Direct",
  "Referral",
  "Email",
];

/** Deterministic-ish fake generator so charts look consistent across reloads. */
function seeded(n: number): number {
  return (Math.sin(n * 12.9898) * 43758.5453) % 1;
}

/** Generate 12 months of channel data. */
export function getGa4MonthlyChannels(_client: ClientConfig): ChannelMonth[] {
  // Fixed "today" = 2026-04-21 from the active CLAUDE.md frame.
  const anchor = new Date("2026-04-21T00:00:00Z");
  const rows: ChannelMonth[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() - m);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const seasonal = 1 + Math.sin((d.getUTCMonth() / 12) * Math.PI * 2) * 0.25;
    for (const ch of CHANNELS) {
      const base = { "Paid Search": 22000, "Paid Social": 9000, "Organic Search": 35000, Direct: 18000, Referral: 6000, Email: 4500, Other: 1500 }[ch] ?? 0;
      const cvRate = { "Paid Search": 0.028, "Paid Social": 0.012, "Organic Search": 0.018, Direct: 0.022, Referral: 0.015, Email: 0.04, Other: 0.005 }[ch] ?? 0;
      const rpc = { "Paid Search": 5800, "Paid Social": 3200, "Organic Search": 6200, Direct: 9000, Referral: 4800, Email: 11000, Other: 2000 }[ch] ?? 0;
      const jitter = 0.85 + Math.abs(seeded(m * 31 + ch.length)) * 0.3;
      const sessions = Math.round(base * seasonal * jitter);
      const conversions = Math.round(sessions * cvRate);
      const revenue = Math.round(conversions * rpc);
      const newRatio = 0.55 + Math.abs(seeded(m + ch.length * 7)) * 0.15;
      rows.push({
        yearMonth: ym,
        channel: ch,
        sessions,
        conversions,
        revenue,
        newUsers: Math.round(sessions * newRatio),
        returningUsers: Math.round(sessions * (1 - newRatio)),
      });
    }
  }
  return rows;
}

export function ga4Totals(rows: ChannelMonth[]): Ga4Totals {
  let sessions = 0, conversions = 0, revenue = 0, newUsers = 0, returningUsers = 0;
  for (const r of rows) {
    sessions += r.sessions;
    conversions += r.conversions;
    revenue += r.revenue;
    newUsers += r.newUsers;
    returningUsers += r.returningUsers;
  }
  const total = newUsers + returningUsers;
  return {
    sessions,
    conversions,
    revenue,
    newCvRatio: total > 0 ? newUsers / total : 0,
  };
}

/** Filter to a specific yearMonth or range. */
export function filterByMonth(rows: ChannelMonth[], yearMonth: string): ChannelMonth[] {
  return rows.filter((r) => r.yearMonth === yearMonth);
}

/** Latest yearMonth present in the data. */
export function latestYearMonth(rows: ChannelMonth[]): string {
  return rows.map((r) => r.yearMonth).sort().slice(-1)[0] ?? "";
}

/** Given a yearMonth, return the prior-year-same-month key. */
export function yoyYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${Number(y) - 1}-${m}`;
}

/** Given a yearMonth, return the prior-month key. */
export function momYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Device / Landing page / Product mocks                              */
/* ------------------------------------------------------------------ */

export type Device = "mobile" | "desktop" | "tablet";

export interface DeviceTotals {
  device: Device;
  sessions: number;
  conversions: number;
  revenue: number;
}

/** Aggregate device-level totals. Device ratios are a rough-but-plausible
 *  Japanese B2C EC mix (63/32/5). */
export function getDeviceTotals(_client: ClientConfig, anchor: string): DeviceTotals[] {
  // Base the figures on the anchor month of the channel mock so the numbers
  // feel consistent with the rest of the dashboard.
  const ym = anchor.slice(0, 7);
  const base = getGa4MonthlyChannels(_client).filter((r) => r.yearMonth === ym);
  const sum = base.reduce(
    (s, r) => ({
      sessions: s.sessions + r.sessions,
      conversions: s.conversions + r.conversions,
      revenue: s.revenue + r.revenue,
    }),
    { sessions: 0, conversions: 0, revenue: 0 }
  );
  const split: Array<[Device, number, number, number]> = [
    // [device, sessionShare, cvRateMultiplier, rpcMultiplier]
    ["mobile", 0.63, 0.85, 0.9],
    ["desktop", 0.32, 1.4, 1.35],
    ["tablet", 0.05, 1.0, 1.0],
  ];
  return split.map(([device, share, cvMul, rpcMul]) => ({
    device,
    sessions: Math.round(sum.sessions * share),
    conversions: Math.round(sum.conversions * share * cvMul),
    revenue: Math.round(sum.revenue * share * cvMul * rpcMul),
  }));
}

export interface LandingPageRow {
  path: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

/** Top landing pages. Hand-picked paths that read like a real EC site. */
export function getTopLandingPages(_client: ClientConfig): LandingPageRow[] {
  const base: Array<[string, number, number]> = [
    ["/", 18500, 0.012],
    ["/category/tumbler", 12000, 0.028],
    ["/category/bag", 9800, 0.024],
    ["/category/tshirt", 8200, 0.019],
    ["/novelty", 7100, 0.034],
    ["/exhibition", 4600, 0.042],
    ["/detail/8481", 3200, 0.018],
    ["/detail/2191", 2800, 0.001], // intentionally low to echo the real HS finding
    ["/blog/novelty-2026", 2100, 0.006],
    ["/guide/printing", 1600, 0.009],
  ];
  return base.map(([path, sessions, cvRate]) => {
    const cv = Math.round(sessions * cvRate);
    return { path, sessions, conversions: cv, revenue: Math.round(cv * 6500) };
  });
}

export interface ProductRow {
  productName: string;
  sku: string;
  conversions: number;
  revenue: number;
  unitPrice: number;
}

/** Top products sample. */
export function getTopProducts(_client: ClientConfig): ProductRow[] {
  const base: Array<[string, string, number, number]> = [
    ["オリジナル タンブラー 300ml", "TBL-300-01", 182, 8200],
    ["エコバッグ A4", "BAG-A4-CT", 156, 4125],
    ["防災7点セット", "EMG-07-STD", 98, 32000],
    ["クリアファイル A4", "CLF-A4-PP", 240, 980],
    ["モバイルバッテリー 5000mAh", "MBT-5000-01", 71, 4800],
    ["オリジナル Tシャツ 綿100%", "TST-CT100", 64, 2400],
    ["ボールペン 3色", "BPN-3CL", 310, 350],
    ["キャンバスバッグ M", "BAG-CV-M", 88, 2980],
    ["ブランケット フリース", "BLK-FL-01", 42, 5500],
    ["折りたたみ傘", "UMB-FLD-01", 55, 2200],
  ];
  return base.map(([productName, sku, cv, unitPrice]) => ({
    productName,
    sku,
    conversions: cv,
    revenue: cv * unitPrice,
    unitPrice,
  }));
}
