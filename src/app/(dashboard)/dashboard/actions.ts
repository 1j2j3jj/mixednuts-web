"use server";

import { revalidateTag } from "next/cache";
import { getClient } from "@/config/clients";
import { sheetCacheTag } from "@/lib/sheets";
import { BQ_RPT_CACHE_TAG, isRptSupported } from "@/lib/sources/bq-rpt";

/**
 * Manual-refresh server action. Purges every unstable_cache entry that feeds
 * this client's dashboard so the next read hits live sources across the
 * board — not just the raw-ads sheet. Tags purged:
 *
 *   - sheet:<sheetId>:<range>  — rawAds / master / targets / eccube ranges
 *     (src/lib/sheets.ts sheetCacheTag; targets and eccube can live on a
 *     dedicated spreadsheet id, so each range is tagged independently)
 *   - ga4-<propertyId>          — src/lib/sources/ga4.ts
 *   - gsc-<siteUrl>             — src/lib/sources/gsc.ts
 *   - bq-raw                    — src/lib/sources/bq-raw.ts (global tag, not
 *                                  client-scoped; purge is a no-op for
 *                                  clients not reading via BQ_SOURCE_RAW)
 *   - bq-rpt                    — src/lib/sources/bq-rpt.ts (rpt_* marts,
 *                                  gated to clients with reporting marts)
 *
 * revalidateTag() on a tag with no live cache entries is a harmless no-op,
 * so it's safe to purge tags that don't apply to every client.
 */
export async function refreshClientData(clientId: string): Promise<{ ok: boolean; message?: string }> {
  const client = getClient(clientId);
  if (!client || !client.dataSource) {
    return { ok: false, message: "client not found or no data source" };
  }
  const { sheetId, rawAdsRange, masterRange, targetsSheetId, targetsRange, eccubeSheetId, eccubeRange } =
    client.dataSource;
  revalidateTag(sheetCacheTag(sheetId, rawAdsRange), "default");
  if (masterRange) revalidateTag(sheetCacheTag(sheetId, masterRange), "default");
  if (targetsRange) revalidateTag(sheetCacheTag(targetsSheetId ?? sheetId, targetsRange), "default");
  if (eccubeSheetId && eccubeRange) revalidateTag(sheetCacheTag(eccubeSheetId, eccubeRange), "default");

  // GA4 / GSC — purge only when the client actually has the source configured.
  if (client.ga4PropertyId) revalidateTag(`ga4-${client.ga4PropertyId}`, "default");
  if (client.gscSiteUrl) revalidateTag(`gsc-${client.gscSiteUrl}`, "default");

  // BQ raw daily rows — global tag, so purge unconditionally (no-op for
  // clients not reading via BQ_SOURCE_RAW).
  revalidateTag("bq-raw", "default");

  // BQ rpt_* cache for clients with reporting marts, so the レポート screen's
  // refresh button re-reads BigQuery. Additive: the tag is only used by
  // src/lib/sources/bq-rpt.ts, so other screens are unaffected.
  if (isRptSupported(client.id)) revalidateTag(BQ_RPT_CACHE_TAG, "default");
  return { ok: true };
}
