/**
 * Shared 3-tier good/warning/bad classification (E-3, Phase E — WCAG 1.4.1
 * colour-only-encoding fix). Several tables independently hand-rolled the
 * exact same threshold logic to decide a Tailwind text colour class
 * (MediaTable.roasClass / MediaCampaignTable.roasClass / DrillTable.roasClass
 * + DrillTable.cpaClass / ChannelTargetTable.achievementColour) — the colour
 * was the ONLY signal a viewer got for "hit / near-miss / missed target",
 * which fails SC 1.4.1 for anyone who can't distinguish the hues. This module
 * is the single source of truth for the THRESHOLD (>=target / >=80% of
 * target for higher-is-better; <=target / <=120% of target for
 * lower-is-better, e.g. CPA) so a caller can render both the existing colour
 * AND a non-colour carrier (see TierGlyph.tsx) from one shared judgement
 * instead of four call sites drifting apart.
 *
 * Pure, no I/O — mirrors the exact cutoffs already in use (verified against
 * MediaTable.roasClass / DrillTable.cpaClass / ChannelTargetTable.
 * achievementColour before this module existed), so adopting it does not
 * change any threshold or rendered number, only where the logic lives.
 */

export type Tier = "good" | "warning" | "bad";

/** Higher-is-better tiering (ROAS / achievement-rate style):
 *  actual >= target -> good, actual >= 80% of target -> warning, else bad.
 *  null when there is no meaningful judgement to make (missing actual, or no
 *  target configured) — callers must render neither colour nor glyph then. */
export function higherIsBetterTier(
  actual: number | null,
  target: number | null,
): Tier | null {
  if (actual == null || !Number.isFinite(actual)) return null;
  if (target == null || target <= 0) return null;
  if (actual >= target) return "good";
  if (actual >= target * 0.8) return "warning";
  return "bad";
}

/** Lower-is-better tiering (CPA style):
 *  actual <= target -> good, actual <= 120% of target -> warning, else bad. */
export function lowerIsBetterTier(
  actual: number | null,
  target: number | null,
): Tier | null {
  if (actual == null || !Number.isFinite(actual)) return null;
  if (target == null || target <= 0) return null;
  if (actual <= target) return "good";
  if (actual <= target * 1.2) return "warning";
  return "bad";
}
