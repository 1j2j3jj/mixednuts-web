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
  /** Client-specific secondary event counts, keyed by SecondaryEventDef.key
   *  (e.g. HS: {member: N}, DOZO: {thanks: N, wedding: N}). See
   *  ga4SecondaryEventDefs() for the per-client toggle list. */
  secondary: Record<string, number>;
  newUsers: number;
  returningUsers: number;
}

export interface Ga4Totals {
  sessions: number;
  conversions: number;
  revenue: number;
  newCvRatio: number;
}

/**
 * Generic result envelope for every GA4/GSC "top N" / breakdown query.
 * `isMock` is true whenever the caller ultimately received deterministic
 * mock data (no ga4PropertyId / gscSiteUrl configured, empty real result,
 * or an API failure) so pages can render a "サンプルデータ" disclosure
 * instead of silently presenting mock numbers as real.
 */
export interface Ga4Result<T> {
  rows: T;
  isMock: boolean;
  warnings: string[];
}

function mockResult<T>(rows: T): Ga4Result<T> {
  return { rows, isMock: true, warnings: [] };
}

function realResult<T>(rows: T, warnings: string[] = []): Ga4Result<T> {
  return { rows, isMock: false, warnings };
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
  /** その商品を含む注文数（transactionId のユニークカウント）。 */
  orderCount: number;
  /** 注文点数（GA4 itemsPurchased = units）。旧「CV」列。 */
  conversions: number;
  revenue: number;
  /** 1個あたり（revenue ÷ 点数）。B2Bロット販売では参考値。 */
  unitPrice: number;
  /** 1件あたり売上（revenue ÷ 注文数）。CEO要望 2026-07-03。 */
  perOrder: number;
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
/** Daily channel row (with secondary events). Used by the "日別／週別" chart. */
export interface ChannelDay {
  date: string; // ISO yyyy-mm-dd
  channel: ChannelGroup;
  sessions: number;
  conversions: number;
  revenue: number;
  /** See ChannelMonth.secondary. */
  secondary: Record<string, number>;
}

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

/** Meta-family source detector, used to pick which GA4 dimension actually
 *  carries the platform campaign id (see ga4MatchKey below). */
function isMetaSource(source: string): boolean {
  const s = source.toLowerCase();
  return (
    s === "fb" ||
    s === "facebook" ||
    s === "instagram" ||
    s === "ig" ||
    s === "meta" ||
    s.includes("facebook")
  );
}

/** Pick the best JOIN key between GA4 and the ads sheet/BQ.
 *
 *  Google: sessionCampaignId is the pure numeric campaign id — use it
 *  directly, falling back to the name only when the id is "(not set)".
 *
 *  Meta (facebook/instagram/ig/fb/meta): GA4's sessionCampaignId instead
 *  carries the ad-set-level UTM string written by Meta's auto-tagging
 *  (e.g. "120242725939000218_v2_s10_e7658"), while the *true* numeric
 *  platform campaign id (e.g. "120242725938990218", matching
 *  ads_meta_daily.campaign_id) surfaces in sessionCampaignName instead.
 *  Confirmed 2026-07-02 on DOZO: 172-sample manual check + full-month
 *  (2026-06) validation — old cid-first key matched 0/928 meta session
 *  rows (0%) against ads_meta campaign_id, name-first key matched
 *  925/928 rows / 40,022 of 40,109 sessions (99.8%).
 *
 *  Bing/Yahoo/other paid sources keep the legacy cid-first behaviour
 *  (unchanged — not part of this fix, no counter-evidence found). */
function ga4MatchKey(source: string, cid: string, cname: string): string {
  // 🔴 "(not set)" 判定は clean() より先に行う。clean() が括弧を剥がすため
  // 後判定だと "not set" になり永遠に不成立 → Yahoo 等 cid が常に "(not set)"
  // のソースで matchKey がリテラル "not set" になっていた（2026-07-03 監査で発見）。
  const isUnset = (v: string) => !v || v.trim() === "(not set)";
  const clean = (v: string) => v.replace(/^[[(]+|[\])]+$/g, "").trim();
  if (isMetaSource(source)) {
    if (!isUnset(cname)) return clean(cname);
    return isUnset(cid) ? "" : clean(cid);
  }
  if (!isUnset(cid)) return clean(cid);
  return isUnset(cname) ? "" : clean(cname);
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

/* ------------- secondary channel events (4th+ chart toggles) ------------- */

/** A single named secondary-event toggle. `key` is the stable identifier
 *  used as the map key in ChannelMonth.secondary / ChannelDay.secondary;
 *  `events` are the GA4 eventName values that roll up into it. */
export interface SecondaryEventDef {
  key: string;
  label: string;
  events: string[];
}

/** クライアント（GA4プロパティ）ごとのチャネルチャート第4指標以降。
 *  HS は会員登録（key event 会員登録完了 763/28d ≈ sign_up 785）のみ。
 *  DOZO に sign_up は存在せず（実測0行）、Thanks complete（実測4,873/90d）
 *  と Wedding complete（実測314/90d）の2イベントが正
 *  （CEO指摘 2026-07-02、GA4 Data API 実測）。 */
const SECONDARY_EVENTS: Record<string, SecondaryEventDef[]> = {
  "302745512": [{ key: "member", label: "会員登録", events: ["会員登録完了"] }], // HS
  "311951480": [
    { key: "thanks", label: "Thanks", events: ["Thanks complete"] },
    { key: "wedding", label: "Wedding", events: ["Wedding complete"] },
  ], // DOZO
};
const DEFAULT_SECONDARY: SecondaryEventDef[] = [{ key: "member", label: "会員登録", events: ["sign_up"] }];

function secondaryEventsFor(propertyId: string): SecondaryEventDef[] {
  return SECONDARY_EVENTS[propertyId] ?? DEFAULT_SECONDARY;
}

/** All secondary-event event-names for a property, flattened — used as a
 *  single `inListFilter` so the GA4 query count stays at one extra request
 *  regardless of how many named toggles a client has. */
function allSecondaryEventNames(propertyId: string): string[] {
  return secondaryEventsFor(propertyId).flatMap((d) => d.events);
}

/** Reverse lookup: GA4 eventName → the toggle key it belongs to. */
function secondaryKeyForEventName(propertyId: string, eventName: string): string | null {
  for (const def of secondaryEventsFor(propertyId)) {
    if (def.events.includes(eventName)) return def.key;
  }
  return null;
}

/** チャートのトグル定義一覧（page 側から参照）。 */
export function ga4SecondaryEventDefs(client: ClientConfig): SecondaryEventDef[] {
  return secondaryEventsFor(client.ga4PropertyId ?? "");
}

/** 後方互換: 最初のトグルの表示名のみを返す。新規呼び出しは
 *  ga4SecondaryEventDefs() を使うこと。 */
export function ga4SecondaryEventLabel(client: ClientConfig): string {
  return secondaryEventsFor(client.ga4PropertyId ?? "")[0]?.label ?? "会員登録";
}

/* ---------------------- real calls (cached) ---------------------- */

async function realChannels(propertyId: string): Promise<ChannelMonth[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const secondaryEventNames = allSecondaryEventNames(propertyId);
  const [res, secondaryRes] = await Promise.all([
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
    // Parallel: secondary event counts per (yearMonth, channel, eventName).
    // Event names are per-client (HS=[会員登録完了], DOZO=[Thanks complete,
    // Wedding complete]) — a single inListFilter + eventName dimension keeps
    // this to one extra request regardless of how many toggles a client has.
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: "730daysAgo", endDate: "today" }],
        dimensions: [{ name: "yearMonth" }, { name: "sessionDefaultChannelGroup" }, { name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: secondaryEventNames },
          },
        },
        limit: "1000",
      },
    }),
  ]);
  const secondaryMap = new Map<string, Record<string, number>>();
  for (const r of secondaryRes.data.rows ?? []) {
    const ym = yearMonthFromGa4(r.dimensionValues?.[0]?.value ?? "");
    const ch = normaliseChannel(r.dimensionValues?.[1]?.value);
    const eventName = r.dimensionValues?.[2]?.value ?? "";
    const secondaryKey = secondaryKeyForEventName(propertyId, eventName);
    if (!secondaryKey) continue;
    const key = `${ym}|${ch}`;
    const bucket = secondaryMap.get(key) ?? {};
    bucket[secondaryKey] = (bucket[secondaryKey] ?? 0) + Number(r.metricValues?.[0]?.value ?? 0);
    secondaryMap.set(key, bucket);
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
      secondary: secondaryMap.get(key) ?? {},
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
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  // GA4 rejects date ranges whose endDate is in the future (surfaces as a
  // currency-conversion error on some properties) — clamp to today so the
  // current (in-progress) month never sends a future end date.
  const end = monthEnd < today ? monthEnd : today;
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

/** Default lookback window (matches the previous hardcoded "28daysAgo"
 *  behaviour) used whenever a caller omits explicit {start,end}. */
const DEFAULT_PERIOD_DAYS = 28;

export interface Period {
  start: string;
  end: string;
}

function defaultPeriod(): Period {
  return { start: `${DEFAULT_PERIOD_DAYS}daysAgo`, end: "today" };
}

async function realLandingPages(propertyId: string, period: Period): Promise<LandingPageRow[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const res = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    auth,
    requestBody: {
      dateRanges: [{ startDate: period.start, endDate: period.end }],
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [
        { name: "sessions" },
        { name: "ecommercePurchases" },
        { name: "purchaseRevenue" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "30",
    },
  });
  return (res.data.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    conversions: Number(r.metricValues?.[1]?.value ?? 0),
    revenue: Number(r.metricValues?.[2]?.value ?? 0),
  }));
}

/** Item-day rows whose implied unit price exceeds this are treated as GA4
 *  measurement pollution (confirmed on HS: a single `purchase` event firing
 *  with a cart-quantity/estimate value instead of an actual order, e.g.
 *  21,180 units of a pen in one day at an implied ¥2.39M/unit). Excluding
 *  them is a dashboard-side mitigation, not a fix — root cause is the site's
 *  `purchase` event implementation. */
const PRODUCT_UNIT_PRICE_POLLUTION_THRESHOLD = 100_000;
/** 単一注文内の1商品売上がこの額を超える行は壊れた purchase イベントとみなす
 *  （HS実測: 1注文で¥13.7億等。正当な大口B2B注文は数百万円台まで）。 */
const PRODUCT_TX_REVENUE_POLLUTION_THRESHOLD = 10_000_000;

export interface ProductsResult {
  rows: ProductRow[];
  /** Set when one or more item-day rows were dropped for exceeding the
   *  pollution threshold, so the UI can disclose the adjustment. */
  dataQualityNote: string | null;
  /** True when the post-filter item-scope revenue total still exceeds the
   *  transaction-scope purchaseRevenue by >3x — i.e. the site's `purchase`
   *  items[] payload is structurally broken (confirmed on HS: quantity is
   *  also inflated, so the unit-price filter alone cannot recover a sane
   *  total). The UI must not present 単価/売上 as real figures. */
  revenueUnreliable: boolean;
}

async function realProducts(propertyId: string, period: Period): Promise<ProductsResult> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  // Fetch at the (item × transactionId) grain: (a) 購入件数 = distinct
  // transactionId per item（CEO要望の「1件あたり売上」の分母）、(b) HS の
  // purchase イベント汚染は特定の壊れた注文に集中している（実測: 1注文で
  // 21,000点/¥123億 等）ため、注文単位で除外する方が item-day 除外より精密。
  const [res, txnRes] = await Promise.all([
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: period.start, endDate: period.end }],
        dimensions: [{ name: "itemName" }, { name: "itemId" }, { name: "transactionId" }],
        metrics: [
          { name: "itemsPurchased" },
          { name: "itemRevenue" },
        ],
        limit: "100000",
      },
    }),
    // Transaction-scope total for the same window: the sanity yardstick the
    // item-scope rollup is compared against (unaffected by items[] pollution).
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: period.start, endDate: period.end }],
        metrics: [{ name: "purchaseRevenue" }],
      },
    }),
  ]);
  const txnRevenue = Number(txnRes.data.rows?.[0]?.metricValues?.[0]?.value ?? 0);
  const truncated = Number(res.data.rowCount ?? 0) > (res.data.rows?.length ?? 0);

  // 汚染注文の除外（注文まるごと）: 1個あたり単価 > ¥10万、または単一注文内の
  // 商品売上 > ¥1,000万 の行を含む注文は、壊れた purchase イベント由来とみなし
  // **その注文の全行**を除外する（two-pass。壊れた注文の他商品行の残留を防ぐ）。
  const hasRealTxId = (v: string) => !!v && v !== "(not set)";
  const isPolluted = (units: number, revenue: number) => {
    const impliedUnitPrice = units > 0 ? revenue / units : 0;
    return impliedUnitPrice > PRODUCT_UNIT_PRICE_POLLUTION_THRESHOLD || revenue > PRODUCT_TX_REVENUE_POLLUTION_THRESHOLD;
  };
  const pollutedTxIds = new Set<string>();
  for (const r of res.data.rows ?? []) {
    const txId = r.dimensionValues?.[2]?.value ?? "";
    const conversions = Number(r.metricValues?.[0]?.value ?? 0);
    const revenue = Number(r.metricValues?.[1]?.value ?? 0);
    if (hasRealTxId(txId) && isPolluted(conversions, revenue)) pollutedTxIds.add(txId);
  }
  let droppedTx = 0;
  const byItem = new Map<string, { productName: string; sku: string; tx: Set<string>; conversions: number; revenue: number }>();
  for (const r of res.data.rows ?? []) {
    const productName = r.dimensionValues?.[0]?.value ?? "";
    const sku = r.dimensionValues?.[1]?.value ?? "";
    const txId = r.dimensionValues?.[2]?.value ?? "";
    const conversions = Number(r.metricValues?.[0]?.value ?? 0);
    const revenue = Number(r.metricValues?.[1]?.value ?? 0);
    // 汚染注文の全行、または txId 不明かつ行単体で汚染判定の行を落とす。
    if ((hasRealTxId(txId) && pollutedTxIds.has(txId)) || (!hasRealTxId(txId) && isPolluted(conversions, revenue))) {
      droppedTx += 1;
      continue;
    }
    const key = `${sku}|${productName}`;
    const cur = byItem.get(key) ?? { productName, sku, tx: new Set<string>(), conversions: 0, revenue: 0 };
    // "(not set)" は注文IDとして数えない（orderCount は実IDのユニーク数のみ）。
    if (hasRealTxId(txId)) cur.tx.add(txId);
    cur.conversions += conversions;
    cur.revenue += revenue;
    byItem.set(key, cur);
  }

  const all = Array.from(byItem.values()).map((r) => ({
    productName: r.productName,
    sku: r.sku,
    orderCount: r.tx.size,
    conversions: r.conversions,
    revenue: r.revenue,
    unitPrice: r.conversions > 0 ? Math.round(r.revenue / r.conversions) : 0,
    perOrder: r.tx.size > 0 ? Math.round(r.revenue / r.tx.size) : 0,
  }));
  const itemScopeTotal = all.reduce((acc, r) => acc + r.revenue, 0);
  // 取引単位の除外後もなお item計測合計がサイト全体売上の3倍を超える場合は
  // 売上系列を非表示にする（誤った数字を出さない）。
  const revenueUnreliable = txnRevenue > 0 && itemScopeTotal > txnRevenue * 3;
  const rows = all
    .sort((a, b) => (revenueUnreliable ? b.orderCount - a.orderCount : b.revenue - a.revenue))
    .slice(0, 30);

  let dataQualityNote: string | null = null;
  if (revenueUnreliable) {
    dataQualityNote = `GA4 item計測が汚染されているため売上系列は非表示（item計測合計がサイト全体売上の${Math.round(itemScopeTotal / txnRevenue)}倍）。購入件数順で表示中。根本対処はサイト側purchaseイベント実装の修正が必要`;
  } else if (droppedTx > 0) {
    dataQualityNote = `GA4 item計測の異常注文（単価>¥10万/個 または 1注文¥1,000万超）を${pollutedTxIds.size}注文（明細${droppedTx}行）除外済み。根本対処はサイト側purchaseイベント実装の修正が必要`;
  }
  if (truncated) {
    dataQualityNote = `${dataQualityNote ? dataQualityNote + " / " : ""}期間が長く取引明細が10万行を超えたため一部集計対象外（期間を短くすると正確）`;
  }
  return { rows, dataQualityNote, revenueUnreliable };
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
      matchKey: ga4MatchKey(source, campaignId, campaignName),
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

export async function getGa4MonthlyChannels(client: ClientConfig): Promise<Ga4Result<ChannelMonth[]>> {
  if (!client.ga4PropertyId) return mockResult(mockChannels());
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<ChannelMonth[]>> => {
      try {
        return realResult(await realChannels(pid));
      } catch (err) {
        console.error("[ga4] channels fetch failed, using mock:", err);
        return mockResult(mockChannels());
      }
    },
    [`ga4-channels-${pid}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getDeviceTotals(client: ClientConfig, anchor: string): Promise<Ga4Result<DeviceTotals[]>> {
  if (!client.ga4PropertyId) return mockResult(mockDevices(anchor));
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<DeviceTotals[]>> => {
      try {
        return realResult(await realDevices(pid, anchor));
      } catch (err) {
        console.error("[ga4] device fetch failed, using mock:", err);
        return mockResult(mockDevices(anchor));
      }
    },
    [`ga4-device-${pid}-${anchor.slice(0, 7)}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getTopLandingPages(
  client: ClientConfig,
  period?: Period
): Promise<Ga4Result<LandingPageRow[]>> {
  const p = period ?? defaultPeriod();
  if (!client.ga4PropertyId) return mockResult(mockLandingPages());
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<LandingPageRow[]>> => {
      try {
        return realResult(await realLandingPages(pid, p));
      } catch (err) {
        console.error("[ga4] lp fetch failed, using mock:", err);
        return mockResult(mockLandingPages());
      }
    },
    [`ga4-lp-${pid}-${p.start}-${p.end}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

/** Daily channel report (last 90 days). Includes per-client secondary event
 *  counts via a second filtered query, same pattern as realChannels. */
async function realDailyChannels(propertyId: string): Promise<ChannelDay[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-ga4-auth");
  const analyticsdata = google.analyticsdata("v1beta");
  const secondaryEventNames = allSecondaryEventNames(propertyId);
  const [res, secondaryRes] = await Promise.all([
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "ecommercePurchases" },
          { name: "purchaseRevenue" },
        ],
        limit: "10000",
      },
    }),
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      auth,
      requestBody: {
        dateRanges: [{ startDate: "90daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }, { name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: secondaryEventNames },
          },
        },
        limit: "10000",
      },
    }),
  ]);
  const secondaryMap = new Map<string, Record<string, number>>();
  for (const r of secondaryRes.data.rows ?? []) {
    const date = ga4DateToIso(r.dimensionValues?.[0]?.value ?? "");
    const ch = normaliseChannel(r.dimensionValues?.[1]?.value);
    const eventName = r.dimensionValues?.[2]?.value ?? "";
    const secondaryKey = secondaryKeyForEventName(propertyId, eventName);
    if (!secondaryKey) continue;
    const key = `${date}|${ch}`;
    const bucket = secondaryMap.get(key) ?? {};
    bucket[secondaryKey] = (bucket[secondaryKey] ?? 0) + Number(r.metricValues?.[0]?.value ?? 0);
    secondaryMap.set(key, bucket);
  }
  const out: ChannelDay[] = [];
  for (const r of res.data.rows ?? []) {
    const date = ga4DateToIso(r.dimensionValues?.[0]?.value ?? "");
    const ch = normaliseChannel(r.dimensionValues?.[1]?.value);
    out.push({
      date,
      channel: ch,
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      conversions: Number(r.metricValues?.[1]?.value ?? 0),
      revenue: Number(r.metricValues?.[2]?.value ?? 0),
      secondary: secondaryMap.get(`${date}|${ch}`) ?? {},
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getGa4DailyChannels(client: ClientConfig): Promise<Ga4Result<ChannelDay[]>> {
  if (!client.ga4PropertyId) return mockResult(mockDailyChannels());
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<ChannelDay[]>> => {
      try {
        return realResult(await realDailyChannels(pid));
      } catch (err) {
        console.error("[ga4] daily channels fetch failed, using mock:", err);
        return mockResult(mockDailyChannels());
      }
    },
    [`ga4-daily-channels-${pid}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getGa4PaidCampaigns(
  client: ClientConfig,
  startDate: string,
  endDate: string
): Promise<Ga4Result<Ga4CampaignRow[]>> {
  if (!client.ga4PropertyId) return { rows: [], isMock: false, warnings: [] };
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<Ga4CampaignRow[]>> => {
      try {
        return realResult(await realPaidCampaigns(pid, startDate, endDate));
      } catch (err) {
        console.error("[ga4] paid campaigns fetch failed:", err);
        return { rows: [], isMock: false, warnings: [String(err)] };
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
): Promise<Ga4Result<Ga4AdgroupRow[]>> {
  if (!client.ga4PropertyId) return { rows: [], isMock: false, warnings: [] };
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<Ga4AdgroupRow[]>> => {
      try {
        return realResult(await realGoogleAdgroups(pid, startDate, endDate));
      } catch (err) {
        console.error("[ga4] adgroups fetch failed:", err);
        return { rows: [], isMock: false, warnings: [String(err)] };
      }
    },
    [`ga4-adg-${pid}-${startDate}-${endDate}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`ga4-${pid}`] }
  )();
}

export async function getTopProducts(
  client: ClientConfig,
  period?: Period
): Promise<Ga4Result<ProductsResult>> {
  const p = period ?? defaultPeriod();
  const mockFallback = (): ProductsResult => ({ rows: mockProducts(), dataQualityNote: null, revenueUnreliable: false });
  if (!client.ga4PropertyId) return mockResult(mockFallback());
  const pid = client.ga4PropertyId;
  return unstable_cache(
    async (): Promise<Ga4Result<ProductsResult>> => {
      try {
        const result = await realProducts(pid, p);
        // If GA4 items API returns nothing (no e-commerce tagging), fall back
        // so the dashboard isn't empty-looking.
        return result.rows.length > 0 ? realResult(result) : mockResult(mockFallback());
      } catch (err) {
        console.error("[ga4] products fetch failed, using mock:", err);
        return mockResult(mockFallback());
      }
    },
    [`ga4-products-${pid}-${p.start}-${p.end}`],
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
  // Anchored to "now" (not a hardcoded past date) so mockDevices()'s
  // yearMonth filter always has a matching month — a stale hardcoded anchor
  // falls outside the generated 12-month window once enough time passes,
  // silently producing an empty filter result (device breakdown shows 0).
  const anchor = new Date();
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
        // Mock secondary event: ~2% of sessions for paid-search-like channels,
        // half for others. Keyed generically as "member" — mocks are only
        // used when no ga4PropertyId is configured, so the per-client
        // SecondaryEventDef key list is unavailable here.
        secondary: { member: Math.round(sessions * (ch === "Paid Search" || ch === "Paid Social" ? 0.02 : 0.01)) },
        newUsers: Math.round(sessions * newRatio),
        returningUsers: Math.round(sessions * (1 - newRatio)),
      });
    }
  }
  return rows;
}

function mockDailyChannels(): ChannelDay[] {
  const out: ChannelDay[] = [];
  const anchor = new Date("2026-04-22T00:00:00Z");
  for (let d = 89; d >= 0; d--) {
    const day = new Date(anchor);
    day.setUTCDate(day.getUTCDate() - d);
    const iso = day.toISOString().slice(0, 10);
    const dayOfWeek = day.getUTCDay();
    // Weekday modifier: weekends slightly lower traffic
    const weekMod = dayOfWeek === 0 || dayOfWeek === 6 ? 0.8 : 1.0;
    for (const ch of CHANNELS) {
      const base =
        { "Paid Search": 730, "Paid Social": 300, "Organic Search": 1180, Direct: 600, Referral: 200, Email: 150, Other: 50 }[ch] ?? 0;
      const cvRate =
        { "Paid Search": 0.028, "Paid Social": 0.012, "Organic Search": 0.018, Direct: 0.022, Referral: 0.015, Email: 0.04, Other: 0.005 }[ch] ?? 0;
      const rpc =
        { "Paid Search": 5800, "Paid Social": 3200, "Organic Search": 6200, Direct: 9000, Referral: 4800, Email: 11000, Other: 2000 }[ch] ?? 0;
      const jitter = 0.85 + Math.abs(seeded(d * 13 + ch.length)) * 0.3;
      const sessions = Math.round(base * weekMod * jitter);
      const conversions = Math.round(sessions * cvRate);
      const revenue = Math.round(conversions * rpc);
      out.push({
        date: iso,
        channel: ch,
        sessions,
        conversions,
        revenue,
        secondary: { member: Math.round(sessions * (ch === "Paid Search" || ch === "Paid Social" ? 0.02 : 0.01)) },
      });
    }
  }
  return out;
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
  return base.map(([productName, sku, cv, unitPrice]) => {
    const orderCount = Math.max(1, Math.round(cv / 4));
    const revenue = cv * unitPrice;
    return {
      productName,
      sku,
      orderCount,
      conversions: cv,
      revenue,
      unitPrice,
      perOrder: Math.round(revenue / orderCount),
    };
  });
}
