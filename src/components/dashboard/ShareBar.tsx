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
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
        {pct != null && (
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${pct}%` }}
          />
        )}
      </span>
      <span className="w-9 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
        {pct != null ? `${pct}%` : "—"}
      </span>
    </div>
  );
}
