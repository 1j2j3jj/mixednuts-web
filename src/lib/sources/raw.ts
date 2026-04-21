import "server-only";
import { fetchSheetCached, type SheetFetchResult } from "@/lib/sheets";
import type { ClientConfig } from "@/config/clients";

/**
 * Normalised daily row — output of the raw-data source.
 *
 * We intentionally keep the column names close to the source sheet
 * (費用 → cost, 表示回数 → impressions, etc.) so the mental model stays
 * obvious while the master sheet / join rules are still being defined by
 * the CEO. When the master sheet arrives, `brandGeneral` will be
 * overwritten by the master join (campaign_id → flag).
 */
export interface DailyRow {
  media: "Google" | "Microsoft" | "Yahoo" | "meta" | string;
  brandGeneral: "Brand" | "General" | string;
  date: string; // ISO yyyy-mm-dd
  campaignId: string;
  campaignName: string;
  currency: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

export interface DailyFetchResult {
  rows: DailyRow[];
  fetchedAt: number;
  isMock: boolean;
  warnings: string[];
}

/**
 * Column index map for HS_Raw_Ads. Matches the column order documented in
 * `projects/trans/context.md`. When the CEO finalises the master sheet
 * layout this mapping may move into `ClientConfig.dataSource`.
 */
const HS_COLS = {
  media: 0,
  brandGeneral: 1,
  date: 2,
  campaignId: 3,
  campaignName: 4,
  currency: 5,
  cost: 6,
  impressions: 7,
  clicks: 8,
  conversions: 9,
  conversionValue: 10,
} as const;

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normaliseDate(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  // Accept "2026-04-21", "2026/4/21", "4/21/2026", etc.
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // If Sheets returned a JS Date-like serial, we'd need a different path;
  // `valueRenderOption: "UNFORMATTED_VALUE"` with dateTime as FORMATTED_STRING
  // should give us ISO-ish strings in practice.
  return s;
}

/**
 * Load daily ads rows for a client. Silently falls back to a mock sheet when
 * GOOGLE_SERVICE_ACCOUNT_JSON is not configured (dev-time).
 */
export async function getDailyRows(client: ClientConfig): Promise<DailyFetchResult> {
  const warnings: string[] = [];
  if (!client.dataSource || client.dataSource.kind !== "google_sheets") {
    return { rows: [], fetchedAt: Date.now(), isMock: true, warnings: ["no data source configured"] };
  }
  const { sheetId, rawAdsRange } = client.dataSource;
  let result: SheetFetchResult;
  try {
    result = await fetchSheetCached(sheetId, rawAdsRange);
  } catch (err) {
    warnings.push(`sheet fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    return { rows: [], fetchedAt: Date.now(), isMock: false, warnings };
  }

  const { values, fetchedAt, isMock } = result;
  if (values.length === 0) {
    return { rows: [], fetchedAt, isMock, warnings: ["sheet returned 0 rows"] };
  }
  // Assume first row is header; skip it.
  const dataRows = values.slice(1);
  const rows: DailyRow[] = [];
  for (const r of dataRows) {
    // Skip completely empty rows.
    if (r.every((c) => c == null || String(c).trim() === "")) continue;
    rows.push({
      media: String(r[HS_COLS.media] ?? "").trim(),
      brandGeneral: String(r[HS_COLS.brandGeneral] ?? "").trim(),
      date: normaliseDate(r[HS_COLS.date]),
      campaignId: String(r[HS_COLS.campaignId] ?? "").trim(),
      campaignName: String(r[HS_COLS.campaignName] ?? "").trim(),
      currency: String(r[HS_COLS.currency] ?? "JPY").trim(),
      cost: toNumber(r[HS_COLS.cost]),
      impressions: toNumber(r[HS_COLS.impressions]),
      clicks: toNumber(r[HS_COLS.clicks]),
      conversions: toNumber(r[HS_COLS.conversions]),
      conversionValue: toNumber(r[HS_COLS.conversionValue]),
    });
  }
  return { rows, fetchedAt, isMock, warnings };
}
