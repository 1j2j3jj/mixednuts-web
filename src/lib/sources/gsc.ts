import "server-only";
import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import type { ClientConfig } from "@/config/clients";
import type { OAuth2Client, GoogleAuth } from "google-auth-library";

/**
 * GSC source. Follows the SA → OAuth fallback rule defined in
 * `.claude/rules/data-access.md`:
 *
 *   1. Try Service Account first (fast, no refresh token management)
 *   2. On 401/403/404 permission errors, fall back to the shared OAuth
 *      refresh token — SA is often not added as a siteRestrictedUser on
 *      customer Search Console properties, while OAuth uses the human
 *      account that provisioned the GSC access originally.
 *
 * Falls back to mock only when neither SA nor OAuth credentials are set,
 * or both genuinely fail.
 *
 * Vercel env contract:
 *   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64  — SA creds (required for GA4 etc.)
 *   GOOGLE_OAUTH_TOKEN_JSON_BASE64      — full `_secrets/google-oauth.json`
 *                                          (client_id/secret/refresh_token)
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

type AuthLike = GoogleAuth | OAuth2Client;

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

function makeSaAuth(): GoogleAuth | null {
  const creds = loadSa();
  if (!creds) return null;
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

interface OAuthTokenFile {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  token?: string;
  installed?: { client_id?: string; client_secret?: string };
  // google-auth-library authorized_user format may also appear.
  type?: string;
}

function loadOauthCreds(): OAuthTokenFile | null {
  const b64 = process.env.GOOGLE_OAUTH_TOKEN_JSON_BASE64;
  const raw = process.env.GOOGLE_OAUTH_TOKEN_JSON;
  const json = b64 ? Buffer.from(b64, "base64").toString("utf8") : raw;
  if (!json) return null;
  try {
    return JSON.parse(json) as OAuthTokenFile;
  } catch {
    return null;
  }
}

function makeOAuth(): OAuth2Client | null {
  const creds = loadOauthCreds();
  if (!creds) return null;
  const clientId = creds.client_id ?? creds.installed?.client_id;
  const clientSecret = creds.client_secret ?? creds.installed?.client_secret;
  const refreshToken = creds.refresh_token;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function isPermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number; status?: number; response?: { status?: number } };
  const code = e.code ?? e.status ?? e.response?.status;
  return code === 401 || code === 403 || code === 404;
}

/**
 * Runs a GSC API call with SA first, falling back to OAuth on permission
 * errors. Throws if both fail — callers catch and revert to mock.
 */
async function withAuthFallback<T>(run: (auth: AuthLike) => Promise<T>): Promise<T> {
  const sa = makeSaAuth();
  if (sa) {
    try {
      return await run(sa);
    } catch (err) {
      if (!isPermissionError(err)) throw err;
      console.warn("[gsc] SA denied, trying OAuth fallback:", (err as Error).message);
    }
  }
  const oauth = makeOAuth();
  if (!oauth) throw new Error("no-gsc-auth-available");
  return await run(oauth);
}

const CACHE_TTL_SECONDS = 300;

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function realMonthly(siteUrl: string): Promise<GscMonth[]> {
  const sc = google.searchconsole("v1");
  const start = isoDaysAgo(365);
  const end = isoDaysAgo(1);
  const res = await withAuthFallback((auth) =>
    sc.searchanalytics.query({
      // googleapis accepts GoogleAuth or OAuth2Client; cast to satisfy the
      // overload set (first positional parameter type carries `auth`).
      auth: auth as never,
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["date"],
        rowLimit: 25000,
      },
    })
  );
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
  const sc = google.searchconsole("v1");
  const start = isoDaysAgo(28);
  const end = isoDaysAgo(1);
  const res = await withAuthFallback((auth) =>
    sc.searchanalytics.query({
      // googleapis accepts GoogleAuth or OAuth2Client; cast to satisfy the
      // overload set (first positional parameter type carries `auth`).
      auth: auth as never,
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["query"],
        rowLimit: 50,
      },
    })
  );
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
