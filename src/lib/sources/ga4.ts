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
