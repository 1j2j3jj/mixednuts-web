import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Regression guard for the Phase D mock-leak fix (WORKTREE ledger
 * "mockLeaks" — CONFIRMED live cross-client brand leakage: client `hs`'s
 * real brand name "販促スタイル" and real product taxonomy were rendering
 * inside chakin/msec/dōzo's authenticated dashboards via a shared
 * `mockQueries()`/`mockProducts()`/`mockLandingPages()` fallback).
 *
 * This is a source-text guard rather than a runtime test of
 * getTopGscQueries/getTopProducts directly — those fetchers call the real
 * Google APIs and would need heavy auth/network mocking to exercise their
 * catch branches. The actual behavioural contract (never substitute
 * fabricated content) is covered functionally by
 * AbsenceStates.render.test.tsx, which proves the UI renders the shared
 * absence copy — never invented rows — when a source returns empty. This
 * test additionally guarantees the leaking dataset itself cannot silently
 * reappear in the source, even in dead code nobody calls.
 */

function readSrc(relPath: string): string {
  const url = new URL(`../../../${relPath}`, import.meta.url);
  return readFileSync(fileURLToPath(url), "utf8");
}

describe("mock-leak guard — the fabricated dataset must not exist in source", () => {
  it("gsc.ts no longer contains client hs's real brand name or invented query rows", () => {
    const src = readSrc("lib/sources/gsc.ts");
    expect(src).not.toContain("販促スタイル");
    expect(src).not.toMatch(/function mockQueries/);
  });

  it("ga4.ts no longer contains the fabricated promotional-goods product/landing-page catalogue", () => {
    const src = readSrc("lib/sources/ga4.ts");
    expect(src).not.toContain("防災7点セット");
    expect(src).not.toContain("category/tumbler");
    expect(src).not.toMatch(/function mockProducts/);
    expect(src).not.toMatch(/function mockLandingPages/);
  });

  it("sheets.ts's mock ad-row template carries no real client campaign/product vocabulary", () => {
    // Same leak class as gsc.ts, found by Fable during Phase D review: the
    // sheet-fetch fallback template hardcoded client hs's real ad-group name
    // ("01_Google検索_指名_単体_販促スタイル") and hs's product vocabulary
    // ("ノベルティ"), so any OTHER client whose sheet fetch failed would see
    // hs's campaign structure inside their own dashboard. Media names
    // (Google/Yahoo/Microsoft) are platform names, not client identifiers, so
    // they stay; only client-identifying nouns are forbidden here.
    const src = readSrc("lib/sheets.ts");
    expect(src).not.toContain("販促スタイル");
    expect(src).not.toContain("ノベルティ");
  });

  it("getTopGscQueries / getTopProducts / getTopLandingPages no longer call a mock substitute on a real-but-empty result", () => {
    const gsc = readSrc("lib/sources/gsc.ts");
    const ga4 = readSrc("lib/sources/ga4.ts");
    // The old defect pattern: `rows.length > 0 ? real : mock`.
    expect(gsc).not.toMatch(/rows\.length > 0\s*\?/);
    expect(ga4).not.toMatch(/result\.rows\.length > 0\s*\?/);
  });
});
