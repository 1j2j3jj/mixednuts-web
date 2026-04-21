import "server-only";
import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import type { ClientConfig } from "@/config/clients";

/**
 * GSC source. Real implementation uses the Search Console v1 API via the
 * mixednuts Service Account. Falls back to mock when
 * `GOOGLE_SERVICE_ACCOUNT_JSON` isn't set or the client has no gscSiteUrl.
 */

export interface GscMonth {
  yearMonth: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

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
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

const CACHE_TTL_SECONDS = 300;

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function realMonthly(siteUrl: string): Promise<GscMonth[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-gsc-auth");
  const sc = google.searchconsole("v1");
  const start = isoDaysAgo(365);
  const end = isoDaysAgo(1);
  const res = await sc.searchanalytics.query({
    auth,
    siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: ["date"],
      rowLimit: 25000,
    },
  });
  const map = new Map<string, GscMonth>();
  for (const r of res.data.rows ?? []) {
    const date = (r.keys?.[0] ?? "").slice(0, 10);
    const ym = date.slice(0, 7);
    if (!ym) continue;
    const cur = map.get(ym) ?? {
      yearMonth: ym,
      clicks: 0,
      impressions: 0,
      avgPosition: 0,
    };
    cur.clicks += Number(r.clicks ?? 0);
    cur.impressions += Number(r.impressions ?? 0);
    // Simple running average weighted by impressions.
    const pos = Number(r.position ?? 0);
    const imp = Number(r.impressions ?? 0);
    cur.avgPosition = cur.impressions > 0 ? (cur.avgPosition + pos * imp) / cur.impressions : pos;
    map.set(ym, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

async function realQueries(siteUrl: string): Promise<GscQueryRow[]> {
  const auth = makeAuth();
  if (!auth) throw new Error("no-gsc-auth");
  const sc = google.searchconsole("v1");
  const start = isoDaysAgo(28);
  const end = isoDaysAgo(1);
  const res = await sc.searchanalytics.query({
    auth,
    siteUrl,
    requestBody: {
      startDate: start,
      endDate: end,
      dimensions: ["query"],
      rowLimit: 50,
    },
  });
  return (res.data.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: Number(r.clicks ?? 0),
    impressions: Number(r.impressions ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0),
  }));
}

export async function getGscMonthly(client: ClientConfig): Promise<GscMonth[]> {
  if (!client.gscSiteUrl) return mockMonthly();
  const site = client.gscSiteUrl;
  return unstable_cache(
    async () => {
      try {
        return await realMonthly(site);
      } catch (err) {
        console.error("[gsc] monthly fetch failed, using mock:", err);
        return mockMonthly();
      }
    },
    [`gsc-monthly-${site}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`gsc-${site}`] }
  )();
}

export async function getTopGscQueries(client: ClientConfig): Promise<GscQueryRow[]> {
  if (!client.gscSiteUrl) return mockQueries();
  const site = client.gscSiteUrl;
  return unstable_cache(
    async () => {
      try {
        const rows = await realQueries(site);
        return rows.length > 0 ? rows : mockQueries();
      } catch (err) {
        console.error("[gsc] queries fetch failed, using mock:", err);
        return mockQueries();
      }
    },
    [`gsc-queries-${site}`],
    { revalidate: CACHE_TTL_SECONDS, tags: [`gsc-${site}`] }
  )();
}

/* ---------------------- mocks ---------------------- */

function mockMonthly(): GscMonth[] {
  const anchor = new Date("2026-04-21T00:00:00Z");
  const rows: GscMonth[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() - m);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const seasonal = 1 + Math.sin((d.getUTCMonth() / 12) * Math.PI * 2) * 0.2;
    rows.push({
      yearMonth: ym,
      clicks: Math.round(180_000 * seasonal),
      impressions: Math.round(2_400_000 * seasonal),
      avgPosition: Number((7.5 + Math.sin(m) * 0.4).toFixed(1)),
    });
  }
  return rows;
}

function mockQueries(): GscQueryRow[] {
  const base: Array<[string, number, number, number]> = [
    ["ノベルティ 小ロット", 8200, 142_000, 3.2],
    ["オリジナル タンブラー", 6100, 98_000, 4.1],
    ["販促品 オーダーメイド", 4800, 71_000, 2.8],
    ["展示会 配布品", 4200, 62_000, 3.5],
    ["エコバッグ オリジナル", 3900, 54_000, 4.7],
    ["ノベルティ 2026", 3400, 48_000, 2.1],
    ["販促スタイル", 3100, 4_200, 1.0],
    ["記念品 オリジナル", 2600, 41_000, 5.2],
    ["粗品 印刷", 2100, 34_000, 6.4],
    ["景品 小ロット", 1900, 29_000, 5.9],
  ];
  return base.map(([query, clicks, impressions, position]) => ({
    query,
    clicks,
    impressions,
    ctr: clicks / impressions,
    position,
  }));
}
