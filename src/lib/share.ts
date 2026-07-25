/**
 * Pure helper for table "share-of-total" columns (C2-b, spec: a horizontal
 * bar + % label beside numbers that today have no visual encoding — e.g.
 * "Google is 78% of spend"). No I/O, no formatting — ShareBar.tsx renders
 * the result.
 */

/**
 * Ratio of `value` to `total`, in 0..1. Returns null when the denominator is
 * missing, zero, or negative, or either input is non-finite — callers must
 * render an em-dash / empty track in that case, never 0% or NaN (per the
 * brief: MSEC has no targets, chakin can have GA4 zeros with real spend, so
 * a zero/undefined denominator is a routine case, not an edge case).
 */
export function computeShare(
  value: number | null | undefined,
  total: number | null | undefined,
): number | null {
  if (value == null || total == null) return null;
  if (!Number.isFinite(value) || !Number.isFinite(total)) return null;
  if (total <= 0) return null;
  // A negative row value (shouldn't happen for spend/revenue, but guard
  // anyway) still produces a mathematically valid ratio — only the
  // denominator is treated as the "no data" signal.
  return value / total;
}

/** Clamps a 0..1 ratio to an integer 0..100 for rendering (bar width / %
 *  label). Kept separate from computeShare so the raw ratio stays available
 *  for callers that want more precision than a rounded percentage. */
export function shareToPercent(ratio: number | null): number | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}
