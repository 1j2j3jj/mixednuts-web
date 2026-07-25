/**
 * Design-system guard detectors — Phase B ("machinery, not human attention",
 * quality-target-spec.md Q6).
 *
 * Each function is a pure string -> Violation[] detector: no filesystem
 * access here on purpose, so every detector can be unit-tested against an
 * inline fixture string (see __tests__/design-guards.test.ts) independently
 * of which real files currently exist. The test file is what walks the
 * repo's actual dashboard source and feeds it through these functions.
 *
 * Source: 2026-07-24 three-lane design-system audit
 * (radius-border-shadow / color-tokens / typography-spacing) +
 * projects/mixednuts-web/_reports/2026-07-24_dashboard-quality-target-spec.md
 * §3 ("色規律" / "角丸" 2-value system) and §1 Q6.
 */

export interface Violation {
  /** 1-indexed line number within the scanned source string. */
  line: number;
  /** The offending substring (or a short window around it), for the failure message. */
  match: string;
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/* ------------------------------------------------------------------------
 * Guard 1 — raw brand cyan in dashboard scope.
 *
 * --cyan / --cyan-soft are the MARKETING site's brand accent (v3-pure
 * palette, defined at :root in globals.css). The dashboard has its own,
 * separately validated --chart-1 / --brand tokens (darker, contrast-checked
 * against white — see globals.css comment above --brand). --cyan is not
 * scoped OUT of .dashboard-scope, so nothing at the CSS level stops a
 * dashboard component from reaching for it (color-tokens audit lane,
 * finding "legacy-cyan-token-scope-gap"). This guard is the enforcement
 * that a CSS boundary doesn't currently provide.
 * ---------------------------------------------------------------------- */
const CYAN_VAR_RE = /var\(\s*--cyan(?:-soft)?\s*[,)]/g;
const CYAN_UTILITY_RE =
  /\b(?:text|bg|border|ring|fill|stroke|from|via|to)-cyan(?:-\d{2,3})?\b/g;

export function findBrandCyanViolations(source: string): Violation[] {
  const violations: Violation[] = [];
  for (const re of [CYAN_VAR_RE, CYAN_UTILITY_RE]) {
    const scoped = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = scoped.exec(source))) {
      violations.push({ line: lineAt(source, m.index), match: m[0] });
    }
  }
  return violations;
}

/* ------------------------------------------------------------------------
 * Guard 2 — hardcoded hex/rgb(a) colour literals in dashboard components.
 *
 * color-tokens audit lane: Sparkline.tsx hardcoded tone strokes as raw hex
 * (#059669 / #dc2626) instead of a token, and ChannelTrendChart /
 * ChannelStackedBar fell back to raw "#ccc". All three are now tokenized
 * (--positive / --negative / var(--muted-foreground)), so the allowlist
 * below is currently EMPTY — every hex/rgb(a) literal found in dashboard
 * scope is a genuine deviation today. The allowlist exists so a future,
 * deliberately-approved exception is a one-line addition with a comment,
 * not a silent carve-out in the regex itself.
 * ---------------------------------------------------------------------- */
export interface ColorLiteralAllowEntry {
  /** Exact literal text as it appears in source, e.g. "#059669". */
  literal: string;
  /** Why this specific literal is allowed to stay hardcoded. */
  reason: string;
}

/**
 * No entries today (2026-07-25) — see comment above. Kept as the mechanism
 * for future, deliberate exceptions; do not add an entry without a `reason`
 * that would survive a design-system review.
 */
export const COLOR_LITERAL_ALLOWLIST: readonly ColorLiteralAllowEntry[] = [];

const HEX_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_LITERAL_RE = /\brgba?\([^)]*\)/g;

export function findHardcodedColorLiterals(
  source: string,
  allowlist: readonly ColorLiteralAllowEntry[] = COLOR_LITERAL_ALLOWLIST,
): Violation[] {
  const allowed = new Set(allowlist.map((e) => e.literal));
  const violations: Violation[] = [];
  for (const re of [HEX_LITERAL_RE, RGB_LITERAL_RE]) {
    const scoped = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = scoped.exec(source))) {
      if (allowed.has(m[0])) continue;
      violations.push({ line: lineAt(source, m.index), match: m[0] });
    }
  }
  return violations;
}

/* ------------------------------------------------------------------------
 * Guard 3 — the old dark-fill selected-toggle pattern.
 *
 * SegmentedControl.tsx (and any future toggle-like component) must NOT
 * mark its selected option by filling it with `bg-primary` +
 * `text-primary-foreground` — that pattern already regressed into the
 * codebase once (radius-border-shadow / typography audits both reference
 * SegmentedControl as the shared primitive every toggle now uses; the
 * current, correct selected style is `bg-brand/14 text-brand-deep`).
 *
 * Deliberately scoped to a SELECTION ternary, not a bare co-occurrence
 * check: `bg-primary text-primary-foreground` is also the legitimate,
 * unrelated default variant of the shared shadcn Button component
 * (src/components/ui/button.tsx `variant: default`), which is a static
 * style map, not a selection-state toggle, and lives outside dashboard
 * scope's component tree (src/components/dashboard/**) that this guard
 * scans. A naive "both classes appear anywhere in the file" check would
 * false-positive the moment someone renders a default <Button/> and puts
 * its className in a template literal split across lines near unrelated
 * "active"/"selected" text. Instead this looks specifically for
 * `selected|isSelected|active|isActive ? <consequent with BOTH classes>`.
 * ---------------------------------------------------------------------- */
const SELECTION_TERNARY_RE =
  /\b(?:is)?(?:[Ss]elected|[Aa]ctive)\b[^?:{};]{0,60}\?/g;
const BG_PRIMARY_RE = /\bbg-primary\b(?!-foreground)/;
const TEXT_PRIMARY_FOREGROUND_RE = /\btext-primary-foreground\b/;

export function findDarkFillToggleViolations(source: string): Violation[] {
  const violations: Violation[] = [];
  const re = new RegExp(
    SELECTION_TERNARY_RE.source,
    SELECTION_TERNARY_RE.flags,
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const consequentStart = m.index + m[0].length;
    const colonIdx = source.indexOf(":", consequentStart);
    const windowEnd =
      colonIdx === -1
        ? Math.min(source.length, consequentStart + 250)
        : colonIdx;
    const consequent = source.slice(consequentStart, windowEnd);
    if (
      BG_PRIMARY_RE.test(consequent) &&
      TEXT_PRIMARY_FOREGROUND_RE.test(consequent)
    ) {
      violations.push({
        line: lineAt(source, m.index),
        match: consequent.trim().slice(0, 80),
      });
    }
  }
  return violations;
}

/* ------------------------------------------------------------------------
 * Guard 4 — font sizes below 12px on user-readable content.
 *
 * typography-spacing audit lane: text-[10px] (18 sites) / text-[11px] (13
 * sites) are load-bearing information in several places (DrillTable's
 * anomaly badge, ReportTable's data-quality caveats, FunnelChart's step
 * delta) — legacy content the audit assigned to Phase C (information-design
 * uplift), not Phase B (this program). Rewriting 31 existing sites' copy
 * hierarchy is a restyle judgment call per-site, not a mechanical token
 * swap, so it is out of Phase B's "mechanical and safe" fix scope.
 *
 * findSubReadablePxFontSizes is still a general-purpose detector (proven
 * against fixtures below); how it's applied to real files is a policy
 * choice made in the test file, not here.
 * ---------------------------------------------------------------------- */
const ARBITRARY_PX_RE = /text-\[(\d+(?:\.\d+)?)px\]/g;
const ARBITRARY_REM_RE = /text-\[(\d*\.\d+|\d+)rem\]/g;

export function findSubReadablePxFontSizes(
  source: string,
  minPx = 12,
): Violation[] {
  const violations: Violation[] = [];

  const pxRe = new RegExp(ARBITRARY_PX_RE.source, ARBITRARY_PX_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = pxRe.exec(source))) {
    const px = parseFloat(m[1]);
    if (px < minPx) {
      violations.push({ line: lineAt(source, m.index), match: m[0] });
    }
  }

  const remRe = new RegExp(ARBITRARY_REM_RE.source, ARBITRARY_REM_RE.flags);
  while ((m = remRe.exec(source))) {
    const px = parseFloat(m[1]) * 16;
    if (px < minPx) {
      violations.push({ line: lineAt(source, m.index), match: m[0] });
    }
  }

  return violations;
}
