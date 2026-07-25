"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
  inactiveClassName?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  shape?: "rounded" | "pill";
  className?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  size = "sm",
  shape = "rounded",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border bg-muted p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "border-[1.5px] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              size === "sm" ? "h-6 px-3" : "h-8 px-3",
              // 2-value radius system (Phase B, 2026-07-24 audit A-8): this used
              // to be the untokenized bare Tailwind `rounded` (4px, half the
              // track's own 8px), unrelated to the --radius scale. rounded-md
              // is the same 8px control token the track itself uses.
              shape === "pill" ? "rounded-full" : "rounded-md",
              selected
                ? "border-brand-ink bg-brand/14 text-brand-deep"
                : // ITEM 1 fix (2026-07-25 Phase E audit): text-muted-foreground
                  // against this control's own bg-muted backdrop (not white)
                  // measured 4.35:1 — under the 4.5:1 small-text floor.
                  // --control-idle-foreground (globals.css) is a
                  // control-specific token, not a darkening of the shared
                  // --muted-foreground: every other dashboard call site of
                  // that token (~60, grepped and individually checked) sits
                  // on white/background or a translucent `bg-muted/NN`
                  // tint, never this control's OPAQUE bg-muted — darkening
                  // the shared token would have touched all of them for no
                  // benefit. One other opaque bg-muted + text-muted-foreground
                  // pairing exists (MediaTable.tsx / MediaCampaignTable.tsx's
                  // unmapped-media-channel fallback badge) but that's a
                  // different component, out of this audit's scope — see
                  // handoff report. The new token (oklch(0.52 0 0), a step
                  // darker than neutral-500) reaches 5.04:1 against
                  // bg-muted, verified live.
                  "border-transparent text-control-idle-foreground hover:bg-background hover:text-foreground",
              !selected && option.inactiveClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
