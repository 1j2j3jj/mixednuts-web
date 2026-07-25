"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Leading icon (lucide component instance), e.g. <CalendarRange />. */
  icon?: ReactNode;
  wrapperClassName?: string;
}

/**
 * Native <select>, restyled to the outline-button trigger face (C2-e,
 * defects A-5/A-25): same className family as PrintButton/RefreshButton
 * (`buttonVariants({variant:"outline", size:"sm"})`) with a leading icon and
 * a trailing chevron, so the period/compare pickers stop colliding with the
 * PDF/更新 buttons as a visibly different control idiom in the same row.
 *
 * Stays a real <select> on purpose — full native keyboard operability
 * (arrow keys, type-ahead, screen readers) for free, no Radix/cmdk needed
 * for a plain enumerable list. Only the paint changes: appearance-none
 * strips the UA chrome, the icon/chevron are absolutely-positioned
 * decoration with pointer-events-none so clicks still land on the select.
 */
export default function ControlSelect({
  icon,
  wrapperClassName,
  className,
  children,
  ...props
}: Props) {
  return (
    <span className={cn("relative inline-flex items-center", wrapperClassName)}>
      {icon && (
        <span
          className="pointer-events-none absolute left-2.5 flex h-4 w-4 items-center justify-center text-muted-foreground [&_svg]:h-4 [&_svg]:w-4"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <select
        {...props}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer appearance-none justify-start font-normal",
          icon ? "pl-8" : "pl-3",
          "pr-7",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}
