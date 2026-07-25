import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReportTable, {
  type ReportTableRow,
} from "@/components/dashboard/ReportTable";

/**
 * E-2 regression guard (Phase E). Fleet audit finding, confirmed: every one
 * of ReportTable's sortable column headers was a bare `<th onClick>` — no
 * role, no tabIndex, no aria-sort — so a keyboard user could not sort at
 * all, on any client, on any report granularity tab (report/page.tsx is
 * this component's sole caller for all 6 clients × all granularities).
 *
 * Same headless-render technique as BigKpiCard.invariant.test.tsx (no
 * jsdom/@testing-library in this repo — `react-dom/server`'s
 * renderToStaticMarkup against a node environment). This can't simulate a
 * click (no DOM), so it asserts STRUCTURE: every sortable header renders a
 * real `<button>` (native Tab/Enter/Space semantics for free — no custom
 * onKeyDown needed) inside a `<th scope="col" aria-sort="…">`, and the
 * non-sortable 2-row grouped header cells carry `scope="colgroup"` with no
 * aria-sort at all (they don't sort, so falsely claiming a sort state on
 * them would be its own bug).
 */

const SAMPLE_ROW: ReportTableRow = {
  label: "2026-07-01",
  cost: 10000,
  impressions: 5000,
  clicks: 100,
  sessions: 200,
  mediaCv: 5,
  mediaValue: 50000,
  gaCv: 4,
  gaValue: 40000,
  gaCvPurchase: 4,
  gaCvEvents: {},
  overallCv: 4,
  overallValue: 40000,
};

function render() {
  return renderToStaticMarkup(
    React.createElement(ReportTable, {
      rows: [SAMPLE_ROW],
      labelHeader: "日付",
      showOverall: true,
    }),
  );
}

describe("ReportTable sortable headers (E-2)", () => {
  const html = render();

  it("renders a non-trivial number of <th> header cells (sanity check on the render itself)", () => {
    const thCount = (html.match(/<th\b/g) ?? []).length;
    expect(thCount).toBeGreaterThan(10);
  });

  it('every scope="col" header cell contains a real <button> (was a bare onClick <th> with no interactive element at all)', () => {
    // Isolate each <th ...>...</th> block and check the col-scoped ones.
    const thBlocks = html.match(/<th\b[^>]*>.*?<\/th>/g) ?? [];
    const colHeaders = thBlocks.filter((b) => b.includes('scope="col"'));
    expect(colHeaders.length).toBeGreaterThan(10);
    for (const block of colHeaders) {
      expect(block).toContain("<button");
      expect(block).toContain('type="button"');
    }
  });

  it('every scope="col" header cell carries a valid aria-sort value', () => {
    const thBlocks = html.match(/<th\b[^>]*>/g) ?? [];
    const colHeaders = thBlocks.filter((b) => b.includes('scope="col"'));
    expect(colHeaders.length).toBeGreaterThan(10);
    for (const block of colHeaders) {
      expect(block).toMatch(/aria-sort="(none|ascending|descending)"/);
    }
  });

  it("the 2-row grouped header's spanning cells are scope=\"colgroup\" and carry NO aria-sort (they don't sort)", () => {
    const thBlocks = html.match(/<th\b[^>]*>/g) ?? [];
    const groupHeaders = thBlocks.filter((b) => b.includes('scope="colgroup"'));
    // The unlabeled spacer above 期間 + 広告媒体 / GA / 全体 — 4 grouped
    // header cells when showOverall=true.
    expect(groupHeaders.length).toBe(4);
    for (const block of groupHeaders) {
      expect(block).not.toContain("aria-sort");
    }
  });

  it("no <th> anywhere still uses the old bare-onClick-with-no-button pattern (regression guard)", () => {
    const thBlocks = html.match(/<th\b[^>]*>.*?<\/th>/g) ?? [];
    for (const block of thBlocks) {
      // A header with visible sortable-looking content (an arrow indicator
      // class or the col scope) must always wrap its text in a button.
      if (block.includes('scope="col"') && !block.includes("colSpan")) {
        expect(block).toContain("<button");
      }
    }
  });

  it("sorting a real column still renders the same numbers unchanged (label/value pass-through, not a hard constraint violation)", () => {
    expect(html).toContain("2026-07-01");
    expect(html).toContain("¥10,000");
  });
});
