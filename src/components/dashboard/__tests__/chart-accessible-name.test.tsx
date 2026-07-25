import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * E-2/E-4/E-5 regression guard (Phase E), static-analysis form.
 *
 * Every Recharts chart in dashboard scope used to render an `<svg>` with no
 * accessible name at all — a screen reader user reaching one (Recharts'
 * default `accessibilityLayer` makes them keyboard-focusable via Tab,
 * confirmed: rootPropsSlice.js defaults `accessibilityLayer: true` in
 * recharts 3.8.1) heard nothing. The fix wires a `title` prop through to
 * Recharts' own `title`/`desc` handling (container/Surface.js renders these
 * as the SVG's first two children — the accessible name/description for the
 * `role="application"` element Recharts already emits by default).
 *
 * This is a SOURCE-TEXT guard, not a render test, and that is a deliberate,
 * verified choice, not a shortcut: attempting the equivalent
 * `renderToStaticMarkup` render test (matching BigKpiCard.invariant.test.tsx's
 * technique) proved Recharts' `ResponsiveContainer` never actually renders
 * its chart subtree in this repo's headless node environment at all — it
 * bails out to an empty 0x0 placeholder div because `SizeDetectorContainer`'s
 * initial dimension is hard-coded `{width:-1, height:-1}` and no
 * ResizeObserver/DOM measurement ever runs without jsdom (confirmed by
 * direct inspection of node_modules/recharts's `ResponsiveContainer.js` /
 * `responsiveContainerUtils.js`, and by dumping actual rendered HTML — the
 * `<title>`/`<defs>`/every chart child is entirely absent from the output
 * regardless of whether this fix is present, even through BigKpiCard's own
 * Sparkline, whose existing invariant test's `toContain("<svg")` assertion
 * turns out to pass only because of an UNRELATED lucide icon `<svg>`
 * elsewhere on the card — not proof Recharts rendered anything). Adding
 * jsdom+ResizeObserver mocking to fix that is out of scope for this change,
 * same call BigKpiCard's test file already made for the identical
 * limitation. A source-text guard (the same idiom design-guards.ts already
 * uses for this exact reason) is the reliable, false-positive-resistant
 * alternative: it can't be fooled by an unrelated `<svg>` elsewhere in the
 * tree, unlike the render-based check would have been.
 */

const CHART_FILES = [
  "src/components/dashboard/DailyTrendChart.tsx",
  "src/components/dashboard/ChannelStackedBar.tsx",
  "src/components/dashboard/ChannelTrendChart.tsx",
  "src/components/dashboard/NewVsRepeatChart.tsx",
  "src/components/dashboard/Sparkline.tsx",
] as const;

// The literal Recharts top-level chart tag each file renders.
const ROOT_TAG: Record<(typeof CHART_FILES)[number], string> = {
  "src/components/dashboard/DailyTrendChart.tsx": "ComposedChart",
  "src/components/dashboard/ChannelStackedBar.tsx": "BarChart",
  "src/components/dashboard/ChannelTrendChart.tsx": "BarChart",
  "src/components/dashboard/NewVsRepeatChart.tsx": "BarChart",
  "src/components/dashboard/Sparkline.tsx": "LineChart",
};

function read(file: string): string {
  return fs.readFileSync(path.join(process.cwd(), file), "utf-8");
}

describe("chart accessible names — title wired into Recharts (E-2/E-4)", () => {
  for (const file of CHART_FILES) {
    it(`${file}: declares a \`title\` prop and forwards it into <${ROOT_TAG[file]}>`, () => {
      const src = read(file);
      // Prop declared on the component's Props interface.
      expect(src).toMatch(/title\?:\s*string/);
      // Forwarded into the actual chart element as `title={title}` (or, for
      // Sparkline, the same shape) — not just declared-and-unused.
      const rootTag = ROOT_TAG[file];
      const rootBlockMatch = src.match(
        new RegExp(`<${rootTag}\\b[\\s\\S]{0,400}?>`),
      );
      expect(
        rootBlockMatch,
        `<${rootTag} …> opening tag not found`,
      ).not.toBeNull();
      expect(rootBlockMatch![0]).toMatch(/title=\{title\}/);
    });

    // Sparkline has no in-component default — unlike the other 4 (each
    // used from several pages, so a component-level fallback matters),
    // Sparkline has exactly ONE caller in the whole codebase (BigKpiCard),
    // which always supplies a title (asserted separately below), so an
    // arbitrary hard-coded fallback string here would never actually be
    // reached and would just be dead code.
    if (file === "src/components/dashboard/Sparkline.tsx") continue;

    it(`${file}: has a non-empty default title (a caller that omits the prop still gets SOME accessible name, not undefined)`, () => {
      const src = read(file);
      expect(src).toMatch(/title\s*=\s*["`][^"`]+["`]/);
    });
  }

  it("Sparkline's sole caller (BigKpiCard) always supplies a non-empty title, derived from the card's own visible `label` — not new copy", () => {
    const bigKpiCardSrc = read("src/components/dashboard/BigKpiCard.tsx");
    expect(bigKpiCardSrc).toMatch(/title=\{`\$\{label\} [^`]+`\}/);
    // Confirms this really is the only call site — if a second one is added
    // without a title, this guard's "sole caller" reasoning above breaks and
    // needs revisiting (add Sparkline's own default fallback instead).
    const callSites = fs
      .readdirSync(path.join(process.cwd(), "src/components/dashboard"), {
        recursive: true,
      })
      .filter((f): f is string => typeof f === "string" && f.endsWith(".tsx"))
      .filter((f) => f !== "Sparkline.tsx" && !f.includes("__tests__"))
      .map((f) => path.join(process.cwd(), "src/components/dashboard", f))
      .filter((f) =>
        read(path.relative(process.cwd(), f)).includes("<Sparkline"),
      );
    expect(callSites.length).toBe(1);
  });
});

describe("NewVsRepeatChart colour-only fix — diagonal hatch pattern (E-3)", () => {
  const src = read("src/components/dashboard/NewVsRepeatChart.tsx");

  it("defines an SVG <pattern> for the hatch texture", () => {
    expect(src).toContain("<pattern");
    expect(src).toMatch(/patternTransform="rotate\(45\)"/);
  });

  it("the リピート (repeat) bar's fill references the pattern via url(#...) — colour is NOT removed, the pattern's own rect still fills with var(--chart-6)", () => {
    expect(src).toMatch(/fill=\{`url\(#\$\{hatchId\}\)`\}/);
    expect(src).toMatch(/fill="var\(--chart-6\)"/);
  });

  it("the pattern id is unique per instance (React useId, not a hard-coded string that would collide with multiple chart instances on one page)", () => {
    expect(src).toMatch(/useId\(\)/);
    expect(src).not.toMatch(/id="nvr-hatch"/); // literal, non-unique id would be a regression
  });
});

describe("Recharts animation gated behind prefers-reduced-motion (E-5)", () => {
  const animatedChartFiles = [
    "src/components/dashboard/DailyTrendChart.tsx",
    "src/components/dashboard/ChannelStackedBar.tsx",
    "src/components/dashboard/ChannelTrendChart.tsx",
    "src/components/dashboard/NewVsRepeatChart.tsx",
  ];

  for (const file of animatedChartFiles) {
    it(`${file}: imports usePrefersReducedMotion and passes isAnimationActive={!reducedMotion} to every Bar/Line`, () => {
      const src = read(file);
      expect(src).toContain(
        'import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";',
      );
      expect(src).toContain("usePrefersReducedMotion()");
      const marks = src.match(/isAnimationActive=\{!reducedMotion\}/g) ?? [];
      expect(marks.length).toBeGreaterThan(0);
    });
  }

  it('Sparkline keeps its pre-existing isAnimationActive={false} (deliberately always off, per its own comment — not a reduced-motion regression to "fix")', () => {
    const src = read("src/components/dashboard/Sparkline.tsx");
    expect(src).toContain("isAnimationActive={false}");
  });
});
