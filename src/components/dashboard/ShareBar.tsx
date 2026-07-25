import { cn } from "@/lib/utils";
import { shareToPercent } from "@/lib/share";

interface Props {
  /** 0..1 ratio, or null when the denominator is missing/zero (see
   *  computeShare in @/lib/share) — renders an empty track + em-dash, never
   *  0% or NaN. */
  ratio: number | null;
  className?: string;
}

/**
 * Inline table-cell "share of total" indicator (C2-b): a rounded track with
 * an accent fill, and the rounded percentage right-aligned beside it — same
 * visual language as DeviceBar's per-row bars, compacted to fit a table row.
 */
export default function ShareBar({ ratio, className }: Props) {
  const pct = shareToPercent(ratio);
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      {/* E-4: the bar encodes a percentage graphically with no ARIA value —
          a screen reader landing on this element got nothing. The adjacent
          text span already carries the value visually; role="progressbar"
          + aria-valuenow/min/max exposes the same number to assistive tech
          even if this element is queried on its own. */}
      <span
        role="progressbar"
        aria-label="構成比"
        aria-valuenow={pct ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={pct != null ? `${pct}%` : "データなし"}
        className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted"
      >
        {pct != null && (
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${pct}%` }}
          />
        )}
      </span>
      <span
        aria-hidden="true"
        className="w-9 shrink-0 text-right tabular-nums text-xs text-muted-foreground"
      >
        {pct != null ? `${pct}%` : "—"}
      </span>
    </div>
  );
}
