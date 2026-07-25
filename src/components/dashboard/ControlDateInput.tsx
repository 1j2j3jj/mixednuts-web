"use client";

import type { InputHTMLAttributes } from "react";
import { Calendar } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement>;

/**
 * Native <input type="date">, restyled to the same outline-button trigger
 * face as ControlSelect (C2-e, defects A-5/A-25) — border/radius/height
 * match PrintButton/RefreshButton, with a leading calendar icon. Kept as a
 * real date input on purpose: the browser's native date-picking UX (and its
 * accessibility) for free, no new dependency (react-day-picker isn't
 * installed) for what the brief scopes as "replace the control CHROME", not
 * the underlying widget.
 */
export default function ControlDateInput({ className, ...props }: Props) {
  return (
    <span className="relative inline-flex items-center">
      <span
        className="pointer-events-none absolute left-2.5 flex h-4 w-4 items-center justify-center text-muted-foreground [&_svg]:h-4 [&_svg]:w-4"
        aria-hidden="true"
      >
        <Calendar />
      </span>
      <input
        type="date"
        {...props}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "justify-start pl-8 pr-2 font-normal tabular-nums",
          className,
        )}
      />
    </span>
  );
}
