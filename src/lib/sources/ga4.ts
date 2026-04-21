import "server-only";
import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import type { ClientConfig } from "@/config/clients";

/**
 * GA4 data source. Real implementation uses Google Analytics Data API v1beta
 * via the mixednuts Service Account. Falls back to a deterministic mock when
 * `GOOGLE_SERVICE_ACCOUNT_JSON[_BASE64]` is not configured (dev scaffolding)
 * or when the client has no ga4PropertyId.
 *
 * All exported functions return Promises so callers must `await` them. A
 * 5-minute unstable_cache wraps each distinct query.
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
  yearMonth: string;
  channel: ChannelGroup;
  sessions: number;
  conversions: number;
  revenue: number;
  /** GA4 `sign_up` event count — proxy for 会員登録数. */
  signUps: number;
  newUsers: number;
  returningUsers: number;
}

export interface Ga4Totals {
  sessions: number;
  conversions: number;
  revenue: number;
  newCvRatio: number;
}

export type Device = "mobile" | "desktop" | "tablet";
export interface DeviceTotals {
  device: Device;
  sessions: number;
  conversions: number;
  revenue: number;
}

export interface LandingPageRow {
  path: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

export interface ProductRow {
  productName: string;
  sku: string;
  conversions: number;
  revenue: number;
  unitPrice: number;
}

/**
 * GA4 row at the (source × medium × campaign) grain. `media` is the internal
 * media name (matches the sheet's 媒体 column), derived from source/medium.
 * `matchKey` is the key we JOIN on against the ads sheet's campaignId — for
 * Google Ads this is the campaign id; for Microsoft / Yahoo / meta where the
 * id surfaces as the *name* in GA4 (auto-tagging peculiarity), we fall back
 * to the name.
 */
export interface Ga4CampaignRow {
  /** ISO date (yyyy-mm-dd) of the session. */
  date: string;
  source: string;
  medium: string;
  media: string;
  campaignId: string;
  campaignName: string;
  matchKey: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

/**
 * Google-Ads-only ADG row. `matchKey` is the raw ADG id so it joins directly
 * against the sheet's adgroupId.
 */
export interface Ga4AdgroupRow {
  date: string;
  campaignId: string;
  adgroupId: string;
  adgroupName: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

/* ---------------------- auth ---------------------- */

function loadSa(): Record<string, unknown> | null {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const json = b64 ? Buffer.from(b64, "base64").toString("utf8") : raw;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function makeAuth() {
  const creds = loadSa();
  if (!creds) return null;
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
}

const CACHE_TTL_SECONDS = 300;

/* ---------------------- helpers ---------------------- */

/** Paid-medium detector. GA4 medium varies: cpc / ppc / paid_search /
 *  paid_social / paid_shopping / paid_video / paid_other / display. Anything
 *  else (organic / referral / email / none) is dropped by the Ads-side
 *  aggregation because this tab only cares about paid media. */
function isPaidMedium(medium: string): boolean {
  const m = medium.toLowerCase();
  return /cpc|ppc|paid_|display|video/.test(m) && !/organic/.test(m);
}

/** Map a GA4 source to one of the internal ad media names. Returns null when
 *  the source is not a paid-ads source we track (organic / referral / etc). */
function normaliseAdMedia(source: string, medium: string): string | null {
  if (!isPaidMedium(medium)) return null;
  const s = source.toLowerCase();
  if (s === "google" || s.startsWith("googleads")) return "Google";
  if (s === "bing" || s === "microsoft" || s === "msn") return "Microsoft";
  if (s === "yahoo" || s === "yhl" || s === "yss" || s === "ydn" || s.includes("yahoo")) return "Yahoo";
  if (s === "fb" || s === "facebook" || s === "instagram" || s === "ig" || s === "meta" || s.includes("facebook")) return "meta";
  if (s === "linkedin" || s === "li") return "LinkedIn";
  if (s === "tiktok" || s.includes("tiktok")) return "TikTok";
  if (s === "line" || s.includes("line.me")) return "LINE";
  return null;
}

/** Pick the best JOIN key between GA4 and the ads sheet. Google's cid is
 *  usually the pure numeric campaign id; for bing/yahoo/meta the id shows up
 *  in the *name* field instead because auto-tagging writes utm_campaign from
 *  the platform-side campaign id. */
function ga4MatchKey(cid: string, cname: string): string {
  const clean = (v: string) => v.replace(/^[[(]+|[\])]+$/g, "").trim();
  const cidClean = clean(cid);
  if (cidClean && cidClean !== "(not set)") return cidClean;
  return clean(cname);
}

const CHANNEL_NORMAL: Record<string, ChannelGroup> = {
  "Paid Search": "Paid Search",
  "Paid Social": "Paid Social",
  "Paid Shopping": "Paid Search",
  "Paid Video": "Paid Social",
  "Paid Other": "Paid Social",
  "Organic Search": "Organic Search",
  "Organic Social": "Other",
  "Organic Video": "Other",
  "Organic Shopping": "Organic Search",
  Direct: "Direct",
  Referral: "Referral",
  Email: "Email",
  Affiliates: "Other",
  "Cross-network": "Paid Search",
  Display: "Paid Social",
  Unassigned: "Other",
};

function normaliseChannel(ga4ChannelName: string | undefined | null): ChannelGroup {
  if (!ga4ChannelName) return "Other";
  return CHANNEL_NORMAL[ga4ChannelName] ?? "Other";
}

function yearMonthFromGa4(v: string): string {
  // GA4 returns "202604" format for yearMonth.
  if (/^\d{6}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}`;
  return v;
}

/* ---------------------- real calls (cached) ---------------------- */

async function realChannels(propertyId: string): Promise<ChannelMonth[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const [res, signUps] = await Promise.all([
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: "730daysAgo", endDate: "today" }],
        dimensions: [{ name: "yearMonth" }, { name: "sessionDefaultChannelGroup" }, { name: "newVsReturning" }],
        metrics: [
          { name: "sessions" },
          { name: "ecommercePurchases" },
          { name: "purchaseRevenue" },
        ],
        limit: "1000",
      },
    }),
    // Parallel: sign_up event count per (yearMonth, channel). Filtered on
    // eventName so the metric is only sign-ups — keeps the main query
    // unaffected (it still counts all sessions).
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: "730daysAgo", endDate: "today" }],
        dimensions: [{ name: "yearMonth" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: "sign_up" },
          },
        },
        limit: "1000",
      },
    }),
  ]);
  const signUpMap = new Map<string, number>();
  for (const r of signUps.data.rows ?? []) {
    const ym = yearMonthFromGa4(r.dimensionValues?.[0]?.value ?? "");
    const ch = normaliseChannel(r.dimensionValues?.[1]?.value);
    const key = `${ym}|${ch}`;
    signUpMap.set(key, (signUpMap.get(key) ?? 0) + Number(r.metricValues?.[0]?.value ?? 0));
  }

  const map = new Map<string, ChannelMonth>();
  for (const r of res.data.rows ?? []) {
    const ym = yearMonthFromGa4(r.dimensionValues?.[0]?.value ?? "");
    const ch = normaliseChannel(r.dimensionValues?.[1]?.value);
    const newVsRet = r.dimensionValues?.[2]?.value ?? "";
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    const conversions = Number(r.metricValues?.[1]?.value ?? 0);
    const revenue = Number(r.metricValues?.[2]?.value ?? 0);
    const key = `${ym}|${ch}`;
    const cur = map.get(key) ?? {
      yearMonth: ym,
      channel: ch,
      sessions: 0,
      conversions: 0,
      revenue: 0,
      signUps: signUpMap.get(key) ?? 0,
      newUsers: 0,
      returningUsers: 0,
    };
    cur.sessions += sessions;
    cur.conversions += conversions;
    cur.revenue += revenue;
    if (newVsRet === "new") cur.newUsers += sessions;
    else if (newVsRet === "returning") cur.returningUsers += sessions;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

async function realDevices(propertyId: string, anchor: string): Promise<DeviceTotals[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const ym = anchor.slice(0, 7); // yyyy-mm
  const start = `${ym}-01`;
  const [y, m] = ym.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const analyticsdata = google.analyticsdata("v1beta");
  const res = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [
        { name: "sessions" },
        { name: "ecommercePurchases" },
        { name: "purchaseRevenue" },
      ],
    },
  });
  const result: DeviceTotals[] = [];
  for (const r of res.data.rows ?? []) {
    const dev = (r.dimensionValues?.[0]?.value ?? "").toLowerCase();
    if (!["mobile", "desktop", "tablet"].includes(dev)) continue;
    result.push({
      device: dev as Device,
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      conversions: Number(r.metricValues?.[1]?.value ?? 0),
      revenue: Number(r.metricValues?.[2]?.value ?? 0),
    });
  }
  return result;
}

async function realLandingPages(propertyId: string): Promise<LandingPageRow[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const res = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [
        { name: "sessions" },
        { name: "ecommercePurchases" },
        { name: "purchaseRevenue" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "10",
    },
  });
  return (res.data.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    conversions: Number(r.metricValues?.[1]?.value ?? 0),
    revenue: Number(r.metricValues?.[2]?.value ?? 0),
  }));
}

async function realProducts(propertyId: string): Promise<ProductRow[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const res = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "itemName" }, { name: "itemId" }],
      metrics: [
        { name: "itemsPurchased" },
        { name: "itemRevenue" },
      ],
      orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
      limit: "10",
    },
  });
  return (res.data.rows ?? []).map((r) => {
    const conversions = Number(r.metricValues?.[0]?.value ?? 0);
    const revenue = Number(r.metricValues?.[1]?.value ?? 0);
    return {
      productName: r.dimensionValues?.[0]?.value ?? "",
      sku: r.dimensionValues?.[1]?.value ?? "",
      conversions,
      revenue,
      unitPrice: conversions > 0 ? Math.round(revenue / conversions) : 0,
    };
  });
}

/** Paid-campaign report. Returns one row per (source × medium × cid × cname)
 *  with the computed matchKey for JOIN with the ads sheet. */
function ga4DateToIso(v: string): string {
  // GA4 `date` dimension returns "20260331" format.
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  return v;
}

async function realPaidCampaigns(propertyId: string, startDate: string, endDate: string): Promise<Ga4CampaignRow[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const res = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: "date" },
        { name: "sessionSource" },
        { name: "sessionMedium" },
        { name: "sessionCampaignId" },
        { name: "sessionCampaignName" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "ecommercePurchases" },
        { name: "purchaseRevenue" },
      ],
      limit: "50000",
    },
  });
  const out: Ga4CampaignRow[] = [];
  for (const r of res.data.rows ?? []) {
    const date = ga4DateToIso(r.dimensionValues?.[0]?.value ?? "");
    const source = r.dimensionValues?.[1]?.value ?? "";
    const medium = r.dimensionValues?.[2]?.value ?? "";
    const media = normaliseAdMedia(source, medium);
    if (!media) continue;
    const campaignId = r.dimensionValues?.[3]?.value ?? "";
    const campaignName = r.dimensionValues?.[4]?.value ?? "";
    out.push({
      date,
      source,
      medium,
      media,
      campaignId,
      campaignName,
      matchKey: ga4MatchKey(campaignId, campaignName),
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      conversions: Number(r.metricValues?.[1]?.value ?? 0),
      revenue: Number(r.metricValues?.[2]?.value ?? 0),
    });
  }
  return out;
}

async function realGoogleAdgroups(propertyId: string, startDate: string, endDate: string): Promise<Ga4AdgroupRow[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const res = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: "date" },
        { name: "sessionGoogleAdsCampaignId" },
        { name: "sessionGoogleAdsAdGroupId" },
        { name: "sessionGoogleAdsAdGroupName" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "ecommercePurchases" },
        { name: "purchaseRevenue" },
      ],
      limit: "50000",
    },
  });
  const out: Ga4AdgroupRow[] = [];
  for (const r of res.data.rows ?? []) {
    const date = ga4DateToIso(r.dimensionValues?.[0]?.value ?? "");
    const campaignId = r.dimensionValues?.[1]?.value ?? "";
    const adgroupId = r.dimensionValues?.[2]?.value ?? "";
    const adgroupName = r.dimensionValues?.[3]?.value ?? "";
    // Drop "(not set)" rows and Performance Max ADGs that always come back as
    // a single meta-adg — those cannot JOIN cleanly against the sheet's real
    // ADG ids.
    if (!/^\d+$/.test(adgroupId)) continue;
    out.push({
      date,
      campaignId,
      adgroupId,
      adgroupName,
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      conversions: Number(r.metricValues?.[1]?.value ?? 0),
      revenue: Number(r.metricValues?.[2]?.value ?? 0),
    });
  }
  return out;
}

/* ---------------------- public (cached) API ---------------------- */

export async function getGa4MonthlyChannels(client: ClientConfig): Promise<ChannelMonth[]> {
  if (!client.ga4PropertyId) return mockChannels();
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async () => {
      try {
        return await realChannels(pid);
      } catch (err) {
        console.error("[ga4] channels fetch failed, using mock:", err);
        return mockChannels();
      }
    },
    [`ga4-channels-${pid}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getDeviceTotals(client: ClientConfig, anchor: string): Promise<DeviceTotals[]> {
  if (!client.ga4PropertyId) return mockDevices(anchor);
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async () => {
      try {
        return await realDevices(pid, anchor);
      } catch (err) {
        console.error("[ga4] device fetch failed, using mock:", err);
        return mockDevices(anchor);
      }
    },
    [`ga4-device-${pid}-${anchor.slice(0, 7)}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getTopLandingPages(client: ClientConfig): Promise<LandingPageRow[]> {
  if (!client.ga4PropertyId) return mockLandingPages();
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async () => {
      try {
        return await realLandingPages(pid);
      } catch (err) {
        console.error("[ga4] lp fetch failed, using mock:", err);
        return mockLandingPages();
      }
    },
    [`ga4-lp-${pid}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getGa4PaidCampaigns(
  client: ClientConfig,
  startDate: string,
  endDate: string
): Promise<Ga4CampaignRow[]> {
  if (!client.ga4PropertyId) return [];
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async () => {
      try {
        return await realPaidCampaigns(pid, startDate, endDate);
      } catch (err) {
        console.error("[ga4] paid campaigns fetch failed:", err);
        return [];
      }
    },
    [`ga4-paid-${pid}-${startDate}-${endDate}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getGa4GoogleAdgroups(
  client: ClientConfig,
  startDate: string,
  endDate: string
): Promise<Ga4AdgroupRow[]> {
  if (!client.ga4PropertyId) return [];
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async () => {
      try {
        return await realGoogleAdgroups(pid, startDate, endDate);
      } catch (err) {
        console.error("[ga4] adgroups fetch failed:", err);
        return [];
      }
    },
    [`ga4-adg-${pid}-${startDate}-${endDate}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getTopProducts(client: ClientConfig): Promise<ProductRow[]> {
  if (!client.ga4PropertyId) return mockProducts();
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async () => {
      try {
        const rows = await realProducts(pid);
        // If GA4 items API returns nothing (no e-commerce tagging), fall back
        // so the dashboard isn't empty-looking.
        return rows.length > 0 ? rows : mockProducts();
      } catch (err) {
        console.error("[ga4] products fetch failed, using mock:", err);
        return mockProducts();
      }
    },
    [`ga4-products-${pid}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

/* ---------------------- totals helper ---------------------- */

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

export function filterByMonth(rows: ChannelMonth[], yearMonth: string): ChannelMonth[] {
  return rows.filter((r) => r.yearMonth === yearMonth);
}

export function latestYearMonth(rows: ChannelMonth[]): string {
  return rows.map((r) => r.yearMonth).sort().slice(-1)[0] ?? "";
}

export function yoyYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${Number(y) - 1}-${m}`;
}

export function momYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ---------------------- mocks (unchanged behaviour) ---------------------- */

const CHANNELS: ChannelGroup[] = [
  "Paid Search",
  "Paid Social",
  "Organic Search",
  "Direct",
  "Referral",
  "Email",
];

function seeded(n: number): number {
  return (Math.sin(n * 12.9898) * 43758.5453) % 1;
}

function mockChannels(): ChannelMonth[] {
  const anchor = new Date("2026-04-21T00:00:00Z");
  const rows: ChannelMonth[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() - m);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const seasonal = 1 + Math.sin((d.getUTCMonth() / 12) * Math.PI * 2) * 0.25;
    for (const ch of CHANNELS) {
      const base =
        { "Paid Search": 22000, "Paid Social": 9000, "Organic Search": 35000, Direct: 18000, Referral: 6000, Email: 4500, Other: 1500 }[ch] ?? 0;
      const cvRate =
        { "Paid Search": 0.028, "Paid Social": 0.012, "Organic Search": 0.018, Direct: 0.022, Referral: 0.015, Email: 0.04, Other: 0.005 }[ch] ?? 0;
      const rpc =
        { "Paid Search": 5800, "Paid Social": 3200, "Organic Search": 6200, Direct: 9000, Referral: 4800, Email: 11000, Other: 2000 }[ch] ?? 0;
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
        // Mock sign-ups: ~2% of sessions for paid-search-like channels, half for others.
        signUps: Math.round(sessions * (ch === "Paid Search" || ch === "Paid Social" ? 0.02 : 0.01)),
        newUsers: Math.round(sessions * newRatio),
        returningUsers: Math.round(sessions * (1 - newRatio)),
      });
    }
  }
  return rows;
}

function mockDevices(anchor: string): DeviceTotals[] {
  const rows = mockChannels().filter((r) => r.yearMonth === anchor.slice(0, 7));
  const sum = rows.reduce(
    (s, r) => ({
      sessions: s.sessions + r.sessions,
      conversions: s.conversions + r.conversions,
      revenue: s.revenue + r.revenue,
    }),
    { sessions: 0, conversions: 0, revenue: 0 }
  );
  const split: Array<[Device, number, number, number]> = [
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

function mockLandingPages(): LandingPageRow[] {
  const base: Array<[string, number, number]> = [
    ["/", 18500, 0.012],
    ["/category/tumbler", 12000, 0.028],
    ["/category/bag", 9800, 0.024],
    ["/category/tshirt", 8200, 0.019],
    ["/novelty", 7100, 0.034],
    ["/exhibition", 4600, 0.042],
    ["/detail/8481", 3200, 0.018],
    ["/detail/2191", 2800, 0.001],
    ["/blog/novelty-2026", 2100, 0.006],
    ["/guide/printing", 1600, 0.009],
  ];
  return base.map(([path, sessions, cvRate]) => {
    const cv = Math.round(sessions * cvRate);
    return { path, sessions, conversions: cv, revenue: Math.round(cv * 6500) };
  });
}

function mockProducts(): ProductRow[] {
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
