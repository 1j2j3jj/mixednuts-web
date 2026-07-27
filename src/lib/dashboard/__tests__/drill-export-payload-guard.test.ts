import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Regression guard for the G-3 payload fix (2026-07-26 — Phase A defect
 * ledger + phase brief measurement pass: drill tab measured up to 19.9MB
 * HTML at deep filters, ~59-61% of it the inline RSC hydration payload,
 * traced to the full aggregated row set being duplicated into
 * CsvExportButton's `rows` prop — a client component, so React must
 * serialize that entire array into the flight payload just to hydrate the
 * button).
 *
 * This is a source-text guard (same style as
 * src/lib/sources/__tests__/mock-leak-guard.test.ts) rather than a runtime
 * render test of the full page — rendering drill/page.tsx needs live
 * BigQuery/GA4/Sheets access. The functional contract (the export route
 * computes the identical `table` via the identical shared functions) is
 * covered by drill-shared.test.ts; CsvExportButton's href-vs-rows
 * behaviour is covered by CsvExportButton.render.test.tsx. This test
 * additionally guarantees the specific defect pattern — an unbounded row
 * array reaching a client-component prop on the drill page — cannot
 * silently reappear.
 */

function readSrc(relPath: string): string {
  const url = new URL(`../../../${relPath}`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

describe("G-3 payload guard — drill's full row set must never reach a client-component prop again", () => {
  const drillPage = readSrc("app/(dashboard)/dashboard/[slug]/drill/page.tsx");

  it("drill/page.tsx passes CsvExportButton an href (server export), not a rows prop built from `table`", () => {
    expect(drillPage).toContain("href={exportHref}");
    // Isolate just the <CsvExportButton .../> tag (it's self-closing) so
    // this doesn't false-positive on DrillTable's unrelated `rows={table}`
    // prop later in the same file.
    const tagMatch = drillPage.match(/<CsvExportButton[^]*?\/>/);
    expect(tagMatch).not.toBeNull();
    const tag = tagMatch?.[0] ?? "";
    expect(tag).not.toMatch(/\brows=\{/);
  });

  it("drill/page.tsx no longer builds a csvRows/csvHeaders array from the full aggregated table", () => {
    expect(drillPage).not.toMatch(/const\s+csvRows\s*=\s*table\.map/);
  });

  it("the export route exists and is wired through the shared aggregation functions (not a re-implemented, potentially-divergent copy)", () => {
    const exportRoute = readSrc(
      "app/(dashboard)/dashboard/[slug]/drill/export/route.ts",
    );
    for (const fn of [
      "resolveDrillScope",
      "buildJoin",
      "aggregateDrillRows",
      "buildDrillCsvRows",
      "buildDrillCsvHeaders",
    ]) {
      expect(exportRoute).toContain(fn);
    }
    // Must not define its own aggregation logic (e.g. a second `function
    // aggregate(` / inline Map-building loop) — that would reintroduce the
    // drift risk the shared module exists to prevent.
    expect(exportRoute).not.toMatch(/function aggregate/);
  });

  it('DrillTable remains a Server Component (no "use client") — its on-screen rendering was never the source of the duplication, and must stay that way', () => {
    const drillTable = readSrc("components/dashboard/DrillTable.tsx");
    expect(drillTable.slice(0, 200)).not.toContain('"use client"');
  });

  it("CsvExportButton's href branch is reachable before any rows-dependent code runs (rows access is unconditionally after the href early-return)", () => {
    const btn = readSrc("components/dashboard/CsvExportButton.tsx");
    const hrefBranchIdx = btn.indexOf("if (href)");
    const rowsAccessIdx = btn.indexOf("const dataRows = rows");
    expect(hrefBranchIdx).toBeGreaterThan(-1);
    expect(rowsAccessIdx).toBeGreaterThan(-1);
    expect(hrefBranchIdx).toBeLessThan(rowsAccessIdx);
  });
});
