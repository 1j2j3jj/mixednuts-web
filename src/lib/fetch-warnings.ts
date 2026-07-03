/**
 * Machine-readable reasons on data-fetch warning strings (Batch2 監査P0 §4).
 *
 * The bq-rpt / bq-raw fetchers report failures as plain strings in a
 * `warnings: string[]` that many pages already merge and render. Rather
 * than churning that shape across every caller, failures are tagged with a
 * `[reason]` prefix so the display layer can distinguish
 *   「データなし」(no rows, no warnings)
 *   「取得失敗」  ([fetch_failed] — transient/BQ error; rows may be an old cache)
 *   「権限なし」  ([permission] — SA lacks access / API disabled)
 * without parsing free-form BQ error text in page components.
 *
 * Pure module (no server-only) so vitest can cover the classifier.
 */

export type FetchWarnReason = "permission" | "fetch_failed";

/** Classify a fetch error into a warning reason. Permission-ish failures
 *  (IAM, disabled API, auth) are separated because "retry later" is the
 *  wrong advice for them — an admin has to grant access. */
export function classifyFetchError(err: unknown): FetchWarnReason {
  const msg = err instanceof Error ? err.message : String(err);
  return /permission|access denied|forbidden|unauthorized|unauthenticated|\b40[13]\b|has not been enabled|api .*disabled/i.test(
    msg,
  )
    ? "permission"
    : "fetch_failed";
}

/** Prefix a warning message with its machine-readable reason tag. */
export function tagWarning(reason: FetchWarnReason, message: string): string {
  return `[${reason}] ${message}`;
}

/** True when any warning in the list carries the given reason tag. */
export function hasWarnReason(warnings: string[], reason: FetchWarnReason): boolean {
  return warnings.some((w) => w.includes(`[${reason}]`));
}
