import "server-only";
import { fetchSheetCached, type SheetFetchResult } from "@/lib/sheets";
import type { ClientConfig } from "@/config/clients";

/**
 * Normalised daily row — output of the raw-data source.
 *
 * Column names kept close to the source sheet (費用 → cost, etc.) so the
 * mapping stays obvious. Brand/General is not tracked per CEO decision
 * (2026-04-22): the dashboard works off media × campaign × ADG alone.
 */
export interface DailyRow {
  media: "Google" | "Microsoft" | "Yahoo" | "meta" | "LinkedIn" | string;
  date: string; // ISO yyyy-mm-dd
  campaignId: string;
  campaignName: string;
  /** Ad group id. May be empty when the source doesn't expose ADG (e.g. the
   *  current HS_Raw_Ads sheet is campaign-grain). The mock generates two
   *  synthetic ADGs per campaign so drilldown UX can be exercised. */
  adgroupId: string;
  adgroupName: string;
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
 * Column index map for the HS ADG-grained multi-media export sheet
 * (HS_202410_202603 / シート1). 12 columns, media values seen in the wild:
 * Google / Yahoo / Microsoft / meta / LinkedIn.
 *
 * Brand/General is not exported; we infer it from the campaign name
 * (contains 指名 → Brand) so the downstream filters still work.
 */
const HS_COLS = {
  date: 0,
  media: 1,
  campaignId: 2,
  campaignName: 3,
  adgroupId: 4,
  adgroupName: 5,
  currency: 6,
  cost: 7,
  impressions: 8,
  clicks: 9,
  conversions: 10,
  conversionValue: 11,
} as const;

/** Strip leading/trailing brackets often present in Microsoft Ads export
 *  (e.g. "[518730332]" → "518730332") so the JOIN key with GA4 matches. */
function stripBrackets(s: string): string {
  return s.replace(/^[[(]+|[\])]+$/g, "").trim();
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Split one (campaign × date) row into two synthetic ADGs with a 60/40
 *  spend split. Kept deterministic so the drill UI is stable across
 *  reloads. Used only when the source sheet has no ADG columns. */
function expandWithSyntheticAdgs(rows: DailyRow[]): DailyRow[] {
  const out: DailyRow[] = [];
  for (const r of rows) {
    const base = r.campaignId || r.campaignName || "CPN";
    const splits: Array<{ id: string; name: string; share: number }> = [
      { id: `${base}-AG1`, name: `${r.campaignName || "CPN"} · AG1`, share: 0.6 },
      { id: `${base}-AG2`, name: `${r.campaignName || "CPN"} · AG2`, share: 0.4 },
    ];
    for (const s of splits) {
      out.push({
        ...r,
        adgroupId: s.id,
        adgroupName: s.name,
        cost: Math.round(r.cost * s.share),
        impressions: Math.round(r.impressions * s.share),
        clicks: Math.round(r.clicks * s.share),
        conversions: Math.round(r.conversions * s.share),
        conversionValue: Math.round(r.conversionValue * s.share),
      });
    }
  }
  return out;
}

function normaliseDate(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  // Accept "2026-04-21", "2026/4/21".
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Unrecognised input (including the media name when column mapping is wrong
  // on a partial import): return empty so downstream `filter(Boolean)` drops
  // the row instead of propagating garbage to date arithmetic.
  return "";
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
    if (r.every((c) => c == null || String(c).trim() === "")) continue;
    const campaignName = String(r[HS_COLS.campaignName] ?? "").trim();
    rows.push({
      media: String(r[HS_COLS.media] ?? "").trim(),
      date: normaliseDate(r[HS_COLS.date]),
      campaignId: stripBrackets(String(r[HS_COLS.campaignId] ?? "")),
      campaignName,
      adgroupId: stripBrackets(String(r[HS_COLS.adgroupId] ?? "")),
      adgroupName: String(r[HS_COLS.adgroupName] ?? "").trim(),
      currency: String(r[HS_COLS.currency] ?? "JPY").trim(),
      cost: toNumber(r[HS_COLS.cost]),
      impressions: toNumber(r[HS_COLS.impressions]),
      clicks: toNumber(r[HS_COLS.clicks]),
      conversions: toNumber(r[HS_COLS.conversions]),
      conversionValue: toNumber(r[HS_COLS.conversionValue]),
    });
  }
  // Synthetic ADG expansion runs ONLY for mock data. Real data without ADG
  // columns passes through with empty adgroupId — the drilldown will show
  // "(no adgroup)" which is a more honest signal than a fake 60/40 split.
  if (isMock && rows.length > 0 && rows.every((r) => !r.adgroupId)) {
    return { rows: expandWithSyntheticAdgs(rows), fetchedAt, isMock, warnings };
  }
  return { rows, fetchedAt, isMock, warnings };
}
