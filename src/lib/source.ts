/**
 * Source-of-truth for KPI values. Three-way choice:
 *   - ga4    — GA4 ecommerce (default, cross-channel picture including
 *              organic/direct. Can under-count vs ECCUBE due to consent /
 *              ad-blocker gaps.)
 *   - media  — ad-platform self-reported conversions. Tends to over-count
 *              due to platform attribution models (view-through, cross-
 *              device). Only paid media — no organic.
 *   - eccube — shop DB aggregate (purchase records direct from the store).
 *              Most accurate for revenue/CV but unattributed (we don't
 *              know which channel drove each order).
 *
 * Use cases:
 *   - Overview totals → ga4 default; ECCUBE switch gives the "real" ceiling.
 *   - Ads / Drill (paid-media focus) → ga4 / 媒体 only (ECCUBE has no
 *     media dimension).
 */
export type MetricSource = "ga4" | "media" | "eccube";

/** Server-safe helper to read the `?src=` param from a page's searchParams.
 *  Kept out of the client component file so server pages can import it
 *  without triggering the "client function called from server" error. */
export function readSource(sp: { src?: string }): MetricSource {
  if (sp.src === "media") return "media";
  if (sp.src === "eccube") return "eccube";
  return "ga4";
}
