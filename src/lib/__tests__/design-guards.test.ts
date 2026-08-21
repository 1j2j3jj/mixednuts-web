import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  findBrandCyanViolations,
  findHardcodedColorLiterals,
  findDarkFillToggleViolations,
  findChartTokenViolations,
  findSubReadablePxFontSizes,
  type ColorLiteralAllowEntry,
} from "@/lib/design-guards";

/**
 * Phase B design-system guard suite (quality-target-spec.md Q6: consistency
 * enforced by machinery, not human attention).
 *
 * Every guard below is tested twice, in this order:
 *   1. against an inline VIOLATING fixture — proves the detector actually
 *      catches the thing it claims to catch (the single most important
 *      deliverable per the task brief: a guard that can't be shown to fail
 *      is worthless);
 *   2. against an inline CLEAN fixture (usually the current real pattern,
 *      e.g. SegmentedControl's actual selected-state className) — proves
 *      the detector doesn't false-positive on legitimate code.
 *
 * Then a second describe block per guard walks the ACTUAL dashboard source
 * tree (no fixtures) and asserts the real repository is clean — this is the
 * part that fails a future PR if someone reintroduces the deviation.
 */

// ---------------------------------------------------------------------------
// Real-file scanning helpers
// ---------------------------------------------------------------------------

const DASHBOARD_SCOPE_DIRS = [
  "src/app/(dashboard)",
  "src/components/dashboard",
];

function listSourceFiles(dirs: string[]): string[] {
  const root = process.cwd();
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // directory doesn't exist in this checkout — skip, don't crash
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "node_modules")
          continue;
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        // .css is deliberately excluded — see the Guard 2 comment in
        // design-guards.ts ("Adversarial review (2026-07-25)..."):
        // globals.css is the declared token source of truth, not something
        // this guard should police, and a future dashboard-scope CSS
        // Module would likewise go unscanned here.
        out.push(full);
      }
    }
  };
  for (const d of dirs) walk(path.join(root, d));
  return out;
}

function relPath(p: string): string {
  return path.relative(process.cwd(), p);
}

const DASHBOARD_FILES = listSourceFiles(DASHBOARD_SCOPE_DIRS);

// Sanity check on the scanner itself: if this is 0, every "real repo is
// clean" assertion below would pass vacuously and the whole suite would be
// lying. Guards against a future directory rename silently defeating every
// guard below.
describe("design-guards test harness", () => {
  it("finds a non-trivial number of dashboard source files to scan", () => {
    expect(DASHBOARD_FILES.length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Guard 1 — raw brand cyan
// ---------------------------------------------------------------------------

describe("findBrandCyanViolations", () => {
  it("CATCHES raw --cyan var() usage (negative test: proves detection works)", () => {
    const fixture = `
      export function LegacyBadge() {
        return <span style={{ color: "var(--cyan)" }}>NEW</span>;
      }
    `;
    const violations = findBrandCyanViolations(fixture);
    expect(violations.length).toBe(1);
  });

  it("CATCHES the text-cyan-* Tailwind utility class", () => {
    const fixture = `<div className="rounded-md text-cyan-500 border-cyan">x</div>`;
    const violations = findBrandCyanViolations(fixture);
    // text-cyan-500 AND border-cyan — both utilities present, both flagged
    expect(violations.length).toBe(2);
  });

  it("does NOT flag the dashboard's own --chart-1 / --brand tokens (clean fixture)", () => {
    const fixture = `
      const stroke = "var(--chart-1)";
      const ring = "focus-visible:ring-2 focus-visible:ring-ring";
      const brand = "border-brand-ink bg-brand/14 text-brand-deep";
    `;
    expect(findBrandCyanViolations(fixture)).toEqual([]);
  });

  it("CATCHES a class name built from concatenated string fragments (bypass: string concatenation defeats a contiguous-substring regex)", () => {
    // Neither "text-" nor "-500" alone contains "cyan", and the old regex
    // required the CONTIGUOUS substring "text-cyan" — concatenation never
    // produces that contiguous substring even though "cyan" is plainly
    // present in the source as its own string literal.
    const fixture = `const cls = "text-" + "cyan" + "-500";`;
    expect(findBrandCyanViolations(fixture).length).toBe(1);
  });

  it("CATCHES a class name built via template-literal interpolation (bypass: `${...}` composition)", () => {
    // Single-quoted at the outer (test-source) level so the backtick and
    // double quotes inside the fixture don't need escaping.
    const fixture = 'const cls = `text-${"cyan-500"}`;';
    expect(findBrandCyanViolations(fixture).length).toBe(1);
  });

  it("does NOT flag prose mentioning 'cyan' outside a string literal (clean fixture matching the real ChannelStackedBar.tsx / GoalGauge.tsx doc comments)", () => {
    // This is the reason detection is scoped to string literals rather than
    // a whole-source substring search: both real files below say "cyan" in
    // a `/* ... */` doc comment, not in a class name.
    const fixture = `
      /*
       * \`--chart-1..7\` — 7-hue categorical palette anchored on brand cyan
       * (slot 1), separate from the brand cyan accent so a status colour
       * never impersonates a chart series.
       */
    `;
    expect(findBrandCyanViolations(fixture)).toEqual([]);
  });

  it("real dashboard scope contains zero raw brand-cyan references", () => {
    const allViolations = DASHBOARD_FILES.flatMap((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return findBrandCyanViolations(source).map((v) => ({
        file: relPath(file),
        ...v,
      }));
    });
    expect(allViolations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Guard 2 — hardcoded hex / rgb(a) colour literals
// ---------------------------------------------------------------------------

describe("findHardcodedColorLiterals", () => {
  it("CATCHES a hardcoded hex literal used instead of a token (negative test)", () => {
    const fixture = `
      const stroke = tone === "positive" ? "#059669" : "#dc2626";
    `;
    const violations = findHardcodedColorLiterals(fixture);
    expect(violations.length).toBe(2);
    expect(violations.map((v) => v.match)).toEqual(["#059669", "#dc2626"]);
  });

  it("CATCHES a raw rgba() call", () => {
    const fixture = `background: rgba(0, 217, 255, 0.12);`;
    const violations = findHardcodedColorLiterals(fixture);
    expect(violations.length).toBe(1);
  });

  it("does NOT flag var()-based tokens (clean fixture matching the fixed Sparkline.tsx)", () => {
    const fixture = `
      const stroke =
        tone === "positive"
          ? "var(--positive)"
          : tone === "negative"
            ? "var(--negative)"
            : "var(--chart-1)";
    `;
    expect(findHardcodedColorLiterals(fixture)).toEqual([]);
  });

  it("respects an explicit allowlist entry (mechanism test, not a real exception)", () => {
    const fixture = `const legacyOneOff = "#123abc";`;
    const allowlist: ColorLiteralAllowEntry[] = [
      {
        literal: "#123abc",
        reason:
          "TEST FIXTURE ONLY — demonstrates the allowlist mechanism. No real " +
          "entry exists today (2026-07-25); see design-guards.ts Guard 2 comment.",
      },
    ];
    expect(findHardcodedColorLiterals(fixture, allowlist)).toEqual([]);
    // Without the allowlist, the same literal is still caught.
    expect(findHardcodedColorLiterals(fixture).length).toBe(1);
  });

  it("real dashboard scope contains zero hardcoded colour literals (globals.css excluded — it IS the token source of truth)", () => {
    const allViolations = DASHBOARD_FILES.flatMap((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return findHardcodedColorLiterals(source).map((v) => ({
        file: relPath(file),
        ...v,
      }));
    });
    expect(allViolations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Guard 3 — dark-fill selected-toggle pattern
// ---------------------------------------------------------------------------

describe("findDarkFillToggleViolations", () => {
  it("CATCHES the regressed dark-fill selection pattern (negative test)", () => {
    const fixture = `
      className={cn(
        "rounded-md px-3 py-1 text-xs",
        selected
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground",
      )}
    `;
    const violations = findDarkFillToggleViolations(fixture);
    expect(violations.length).toBe(1);
  });

  it("CATCHES it with an isActive identifier and different class ordering", () => {
    const fixture = `
      isActive ? "text-primary-foreground bg-primary shadow" : "bg-transparent"
    `;
    expect(findDarkFillToggleViolations(fixture).length).toBe(1);
  });

  it("CATCHES the pair composed via && short-circuit instead of a ternary (bypass 1: no ternary at all)", () => {
    const fixture = `
      className={cn(selected && "bg-primary", selected && "text-primary-foreground")}
    `;
    expect(findDarkFillToggleViolations(fixture).length).toBe(1);
  });

  it("CATCHES the pair gated by an arbitrary boolean identifier, not just selected/active (bypass 2: 'checked')", () => {
    const fixture = `
      checked
        ? "bg-primary text-primary-foreground"
        : "bg-transparent text-muted-foreground"
    `;
    expect(findDarkFillToggleViolations(fixture).length).toBe(1);
  });

  it("CATCHES the pair regardless of WHICH boolean identifier gates it (bypass 2, generality: current/open/highlighted)", () => {
    for (const identifier of ["current", "open", "highlighted"]) {
      const fixture = `${identifier} ? "bg-primary text-primary-foreground" : "bg-transparent"`;
      expect(findDarkFillToggleViolations(fixture).length).toBe(1);
    }
  });

  it("CATCHES the pair composed via clsx object syntax (bypass 3: no ternary, no adjacent string)", () => {
    const fixture = `
      clsx({ "bg-primary": selected, "text-primary-foreground": selected })
    `;
    expect(findDarkFillToggleViolations(fixture).length).toBe(1);
  });

  it("CATCHES the pair extracted to a named constant referenced from the ternary (bypass 4: no proximity to 'selected' at all)", () => {
    const fixture = `
      const SELECTED_STYLE = "bg-primary text-primary-foreground";
      const UNSELECTED_STYLE = "text-muted-foreground";
      className={cn(base, selected ? SELECTED_STYLE : UNSELECTED_STYLE)}
    `;
    expect(findDarkFillToggleViolations(fixture).length).toBe(1);
  });

  it("does NOT flag the current SegmentedControl.tsx selected style (clean fixture)", () => {
    const fixture = `
      className={cn(
        "border-[1.5px] text-xs font-medium transition-colors",
        selected
          ? "border-brand-ink bg-brand/14 text-brand-deep"
          : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground",
        !selected && option.inactiveClassName,
      )}
    `;
    expect(findDarkFillToggleViolations(fixture)).toEqual([]);
  });

  it("no longer exempts the shared Button/Badge variant-map shape — now flags it too (accepted tradeoff of closing bypass 4)", () => {
    // Historical note: this fixture used to be a "clean, does NOT flag"
    // case, specifically proving the old ternary-plus-identifier keying
    // didn't false-positive on Button's unrelated `default` variant. Bypass
    // 4 above (extraction to a named constant) proved that keying scheme
    // bypassable, and closing it requires flagging the two classes on bare
    // co-occurrence — which makes this fixture textually indistinguishable
    // from the named-constant bypass: both are simply "a string literal
    // containing both classes". This is an accepted, documented tradeoff
    // (see the Guard 3 comment block in design-guards.ts) — real safety for
    // Button/Badge comes from directory scope, not from this function. The
    // next test proves the real files are excluded that way.
    const fixture = `
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
          destructive: "bg-destructive text-destructive-foreground shadow-sm",
        },
      },
    `;
    expect(findDarkFillToggleViolations(fixture).length).toBeGreaterThan(0);
  });

  it("the REAL button.tsx/badge.tsx contain this pair too, and are clean of the real-tree scan ONLY because src/components/ui is outside dashboard scope (proves the boundary this guard now relies on)", () => {
    const buttonSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/button.tsx"),
      "utf-8",
    );
    const badgeSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/badge.tsx"),
      "utf-8",
    );
    // If either file were ever fed through this detector, it WOULD be
    // flagged — that is the accepted cost documented above, not a bug.
    expect(findDarkFillToggleViolations(buttonSource).length).toBeGreaterThan(
      0,
    );
    expect(findDarkFillToggleViolations(badgeSource).length).toBeGreaterThan(0);
    // What actually keeps the real-tree assertion below clean: neither file
    // is part of the scanned dashboard-scope set (DASHBOARD_SCOPE_DIRS) in
    // the first place. If this ever becomes false — e.g. Button/Badge move
    // into src/components/dashboard — the real-tree test below will start
    // failing, which is the correct, honest outcome (allowlist it then,
    // per the Guard 3 comment).
    expect(
      DASHBOARD_FILES.some((f) => relPath(f).includes("components/ui")),
    ).toBe(false);
  });

  it("does NOT flag an isActive ternary whose consequent is unrelated to bg-primary (clean fixture matching Tabs.tsx)", () => {
    const fixture = `aria-current={isActive ? "page" : undefined}`;
    expect(findDarkFillToggleViolations(fixture)).toEqual([]);
  });

  it("real dashboard scope contains zero dark-fill selected-toggle occurrences", () => {
    const allViolations = DASHBOARD_FILES.flatMap((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return findDarkFillToggleViolations(source).map((v) => ({
        file: relPath(file),
        ...v,
      }));
    });
    expect(allViolations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Guard 4 — categorical series tokens stay inside chart files
// ---------------------------------------------------------------------------

describe("findChartTokenViolations", () => {
  it("CATCHES a chart token string literal in a non-chart dashboard file", () => {
    const fixture = `const colour = "var(--chart-2)";`;
    expect(
      findChartTokenViolations(
        fixture,
        "src/components/dashboard/BigKpiCard.tsx",
      ),
    ).toEqual([{ line: 1, match: '"var(--chart-2)"' }]);
  });

  it("allows categorical tokens inside named chart implementations", () => {
    const fixture = `const colour = "var(--chart-2)";`;
    expect(
      findChartTokenViolations(
        fixture,
        "src/components/dashboard/ChannelTrendChart.tsx",
      ),
    ).toEqual([]);
  });

  it("does not treat a lowercase keyword hidden inside a non-chart name as chart scope", () => {
    const fixture = `const colour = "var(--chart-1)";`;
    expect(
      findChartTokenViolations(
        fixture,
        "src/components/dashboard/BaselineCard.tsx",
      ),
    ).toHaveLength(1);
  });

  it("does not flag chart-token prose in comments", () => {
    const fixture = `// --chart-2 is categorical only`;
    expect(
      findChartTokenViolations(
        fixture,
        "src/components/dashboard/BigKpiCard.tsx",
      ),
    ).toEqual([]);
  });

  it("real dashboard scope contains zero chart tokens outside chart files", () => {
    const allViolations = DASHBOARD_FILES.flatMap((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return findChartTokenViolations(source, relPath(file)).map((v) => ({
        file: relPath(file),
        ...v,
      }));
    });
    expect(allViolations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Guard 5 — font sizes below 12px on user-readable content
// ---------------------------------------------------------------------------

describe("findSubReadablePxFontSizes", () => {
  it("CATCHES an arbitrary sub-12px px value (negative test)", () => {
    const fixture = `<span className="text-[10px] text-muted-foreground">±2σ</span>`;
    const violations = findSubReadablePxFontSizes(fixture);
    expect(violations.length).toBe(1);
    expect(violations[0].match).toBe("text-[10px]");
  });

  it("CATCHES an arbitrary sub-12px rem value", () => {
    // 0.625rem = 10px
    const fixture = `<span className="text-[0.625rem]">tiny</span>`;
    expect(findSubReadablePxFontSizes(fixture).length).toBe(1);
  });

  it("CATCHES an arbitrary sub-12px em value (bypass: em was not recognised at all)", () => {
    // 0.7em treated at the task-specified 1em = 16px basis => 11.2px < 12
    const fixture = `<span className="text-[0.7em]">tiny</span>`;
    expect(findSubReadablePxFontSizes(fixture).length).toBe(1);
  });

  it("CATCHES an arbitrary sub-12px percent value (bypass: % was not recognised at all)", () => {
    // 70% of the 16px basis => 11.2px < 12
    const fixture = `<span className="text-[70%]">tiny</span>`;
    expect(findSubReadablePxFontSizes(fixture).length).toBe(1);
  });

  it('CATCHES an inline style-object fontSize, string form (bypass: style={{ fontSize: "10px" }} was invisible to a text-[...] -only regex)', () => {
    const fixture = `<span style={{ fontSize: "10px" }}>tiny</span>`;
    expect(findSubReadablePxFontSizes(fixture).length).toBe(1);
  });

  it("CATCHES an inline style-object fontSize, bare-numeric form (bypass: style={{ fontSize: 10 }} — React/DOM imply px)", () => {
    const fixture = `<span style={{ fontSize: 10 }}>tiny</span>`;
    expect(findSubReadablePxFontSizes(fixture).length).toBe(1);
  });

  it("does NOT flag the text-xs scale step (12px) or larger arbitrary values, in ANY recognised unit including the newly-added ones (clean fixture)", () => {
    const fixture = `
      <span className="text-xs text-muted-foreground">normal</span>
      <span className="text-[14px]">also fine</span>
      <span className="text-[1.75rem] font-extrabold">kpi value</span>
      <span className="text-[1em]">also fine (1em = 16px)</span>
      <span className="text-[100%]">also fine (100% = 16px)</span>
      <span style={{ fontSize: "14px" }}>also fine</span>
      <span style={{ fontSize: 16 }}>also fine</span>
    `;
    expect(findSubReadablePxFontSizes(fixture)).toEqual([]);
  });

  it("system primitives (src/components/ui/**, SegmentedControl.tsx) contain zero sub-12px text — these are the shared building blocks every dashboard surface inherits from, so a regression here is systemic by definition", () => {
    const primitiveFiles = [
      ...listSourceFiles(["src/components/ui"]),
      path.join(process.cwd(), "src/components/dashboard/SegmentedControl.tsx"),
    ];
    expect(primitiveFiles.length).toBeGreaterThan(0);
    const allViolations = primitiveFiles.flatMap((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return findSubReadablePxFontSizes(source).map((v) => ({
        file: relPath(file),
        ...v,
      }));
    });
    expect(allViolations).toEqual([]);
  });

  it("dashboard-wide sub-12px count does not exceed the frozen, RECOMPUTED 2026-07-25 baseline (ratchet, not a full ban)", () => {
    // The typography-spacing audit (2026-07-24) found 31 existing
    // text-[10px]/text-[11px] sites (18 + 13) across page-level content —
    // several load-bearing (DrillTable anomaly badge, ReportTable
    // data-quality caveats, FunnelChart step delta). Rewriting each site's
    // information hierarchy is a Phase C (information-design) judgment
    // call, not a Phase B mechanical token swap, so this program does not
    // bulk-fix them.
    //
    // RECOMPUTED 2026-07-25: closing the em/%/inline-fontSize bypasses (see
    // design-guards.ts Guard 4 comment) made this detector see MORE of the
    // real tree than before — 4 pre-existing sites that were always sub-12px
    // but invisible to the old text-[...px]/text-[...rem]-only regex, all
    // the same shape (a Recharts `wrapperStyle`/style-object
    // `fontSize: "11px"` on a chart legend or tooltip):
    //   - src/components/dashboard/Sparkline.tsx:53
    //   - src/components/dashboard/ChannelTrendChart.tsx:181
    //   - src/components/dashboard/ChannelStackedBar.tsx:162
    //   - src/components/dashboard/NewVsRepeatChart.tsx:57
    // (Verified by running the broadened detector against the real tree and
    // diffing against the pre-broadening 31; zero em/% sites were found —
    // only the fontSize:"11px" shape above.) Per the task brief, broadening
    // detection is not the same program as fixing what it finds, so the
    // baseline is RAISED to match the new true count (31 -> 35) instead of
    // silently failing the suite. These 4 join the same Phase C backlog as
    // the original 31 — not fixed here.
    //
    // What Phase B CAN and does enforce: the count must never grow from
    // here. If this assertion fails, either (a) a new sub-12px site was
    // added — fix it before merging — or (b) Phase C shrank the real count
    // below BASELINE — great, lower BASELINE to match and keep the ratchet
    // tight.
    const BASELINE = 35;
    const allViolations = DASHBOARD_FILES.flatMap((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return findSubReadablePxFontSizes(source).map((v) => ({
        file: relPath(file),
        ...v,
      }));
    });
    expect(allViolations.length).toBeLessThanOrEqual(BASELINE);
  });
});
