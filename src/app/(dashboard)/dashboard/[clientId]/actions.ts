"use server";

import { revalidateTag } from "next/cache";
import { getClient } from "@/config/clients";
import { sheetCacheTag } from "@/lib/sheets";

/**
 * Manual-refresh server action. Called from the "Refresh" button in the
 * dashboard header. Purges the unstable_cache entry for the client's raw
 * sheet so the next read hits the live Sheets API.
 *
 * Why tag-based: we can add more ranges (master, GA4) later and refresh
 * them all atomically by tagging each with the same prefix.
 */
export async function refreshClientData(clientId: string): Promise<{ ok: boolean; message?: string }> {
  const client = getClient(clientId);
  if (!client || !client.dataSource) {
    return { ok: false, message: "client not found or no data source" };
  }
  const { sheetId, rawAdsRange, masterRange } = client.dataSource;
  // Next.js 16 requires a cache-profile as the second arg. "default" reverts
  // the tagged entry to the default profile, effectively invalidating it.
  revalidateTag(sheetCacheTag(sheetId, rawAdsRange), "default");
  if (masterRange) revalidateTag(sheetCacheTag(sheetId, masterRange), "default");
  return { ok: true };
}
