"use server";

import { google } from "googleapis";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";
import { headers } from "next/headers";

/**
 * Server actions for the admin panel. All actions re-check the viewer
 * kind via the middleware-set header — defense in depth. The page
 * wrapper also guards, but an RPC/action endpoint without its own gate
 * would be a hole if the route ever gets mounted elsewhere.
 */

async function assertAdmin(): Promise<void> {
  const h = await headers();
  const kind = h.get("x-viewer-kind");
  if (kind !== "admin") throw new Error("forbidden");
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

export type HealthStatus = "ok" | "fail" | "skipped";

export interface HealthResult {
  source: string;
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
}

export interface ClientHealth {
  clientId: ClientId;
  label: string;
  slug: string;
  active: boolean;
  results: HealthResult[];
}

async function checkSheet(sheetId: string | undefined, range: string | undefined, label: string): Promise<HealthResult> {
  if (!sheetId || !range) return { source: label, status: "skipped", detail: "未設定" };
  const creds = loadSa();
  if (!creds) return { source: label, status: "fail", detail: "SA 認証情報なし" };
  const start = Date.now();
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range.replace(/!.*$/, "!A1:A2"),
    });
    const rows = res.data.values?.length ?? 0;
    return { source: label, status: "ok", detail: `${rows} 行読込`, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      source: label,
      status: "fail",
      detail: e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120),
      latencyMs: Date.now() - start,
    };
  }
}

async function checkGa4(propertyId: string | null | undefined): Promise<HealthResult> {
  if (!propertyId) return { source: "GA4", status: "skipped", detail: "未設定" };
  const creds = loadSa();
  if (!creds) return { source: "GA4", status: "fail", detail: "SA 認証情報なし" };
  const start = Date.now();
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const ga4 = google.analyticsdata({ version: "v1beta", auth });
    const res = await ga4.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "sessions" }],
      },
    });
    const v = res.data.rows?.[0]?.metricValues?.[0]?.value ?? "0";
    return { source: "GA4", status: "ok", detail: `sessions=${v}/7d`, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      source: "GA4",
      status: "fail",
      detail: e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120),
      latencyMs: Date.now() - start,
    };
  }
}

async function checkGsc(siteUrl: string | null | undefined): Promise<HealthResult> {
  if (!siteUrl) return { source: "GSC", status: "skipped", detail: "未設定" };
  const creds = loadSa();
  if (!creds) return { source: "GSC", status: "fail", detail: "SA 認証情報なし" };
  const start = Date.now();
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const sc = google.searchconsole({ version: "v1", auth });
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start2 = new Date();
    start2.setDate(start2.getDate() - 8);
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start2.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["date"],
        rowLimit: 5,
      },
    });
    const days = res.data.rows?.length ?? 0;
    return { source: "GSC", status: "ok", detail: `${days} 日データあり`, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      source: "GSC",
      status: "fail",
      detail: e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120),
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Run health checks for a single client across all its configured data
 * sources. Returned in parallel — the caller renders whichever checks
 * complete first.
 */
export async function runClientHealthCheck(clientId: ClientId): Promise<ClientHealth> {
  await assertAdmin();
  const c = CLIENTS[clientId];
  const ds = c.dataSource;
  const [adsResult, targetsResult, eccubeResult, ga4Result, gscResult] = await Promise.all([
    checkSheet(ds?.sheetId, ds?.rawAdsRange, "広告 raw Sheet"),
    checkSheet(ds?.targetsSheetId, ds?.targetsRange, "目標 Sheet"),
    checkSheet(ds?.eccubeSheetId, ds?.eccubeRange, "ECCUBE Sheet"),
    checkGa4(c.ga4PropertyId),
    checkGsc(c.gscSiteUrl),
  ]);
  return {
    clientId,
    label: c.label,
    slug: c.slug,
    active: c.active,
    results: [adsResult, targetsResult, eccubeResult, ga4Result, gscResult],
  };
}

/** Run health checks for every client with at least one configured
 *  source. Sequential per-client so console logs stay readable — each
 *  client's 5 checks already run in parallel inside runClientHealthCheck. */
export async function runAllHealthChecks(): Promise<ClientHealth[]> {
  await assertAdmin();
  const out: ClientHealth[] = [];
  for (const id of CLIENT_IDS) {
    const c = CLIENTS[id];
    // Skip clients with no data source configured (reduces noise).
    if (!c.dataSource && !c.ga4PropertyId && !c.gscSiteUrl) continue;
    out.push(await runClientHealthCheck(id));
  }
  return out;
}

/** Summarise which env vars are configured (masked). Never returns the
 *  actual values — just presence + fingerprint so the panel can say
 *  "set" / "unset" per slot. */
export interface EnvStatus {
  key: string;
  set: boolean;
  /** First/last 2 chars when present, masked middle. "abc…xyz" */
  preview?: string;
  target: "admin" | "client" | "infra";
}

export async function listEnvStatus(): Promise<EnvStatus[]> {
  await assertAdmin();
  const fingerprint = (v: string): string => {
    if (v.length <= 6) return "•".repeat(v.length);
    return `${v.slice(0, 2)}${"•".repeat(v.length - 4)}${v.slice(-2)}`;
  };
  const row = (key: string, target: EnvStatus["target"]): EnvStatus => {
    const v = process.env[key];
    return v ? { key, set: true, preview: fingerprint(v), target } : { key, set: false, target };
  };

  const result: EnvStatus[] = [
    row("BASIC_AUTH_USER", "admin"),
    row("BASIC_AUTH_PASSWORD", "admin"),
    row("AUTH_SESSION_SECRET", "admin"),
    row("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64", "infra"),
    row("CLERK_SECRET_KEY", "infra"),
    row("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "infra"),
  ];
  for (const id of CLIENT_IDS) {
    result.push(row(`CLIENT_AUTH_${id.toUpperCase()}`, "client"));
  }
  return result;
}

/** Generate a cryptographically-strong random password for a client
 *  credential. Returned plain (no persistence) — admin copies it and
 *  pastes into Vercel env manually. */
export async function generateClientPassword(): Promise<string> {
  await assertAdmin();
  // 16-char alphanumeric, ~95 bits of entropy.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // no 0/O/I/l
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
