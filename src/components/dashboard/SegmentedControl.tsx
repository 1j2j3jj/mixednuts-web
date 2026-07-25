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
                : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground",
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
