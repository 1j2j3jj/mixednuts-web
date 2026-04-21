/**
 * Stateless analysis helpers used across screens. No I/O.
 */

export interface PacingResult {
  /** Share of the month elapsed, 0..1 based on day-of-month / days-in-month. */
  monthProgress: number;
  /** Share of the budget consumed (actual / budget). */
  spendProgress: number;
  /** spendProgress / monthProgress — 1.0 means on pace, 1.2 = 20% over pace. */
  paceRatio: number;
  /** "onpace" | "over" | "under" — over/under thresholds at ±10% default. */
  status: "onpace" | "over" | "under" | "critical-over" | "critical-under";
  /** Human-readable message, in ja-JP. */
  message: string;
}

/**
 * Budget-pacing heuristic used on the Overview screen. The status thresholds
 * are intentionally conservative (±10% amber, ±20% red) — follows the
 * Sprinklr default from the content research. Consumers decide which colour
 * to render; the helper only classifies.
 */
export function analysePacing(
  actualSpend: number,
  monthlyBudget: number,
  today: Date = new Date()
): PacingResult | null {
  if (monthlyBudget <= 0) return null;
  const dayOfMonth = today.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const monthProgress = dayOfMonth / daysInMonth;
  const spendProgress = actualSpend / monthlyBudget;
  const paceRatio = monthProgress > 0 ? spendProgress / monthProgress : 0;

  let status: PacingResult["status"];
  if (paceRatio > 1.2) status = "critical-over";
  else if (paceRatio > 1.1) status = "over";
  else if (paceRatio < 0.8) status = "critical-under";
  else if (paceRatio < 0.9) status = "under";
  else status = "onpace";

  const pctOff = Math.round((paceRatio - 1) * 100);
  const message =
    status === "onpace"
      ? "予算消化ペースは想定どおり"
      : status === "over"
      ? `予定より ${pctOff}% 早いペース（注意）`
      : status === "critical-over"
      ? `予定より ${pctOff}% 早いペース（超過リスク）`
      : status === "under"
      ? `予定より ${Math.abs(pctOff)}% 遅いペース（注意）`
      : `予定より ${Math.abs(pctOff)}% 遅いペース（消化未達リスク）`;

  return { monthProgress, spendProgress, paceRatio, status, message };
}

/** Z-score based anomaly classifier. Returns a flag per series point.
 *  Values outside ±sigmaThreshold are marked. */
export function detectAnomalies(
  values: number[],
  sigmaThreshold = 2
): Array<"normal" | "high" | "low"> {
  const n = values.length;
  if (n < 3) return values.map(() => "normal");
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (sd === 0) return values.map(() => "normal");
  return values.map((v) => {
    const z = (v - mean) / sd;
    if (z > sigmaThreshold) return "high";
    if (z < -sigmaThreshold) return "low";
    return "normal";
  });
}

/** Trim an array to the last N elements (for sparkline windows). */
export function lastN<T>(xs: T[], n: number): T[] {
  return xs.slice(Math.max(0, xs.length - n));
}
