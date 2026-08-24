"use client";

import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const INFO_HINT_OPEN_DELAY_MS = 120;
export const INFO_HINT_CLOSE_DELAY_MS = 200;

type HintState = { open: boolean; pinned: boolean };
type HintAction =
  | { type: "hover-open" }
  | { type: "hover-close" }
  | { type: "toggle-pin" }
  | { type: "dismiss" };

export function reduceInfoHintState(
  state: HintState,
  action: HintAction,
): HintState {
  switch (action.type) {
    case "hover-open":
      return state.pinned ? state : { open: true, pinned: false };
    case "hover-close":
      return state.pinned ? state : { open: false, pinned: false };
    case "toggle-pin":
      return state.pinned
        ? { open: false, pinned: false }
        : { open: true, pinned: true };
    case "dismiss":
      return { open: false, pinned: false };
  }
}

interface Props {
  label: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
}

function supportsFineHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function InfoHint({ label, children, align = "start" }: Props) {
  const [state, dispatch] = useReducer(reduceInfoHintState, {
    open: false,
    pinned: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentId = useId();
  /**
   * Radix portals to document.body by default, which is OUTSIDE the
   * `.dashboard-scope` wrapper that declares every dashboard token
   * (--popover, --border, --muted-foreground, the font stack). Portalled
   * content therefore inherited the marketing site's body colour and drew a
   * near-black 1px border instead of the muted one every card uses - the
   * measured value was the marketing site's body colour, not --border at
   * all. (Written out rather than quoted, because design-guards' colour
   * literal detector scans comments too, by design.) Portalling into the
   * scope element restores normal inheritance rather than re-declaring the
   * tokens on the popover itself.
   */
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  useEffect(() => {
    setPortalContainer(
      document.querySelector<HTMLElement>(".dashboard-scope"),
    );
  }, []);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const scheduleOpen = () => {
    if (!supportsFineHover()) return;
    clearTimers();
    openTimer.current = setTimeout(() => {
      dispatch({ type: "hover-open" });
    }, INFO_HINT_OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    if (!supportsFineHover() || state.pinned) return;
    clearTimers();
    closeTimer.current = setTimeout(() => {
      dispatch({ type: "hover-close" });
    }, INFO_HINT_CLOSE_DELAY_MS);
  };

  const keepOpen = () => {
    if (!supportsFineHover()) return;
    clearTimers();
  };

  const dismiss = () => {
    clearTimers();
    dispatch({ type: "dismiss" });
  };

  return (
    <Popover.Root open={state.open} onOpenChange={(open) => !open && dismiss()}>
      <span className="info-hint inline-flex shrink-0 align-middle">
        <Popover.Anchor asChild>
          <button
            ref={triggerRef}
            type="button"
            className="info-hint__trigger group -m-[15px] inline-flex shrink-0 items-center justify-center rounded-full p-[15px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`${label}の説明を表示`}
            aria-controls={contentId}
            aria-expanded={state.open}
            onClick={() => {
              clearTimers();
              dispatch({ type: "toggle-pin" });
            }}
            onPointerEnter={scheduleOpen}
            onPointerLeave={scheduleClose}
          >
            {/* The 44x44 target is padding (ui-design-baseline A, mouse
                minimum); the hover tint belongs to the glyph, not to the
                whole target, or a 14px icon lights up a 44px grey disc. */}
            <span className="flex h-6 w-6 items-center justify-center rounded-full transition-colors group-hover:bg-muted">
              <Info aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          </button>
        </Popover.Anchor>
        <span className="info-hint__print-note">
          ※ {label}: {children}
        </span>
      </span>
      <Popover.Portal container={portalContainer ?? undefined}>
        <Popover.Content
          forceMount
          id={contentId}
          role="note"
          sideOffset={4}
          align={align}
          className="info-hint__content z-50 max-w-80 rounded-md border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-md"
          onPointerEnter={keepOpen}
          onPointerLeave={scheduleClose}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            dismiss();
            requestAnimationFrame(() => triggerRef.current?.focus());
          }}
        >
          {children}
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
