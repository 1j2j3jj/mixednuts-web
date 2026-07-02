"use server";

import { revalidateTag } from "next/cache";
import { getClient } from "@/config/clients";
import { sheetCacheTag } from "@/lib/sheets";
import { BQ_RPT_CACHE_TAG, isRptSupported } from "@/lib/sources/bq-rpt";

/**
 * Manual-refresh server action. Purges the unstable_cache entry for the
 * client's raw sheet so the next read hits the live Sheets API. Tag-based
 * so additional ranges (master, GA4) can be refreshed together later.
 */
export async function refreshClientData(clientId: string): Promise<{ ok: boolean; message?: string }> {
  const client = getClient(clientId);
  if (!client || !client.dataSource) {
    return { ok: false, message: "client not found or no data source" };
  }
  const { sheetId, rawAdsRange, masterRange } = client.dataSource;
  revalidateTag(sheetCacheTag(sheetId, rawAdsRange), "default");
  if (masterRange) revalidateTag(sheetCacheTag(sheetId, masterRange), "default");
  // Also purge the BQ rpt_* cache for clients with reporting marts, so the
  // レポート screen's refresh button re-reads BigQuery. Additive: the tag is
  // only used by src/lib/sources/bq-rpt.ts, so other screens are unaffected.
  if (isRptSupported(client.id)) revalidateTag(BQ_RPT_CACHE_TAG, "default");
  return { ok: true };
}
