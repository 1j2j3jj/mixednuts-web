import "server-only";
import { google, type sheets_v4 } from "googleapis";
import { unstable_cache } from "next/cache";

/**
 * Service-Account loader. The JSON can arrive in one of two env shapes:
 *   1) GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 — base64-encoded JSON (recommended
 *      on Vercel to avoid newline issues in the private_key).
 *   2) GOOGLE_SERVICE_ACCOUNT_JSON — raw JSON string (works locally).
 * Returns null when neither is present so the caller can fall back to
 * mock data during local scaffolding.
 */
function loadServiceAccount(): Record<string, unknown> | null {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const json = b64 ? Buffer.from(b64, "base64").toString("utf8") : raw;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (err) {
    console.error("[sheets] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON:", err);
    return null;
  }
}

let cachedClient: sheets_v4.Sheets | null = null;

function sheetsClient(): sheets_v4.Sheets | null {
  if (cachedClient) return cachedClient;
  const credentials = loadServiceAccount();
  if (!credentials) return null;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

/**
 * CACHE_TTL_SECONDS: short enough to feel fresh, long enough to absorb
 * multi-user refresh bursts and protect the Sheets API quota. See
 * architectural discussion in _reports/2026-04-21_*.md.
 */
const CACHE_TTL_SECONDS = 60;

export interface SheetFetchResult {
  values: string[][];
  /** ms-precision UTC timestamp of when the data left the Sheets API. */
  fetchedAt: number;
  /** True when we used the built-in mock (SA not configured). */
  isMock: boolean;
}

/**
 * Tag convention: `sheet:<sheetId>:<range>`. `revalidateTag()` with the
 * same string will purge the entry and force a live re-fetch on the next
 * request (used by the "Refresh" button server action).
 */
export function sheetCacheTag(sheetId: string, range: string): string {
  return `sheet:${sheetId}:${range}`;
}

async function fetchSheetRaw(sheetId: string, range: string): Promise<SheetFetchResult> {
  const client = sheetsClient();
  if (!client) {
    // Fallback mock for local dev without SA configured. Shape matches the
    // documented HS_Raw_Ads columns so the rest of the pipeline exercises
    // real code paths.
    return { values: mockHsRawAds(), fetchedAt: Date.now(), isMock: true };
  }
  const res = await client.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return {
    values: (res.data.values as string[][] | undefined) ?? [],
    fetchedAt: Date.now(),
    isMock: false,
  };
}

/**
 * Cached sheet read. The closure is re-keyed per (sheetId, range) so distinct
 * ranges don't collide in the cache.
 */
export function fetchSheetCached(sheetId: string, range: string): Promise<SheetFetchResult> {
  const tag = sheetCacheTag(sheetId, range);
  return unstable_cache(
    async () => fetchSheetRaw(sheetId, range),
    [tag],
    { revalidate: CACHE_TTL_SECONDS, tags: [tag] }
  )();
}

/* ------------------------------------------------------------------ */
/* Mock data — used when GOOGLE_SERVICE_ACCOUNT_JSON is not configured */
/* ------------------------------------------------------------------ */

function mockHsRawAds(): string[][] {
  const header = [
    "メディア",
    "Brand/General",
    "日",
    "キャンペーンID",
    "キャンペーン",
    "通貨",
    "費用",
    "表示回数",
    "クリック数",
    "コンバージョン",
    "コンバージョン値",
  ];
  const medias: Array<["Google" | "Microsoft" | "Yahoo" | "meta", "Brand" | "General", string, string, number, number, number, number, number]> = [
    ["Google", "Brand", "1_指名_単体", "CPN-G-1001", 12000, 18000, 900, 40, 1_800_000],
    ["Google", "General", "03_展示会CPN", "CPN-G-1002", 85000, 210000, 5400, 55, 4_500_000],
    ["Google", "General", "01_PMax_Shopping", "CPN-G-1003", 220000, 880000, 9800, 120, 12_100_000],
    ["Microsoft", "Brand", "01_Microsoft検索_指名", "CPN-M-2001", 3000, 7200, 210, 12, 900_000],
    ["Microsoft", "General", "16_Microsoft_Pmax_EC", "CPN-M-2002", 58000, 165000, 3400, 42, 5_800_000],
    ["Yahoo", "Brand", "01_Yahoo検索_指名", "CPN-Y-3001", 4500, 10200, 380, 18, 1_400_000],
    ["Yahoo", "Brand", "01_Yahoo検索_指名_かけ合わせ", "CPN-Y-3002", 2100, 4600, 150, 7, 520_000],
    ["meta", "General", "01_meta広告_Advantage+_Shopping_媒体CV_アトリビューション", "CPN-X-4001", 95000, 520000, 8200, 38, 4_100_000],
  ];
  const rows: string[][] = [header];
  const today = new Date();
  // Generate 21 days of slightly-varying data so charts look real.
  for (let d = 20; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const iso = date.toISOString().slice(0, 10);
    for (const [media, bg, campaign, campaignId, cost, impr, clicks, cv, cvValue] of medias) {
      const jitter = 0.8 + ((Math.sin((d + campaign.length) * 1.7) + 1) / 2) * 0.4;
      rows.push([
        media,
        bg,
        iso,
        campaignId,
        campaign,
        "JPY",
        String(Math.round(cost * jitter)),
        String(Math.round(impr * jitter)),
        String(Math.round(clicks * jitter)),
        String(Math.round(cv * jitter)),
        String(Math.round(cvValue * jitter)),
      ]);
    }
  }
  return rows;
}
