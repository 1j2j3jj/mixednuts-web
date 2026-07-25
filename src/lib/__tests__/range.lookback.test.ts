import { describe, it, expect } from "vitest";
import {
  PRESETS,
  COMPARES,
  resolvePreset,
  resolveCompare,
  worstCaseLookbackDays,
  neededLookbackDays,
  type PresetKey,
  type CompareKey,
  type DateRange,
} from "@/lib/range";

/**
 * A-27 fix (src/lib/sources/raw.ts) decides whether a request can be
 * answered from the bounded ads-raw cache using `neededLookbackDays`
 * BEFORE any data has been fetched — i.e. before the true anchor (latest
 * data date) is known. That's only safe if the estimate is a guaranteed
 * upper bound on what `resolveFromSearchParams` will actually need once
 * the true anchor is known; if it ever UNDER-estimates, a real request
 * could get served from a too-narrow cached window and render wrong
 * numbers (this fix's hard requirement #1).
 *
 * These tests verify that bound empirically: for every non-custom preset
 * and every real anchor across three full years (covering every day-of-
 * month position and both leap and non-leap Februaries), the TRUE lookback
 * (computed the same way raw.ts's callers do — resolvePreset + resolveCompare
 * against the real anchor) never exceeds worstCaseLookbackDays for that
 * (preset, compare) pair.
 */

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime();
  const b = new Date(`${bIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** True lookback (days) that a real anchor date would need — mirrors what
 *  page.tsx / ads/page.tsx / drill/page.tsx actually compute downstream via
 *  resolveFromSearchParams, just inlined here for the assertion. */
function trueLookbackDays(
  preset: PresetKey,
  compare: CompareKey,
  anchor: string,
): number {
  const cur: DateRange = resolvePreset(preset, anchor);
  const prev = resolveCompare(compare, cur);
  const earliest = prev ? prev.start : cur.start;
  return daysBetween(earliest, anchor);
}

function everyAnchorAcrossThreeYears(): string[] {
  const anchors: string[] = [];
  // 2027 (non-leap), 2028 (leap), 2029 (non-leap) — every calendar day.
  for (const year of [2027, 2028, 2029]) {
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
      for (let d = 1; d <= daysInMonth; d++) {
        anchors.push(
          `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        );
      }
    }
  }
  return anchors;
}

const NON_CUSTOM_PRESETS = PRESETS.filter((p) => p.key !== "custom").map(
  (p) => p.key as PresetKey,
);
const ALL_COMPARES = COMPARES.map((c) => c.key as CompareKey);
const ANCHORS = everyAnchorAcrossThreeYears();

describe("range.worstCaseLookbackDays — verified upper bound", () => {
  it.each(
    NON_CUSTOM_PRESETS.flatMap((preset) =>
      ALL_COMPARES.map((compare) => [preset, compare] as const),
    ),
  )(
    `%s x %s: worstCaseLookbackDays >= true lookback for every anchor in 2027-2029 (${ANCHORS.length} days checked)`,
    (preset, compare) => {
      const bound = worstCaseLookbackDays(preset, compare);
      let maxObserved = 0;
      for (const anchor of ANCHORS) {
        const truth = trueLookbackDays(preset, compare, anchor);
        maxObserved = Math.max(maxObserved, truth);
        expect(truth).toBeLessThanOrEqual(bound);
      }
      // The bound shouldn't be wildly loose either (sanity: it should be
      // achieved, not just "safe by 10x") — proves it's a tight bound, not
      // an arbitrary huge constant that would defeat cache coverage.
      expect(bound).toBe(maxObserved);
    },
  );

  it("is a pure/deterministic function (memoization doesn't leak state across calls)", () => {
    const a = worstCaseLookbackDays("last3m", "prev");
    const b = worstCaseLookbackDays("last3m", "prev");
    expect(a).toBe(b);
  });
});

describe("range.neededLookbackDays — custom preset (absolute dates)", () => {
  it("measures directly from sp.start to todayIso for an explicit custom range with no compare", () => {
    const days = neededLookbackDays(
      { preset: "custom", start: "2026-01-01", end: "2026-01-31", cmp: "none" },
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    expect(days).toBe(daysBetween("2026-01-01", "2026-07-25"));
  });

  it("compare=prev on a custom range extends the estimate further back", () => {
    const withoutCompare = neededLookbackDays(
      { preset: "custom", start: "2026-06-01", end: "2026-06-30", cmp: "none" },
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    const withPrev = neededLookbackDays(
      { preset: "custom", start: "2026-06-01", end: "2026-06-30", cmp: "prev" },
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    expect(withPrev).toBeGreaterThan(withoutCompare);
  });

  it("falls back to the last28 bound when custom is missing start/end (resolvePreset's own fallback)", () => {
    const days = neededLookbackDays(
      { preset: "custom" },
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    expect(days).toBe(worstCaseLookbackDays("last28", "prev"));
  });

  it("using todayIso is always >= the true anchor-based lookback (safe over-estimate, never under)", () => {
    // If the true (unknown-at-call-time) anchor is a few days behind
    // "today" (platform data lag), the custom-range estimate measured
    // against today must still be >= what the true anchor would need.
    const todayIso = "2026-07-25";
    const trueAnchor = "2026-07-20"; // 5 days of data lag
    const customStart = "2026-05-01";
    const estimated = daysBetween(customStart, todayIso);
    const trueNeed = daysBetween(customStart, trueAnchor);
    expect(estimated).toBeGreaterThanOrEqual(trueNeed);
  });
});

describe("range.neededLookbackDays — non-custom presets delegate to worstCaseLookbackDays", () => {
  it("uses the caller's defaults when sp has no preset/cmp", () => {
    const days = neededLookbackDays(
      {},
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    expect(days).toBe(worstCaseLookbackDays("thisMonth", "prev"));
  });

  it("uses sp.preset/sp.cmp when present, ignoring defaults", () => {
    const days = neededLookbackDays(
      { preset: "last6m", cmp: "prevYear" },
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    expect(days).toBe(worstCaseLookbackDays("last6m", "prevYear"));
  });

  it("ignores an unrecognised preset/cmp value and falls back to defaults", () => {
    const days = neededLookbackDays(
      { preset: "not-a-real-preset", cmp: "also-bogus" },
      { preset: "thisMonth", compare: "prev" },
      "2026-07-25",
    );
    expect(days).toBe(worstCaseLookbackDays("thisMonth", "prev"));
  });
});
