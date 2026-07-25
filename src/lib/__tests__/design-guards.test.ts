import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  findBrandCyanViolations,
  findHardcodedColorLiterals,
  findDarkFillToggleViolations,
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

  it("does NOT flag the shared Button component's unrelated default variant (clean fixture, proves no false positive on static variant maps)", () => {
    const fixture = `
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
          destructive: "bg-destructive text-destructive-foreground shadow-sm",
        },
      },
    `;
    expect(findDarkFillToggleViolations(fixture)).toEqual([]);
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
// Guard 4 — font sizes below 12px on user-readable content
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

  it("does NOT flag the text-xs scale step (12px) or larger arbitrary values (clean fixture)", () => {
    const fixture = `
      <span className="text-xs text-muted-foreground">normal</span>
      <span className="text-[14px]">also fine</span>
      <span className="text-[1.75rem] font-extrabold">kpi value</span>
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

  it("dashboard-wide sub-12px count does not exceed the frozen 2026-07-25 baseline (ratchet, not a full ban)", () => {
    // The typography-spacing audit (2026-07-24) found 31 existing
    // text-[10px]/text-[11px] sites (18 + 13) across page-level content —
    // several load-bearing (DrillTable anomaly badge, ReportTable
    // data-quality caveats, FunnelChart step delta). Rewriting each site's
    // information hierarchy is a Phase C (information-design) judgment
    // call, not a Phase B mechanical token swap, so this program does not
    // bulk-fix them. What Phase B CAN and does enforce: the count must never
    // grow. If this assertion fails, either (a) a new sub-12px site was
    // added — fix it before merging — or (b) Phase C shrank the real count
    // below BASELINE — great, lower BASELINE to match and keep the ratchet
    // tight.
    const BASELINE = 31;
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
