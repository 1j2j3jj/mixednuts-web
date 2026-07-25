/**
 * Pure helpers for C2-d card-level status chips (spec §2.2: a small chip
 * stating a defensible one-line judgement, e.g. amber "-4% vs plan"). No
 * I/O. StatusChip.tsx renders the tone; callers decide whether a chip is
 * shown at all — the "no judgement" case (missing/zero denominator, no
 * target configured) must render NO chip, not a neutral placeholder (spec:
 * "a chip that is always neutral is noise").
 */

export type ChipTone = "positive" | "warning" | "negative";

/**
 * 3-tier tone from a ratio-to-target — mirrors the exact thresholds already
 * used per-cell in ChannelTargetTable's `achievementColour` (>=1 positive,
 * >=0.8 warning, below negative). Returns null when the ratio itself isn't
 * computable (missing/zero target) — callers must render no chip then, not
 * fall back to a 0%/negative reading that would misrepresent "no target
 * configured" as "badly missed the target".
 */
export function achievementTone(ratio: number | null): ChipTone | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  if (ratio >= 1) return "positive";
  if (ratio >= 0.8) return "warning";
  return "negative";
}

export interface AchievementRow {
  actual: number;
  /** null = no target configured for this row (excluded from the target sum,
   *  not treated as a target of 0). */
  target: number | null;
}

export interface AchievementTotals {
  actual: number;
  target: number;
  /** null when no row in the set carries a configured target, or the
   *  summed target is 0 — both mean "achievement rate is not a meaningful
   *  number here", not "0% achieved". */
  ratio: number | null;
}

/** Sums actual/target across rows and derives the ratio once, so a
 *  card-level chip reuses the identical rows/thresholds the table below it
 *  already renders per-cell instead of re-deriving its own judgement. */
export function sumAchievement(rows: AchievementRow[]): AchievementTotals {
  let actual = 0;
  let target = 0;
  let hasTarget = false;
  for (const r of rows) {
    actual += r.actual;
    if (r.target != null) {
      target += r.target;
      hasTarget = true;
    }
  }
  const ratio = hasTarget && target > 0 ? actual / target : null;
  return { actual, target, ratio };
}

/**
 * Same 3-tier cutoff as the per-cell ROAS colour-coding in
 * MediaTable/MediaCampaignTable's `roasClass` (actual>=target /
 * actual>=target*0.8 / below) — exposed here so a card-level "win rate"
 * chip reuses the identical judgement instead of inventing a new one.
 */
export function meetsRoasTarget(
  actualPct: number | null,
  targetPct: number | null,
): boolean {
  if (actualPct == null || !Number.isFinite(actualPct)) return false;
  if (targetPct == null || targetPct <= 0) return false;
  return actualPct >= targetPct;
}

/** Share of rows meeting-or-exceeding target, e.g. "9/12 媒体 (75%) hit the
 *  target ROAS". null when there's nothing to divide by (no rows, or — by
 *  construction of the caller — no target configured at all), so the chip
 *  omits itself rather than showing a false 0%. */
export function computeWinRate(hits: number, total: number): number | null {
  if (total <= 0) return null;
  if (hits < 0 || hits > total) return null;
  return hits / total;
}

/**
 * Win-rate tone uses different cutoffs from achievementTone on purpose: a
 * win rate is a PROPORTION OF ROWS clearing the bar, not a ratio-to-target,
 * so "most rows are winning" (>=70%) reads as positive, a roughly-even split
 * (>=40%) as mixed/warning, and a minority-winning set as negative.
 */
export function winRateTone(rate: number | null): ChipTone | null {
  if (rate == null || !Number.isFinite(rate)) return null;
  if (rate >= 0.7) return "positive";
  if (rate >= 0.4) return "warning";
  return "negative";
}
