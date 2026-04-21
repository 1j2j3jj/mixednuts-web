export type MetricSource = "ga4" | "media";

/** Server-safe helper to read the `?src=` param from a page's searchParams.
 *  Kept out of the client component file so server pages can import it
 *  without triggering the "client function called from server" error. */
export function readSource(sp: { src?: string }): MetricSource {
  return sp.src === "media" ? "media" : "ga4";
}
