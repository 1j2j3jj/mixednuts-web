"use client";

import * as Popover from "@radix-ui/react-popover";

interface Props {
  label: string;
  children: React.ReactNode;
}

export default function KpiInfoPopover({ label, children }: Props) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
          aria-label={`${label}の定義を表示`}
        >
          ⓘ
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-50 max-w-80 rounded-md border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-md"
        >
          {children}
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
