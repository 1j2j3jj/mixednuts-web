import { Check, TriangleAlert, X } from "lucide-react";
import type { Tier } from "@/lib/tier";
import { cn } from "@/lib/utils";

const ICON: Record<Tier, typeof Check> = {
  good: Check,
  warning: TriangleAlert,
  bad: X,
};

interface Props {
  tier: Tier;
  className?: string;
}

/**
 * Non-colour carrier for a good/warning/bad judgement (E-3, SC 1.4.1).
 * Deliberately THREE VISUALLY DISTINCT SHAPES (check / triangle / X), not
 * three colour-tinted copies of one glyph — so the distinction survives even
 * without colour perception at all. Inherits `currentColor` (no colour class
 * of its own) so it always matches whatever text colour the caller already
 * applies (e.g. text-emerald-700 / text-amber-700 / text-rose-700) — colour
 * stays, this only ADDS the second channel, per the task's explicit "never
 * remove the colour" rule.
 *
 * Sized at 10px (h-2.5 w-2.5) — MediaTable/DrillTable/MediaCampaignTable are
 * already dense (11-13 columns) at the 375px viewport the hard constraints
 * require staying inside; a larger glyph or a text word risks the horizontal
 * -overflow regression those constraints forbid (see the E-3 audit's risk
 * note). `aria-hidden` because the tier is already conveyed in text via the
 * adjacent formatted number/colour — this is a supplementary visual marker,
 * not new accessible-name content (screen reader users already get the
 * number; this glyph is for sighted colour-blind users).
 */
export default function TierGlyph({ tier, className }: Props) {
  const Icon = ICON[tier];
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 align-[-1px]",
        className,
      )}
    />
  );
}
