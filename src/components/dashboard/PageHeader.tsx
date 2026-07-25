import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Small uppercase label above the title, e.g. "Overview" / "Ads". */
  kicker: ReactNode;
  /** Main page title, e.g. the resolved period label. */
  title: ReactNode;
  /** Date-range / secondary context line under the title. */
  subtitle?: ReactNode;
  /** Right-aligned controls (source toggle, export, print, refresh, ...). */
  controls?: ReactNode;
  className?: string;
}

/**
 * Shared page-chrome header (C2-a, defect A-3): kicker + title sit on ONE
 * line instead of two stacked blocks, with the date-range/context line
 * directly under at a smaller size — was 3 separately-margined lines
 * (16px kicker / 32px title / 20px date line, ~72px total before the
 * controls row even entered the height calc). This is a straight layout
 * compression, not a content cut: every piece of information the 5
 * duplicated per-page header blocks used to render (kicker, title, date
 * range, controls) is still here, just not each on its own line.
 *
 * Previously this exact block (`<div className="flex flex-wrap items-end
 * justify-between gap-4">...`) was copy-pasted verbatim across all 5 tab
 * page.tsx files (Overview/ads/drill/report/insights) — centralising it here
 * means a future chrome change is one edit, not five drifting copies.
 */
export default function PageHeader({
  kicker,
  title,
  subtitle,
  controls,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-ink">
            {kicker}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        {subtitle && (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {controls && (
        <div className="flex flex-wrap items-center gap-3">{controls}</div>
      )}
    </div>
  );
}
