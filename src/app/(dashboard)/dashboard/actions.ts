"use server";

import { revalidateTag } from "next/cache";
import { getClient } from "@/config/clients";
import { sheetCacheTag } from "@/lib/sheets";

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
  return { ok: true };
}
