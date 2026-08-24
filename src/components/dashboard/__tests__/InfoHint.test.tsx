import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InfoHint, {
  INFO_HINT_CLOSE_DELAY_MS,
  INFO_HINT_OPEN_DELAY_MS,
  reduceInfoHintState,
} from "@/components/dashboard/InfoHint";

describe("InfoHint", () => {
  it("keeps hover intent and click pinning as separate states", () => {
    const closed = { open: false, pinned: false };
    const hovered = reduceInfoHintState(closed, { type: "hover-open" });
    expect(hovered).toEqual({ open: true, pinned: false });
    expect(reduceInfoHintState(hovered, { type: "hover-close" })).toEqual(closed);

    const pinned = reduceInfoHintState(hovered, { type: "toggle-pin" });
    expect(pinned).toEqual({ open: true, pinned: true });
    expect(reduceInfoHintState(pinned, { type: "hover-close" })).toEqual(pinned);
    expect(reduceInfoHintState(pinned, { type: "toggle-pin" })).toEqual(closed);
    expect(reduceInfoHintState(pinned, { type: "dismiss" })).toEqual(closed);
  });

  it("fixes the hover delays and accessible trigger contract", () => {
    expect(INFO_HINT_OPEN_DELAY_MS).toBe(120);
    expect(INFO_HINT_CLOSE_DELAY_MS).toBe(200);

    const html = renderToStaticMarkup(
      <InfoHint label="売上">集計方法の説明</InfoHint>,
    );
    expect(html).toContain('aria-label="売上の説明を表示"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
    expect(html).toContain("h-3.5 w-3.5");
    expect(html).toContain("p-[15px]");
    expect(html).toContain("info-hint__print-note");
  });

  it("retains keyboard, fine-pointer, reduced-motion, and print safeguards", () => {
    const component = readFileSync(
      "src/components/dashboard/InfoHint.tsx",
      "utf8",
    );
    const css = readFileSync("src/app/globals.css", "utf8");

    // Vitest runs in node without jsdom. Native button Enter/Space activation,
    // pointer media-query evaluation, focus restoration, and print rendering
    // require a real browser; these assertions lock the browser-facing hooks
    // and the preview harness provides the visual/interaction check.
    expect(component).toContain('(hover: hover) and (pointer: fine)');
    expect(component).toContain('role="note"');
    expect(component).not.toContain('role="dialog"');
    expect(component).toContain("onEscapeKeyDown");
    expect(component).toContain("triggerRef.current?.focus()");
    expect(component).toContain("onPointerEnter={keepOpen}");
    expect(component).toContain("onPointerLeave={scheduleClose}");
    expect(component).not.toContain("focus-visible:outline-none");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.info-hint__content\s*\{\s*transition: none;/);
    expect(css).toMatch(/@media print[\s\S]*\.info-hint__trigger/);
    expect(css).toMatch(/@media print[\s\S]*\.info-hint__print-note/);
  });
});
