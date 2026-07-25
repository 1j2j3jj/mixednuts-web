import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/chip";

const TONE_CLASS: Record<ChipTone, string> = {
  positive: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  negative: "border-rose-300 bg-rose-50 text-rose-800",
};

interface Props {
  tone: ChipTone;
  children: ReactNode;
  className?: string;
}

/**
 * Card-level status chip (C2-d, spec §2.2): a compact, semantically-coloured
 * pill stating a one-line judgement — "amber '-4% vs plan'" in the spec's own
 * example. Callers decide tone via @/lib/chip's pure helpers and must render
 * NOTHING (not this component with a neutral tone) when no judgement is
 * computable — there is no "neutral" tone on purpose.
 */
export default function StatusChip({ tone, children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
