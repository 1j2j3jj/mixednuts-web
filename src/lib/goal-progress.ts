import type { Tier } from "@/lib/tier";

/**
 * Monthly-target pace judgement.
 *
 * Ongoing months deliberately use the data window's elapsed share rather
 * than 100% as the comparison point. A result more than 10% ahead of that
 * expected share is a clear pass, results down to 80% of expected are the
 * attention band, and anything below that is materially behind. Completed
 * months keep the historical >=100% / >=80% achievement thresholds.
 */
export function goalProgressTier(
  achievementRatio: number | null,
  expectedProgress: number,
): Tier | null {
  if (achievementRatio == null || !Number.isFinite(achievementRatio)) {
    return null;
  }
  if (!Number.isFinite(expectedProgress) || expectedProgress <= 0) return null;

  if (expectedProgress >= 1) {
    if (achievementRatio >= 1) return "good";
    if (achievementRatio >= 0.8) return "warning";
    return "bad";
  }

  if (achievementRatio > expectedProgress * 1.1) return "good";
  if (achievementRatio >= expectedProgress * 0.8) return "warning";
  return "bad";
}

/** Budget consumption is not an achievement metric: both materially fast
 * and materially slow spend require attention, while the centre band is the
 * desired state. The boundaries mirror analysePacing's ±10%/±20% policy. */
export function budgetProgressTier(
  spendRatio: number,
  expectedProgress: number,
): Tier {
  const paceRatio = expectedProgress > 0 ? spendRatio / expectedProgress : 0;
  if (paceRatio >= 0.9 && paceRatio <= 1.1) return "good";
  if (paceRatio >= 0.8 && paceRatio <= 1.2) return "warning";
  return "bad";
}

export function monthProgressFromIsoDate(isoDate: string): number {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return date.getUTCDate() / daysInMonth;
}
