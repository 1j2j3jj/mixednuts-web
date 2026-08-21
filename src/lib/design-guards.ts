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
 *
 * Hardened 2026-07-25: the original version only matched specific contexts
 * (`var(--cyan...)`, or `text-/bg-/border-/...-cyan(-NNN)?`). An adversarial
 * review proved both bypassable by constructing the class name from string
 * fragments instead of one contiguous token — e.g. `"text-" + "cyan" +
 * "-500"` or `` `text-${"cyan-500"}` `` — neither contains the substring
 * the old regex looked for, even though "cyan" is plainly present in the
 * source. A static scanner cannot evaluate arbitrary string concatenation
 * or template interpolation in general (that needs a real JS evaluator,
 * deliberately out of scope for a fast lint-style guard), so this is
 * broadened pragmatically instead: flag the bare token `cyan` wherever it
 * appears inside a STRING LITERAL (double-quoted, single-quoted, or
 * template-literal) anywhere in the scanned source, not only when directly
 * adjacent to text-/border-/--.
 *
 * Scoping to string-literal contents (rather than the raw source, comments
 * included) is load-bearing, not a nice-to-have: two dashboard files
 * legitimately say "cyan" in prose today (ChannelStackedBar.tsx and
 * GoalGauge.tsx both have a doc-comment explaining a palette "anchored on
 * brand cyan"); a whole-source substring search would false-positive on
 * both. Restricting to string-literal contents keeps the false-positive
 * rate at zero against the current tree (verified 2026-07-25) while still
 * catching every fragment-constructed bypass above, because each of those
 * still puts the literal characters "cyan" inside SOME string literal —
 * they only avoid putting them in the SAME literal as "text-"/"border-"/
 * "--". Known remaining limit, stated honestly: this still cannot catch
 * `"cy" + "an"` (split mid-token) or a Unicode-escaped/obfuscated spelling;
 * closing that fully needs a real evaluator, not a lint-style guard.
 * ---------------------------------------------------------------------- */
const STRING_LITERAL_RE =
  /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const CYAN_TOKEN_RE = /cyan/g;
/** How much surrounding literal text to keep in the reported `match`. */
const CYAN_MATCH_CONTEXT = 20;

export function findBrandCyanViolations(source: string): Violation[] {
  const violations: Violation[] = [];
  const stringRe = new RegExp(
    STRING_LITERAL_RE.source,
    STRING_LITERAL_RE.flags,
  );
  let sm: RegExpExecArray | null;
  while ((sm = stringRe.exec(source))) {
    const literal = sm[0];
    const literalStart = sm.index;
    const cyanRe = new RegExp(CYAN_TOKEN_RE.source, CYAN_TOKEN_RE.flags);
    let cm: RegExpExecArray | null;
    while ((cm = cyanRe.exec(literal))) {
      const start = Math.max(0, cm.index - CYAN_MATCH_CONTEXT);
      const end = Math.min(
        literal.length,
        cm.index + cm[0].length + CYAN_MATCH_CONTEXT,
      );
      violations.push({
        line: lineAt(source, literalStart + cm.index),
        match: literal.slice(start, end),
      });
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
 *
 * Adversarial review (2026-07-25) found no realistic bypass of the
 * detection regexes themselves — left unchanged below. The one real gap is
 * upstream of this function: the test file's `listSourceFiles` walker only
 * collects `.tsx?`/`.jsx?` files, so `.css` is deliberately never fed
 * through this detector. That is intentional, not an oversight — globals.css
 * is the declared token source of truth (it's where --positive/--negative/
 * --chart-1/etc. are DEFINED as hex/rgb literals in the first place, so
 * scanning it for "hardcoded" colour literals would flag the definitions
 * themselves), not a place this guard should police. The tradeoff this
 * accepts: a future dashboard-scope CSS Module (e.g. a component importing
 * its own `*.module.css`) would sail through unscanned by this guard. If
 * dashboard components start using CSS Modules, this guard's file-walker
 * scope (not its regex logic) is what needs revisiting.
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
 * Hardened 2026-07-25: the original version keyed on a SELECTION ternary —
 * a `selected|isSelected|active|isActive ? <consequent with BOTH classes>`
 * shape — specifically to avoid false-positiving on the shared shadcn
 * Button/Badge `default` variant, which contains the same two classes as a
 * static style-map entry, not a selection-state toggle. An adversarial
 * review proved that ternary-plus-identifier-name keying trivially
 * bypassable four ways, none of them exotic: (1) `&&` short-circuit
 * composition instead of a ternary, (2) any boolean identifier other than
 * selected/active — checked/current/open/highlighted/anything, (3) clsx's
 * object syntax (`{ "bg-primary": selected, "text-primary-foreground":
 * selected }`), and (4) extracting the two classes into a named constant
 * referenced from the ternary instead of writing them inline. Bypass (4) is
 * the one that forecloses any idiom-or-identifier-based fix:
 * `const SELECTED_STYLE = "bg-primary text-primary-foreground"` puts the
 * two classes in a string literal with no ternary, no boolean identifier,
 * and no textual proximity to the word "selected" at all — indistinguishable
 * by pure text matching from Button's own
 * `default: "bg-primary text-primary-foreground shadow hover:bg-primary/90"`
 * variant-map entry (both are simply "a string literal containing both
 * classes, space-separated").
 *
 * Because of that, this guard no longer tries to recognise the selection
 * idiom at all. It flags the two classes simply CO-OCCURRING anywhere in a
 * scanned source string, full stop: "this pair must not appear in dashboard
 * scope." That is deliberately blunt, and the cost is explicit: a
 * hypothetical dashboard-scope file using this literal pair for some
 * unrelated, legitimate reason would also be flagged, with no text-only way
 * to tell it apart from a regressed toggle once bypass (4) is in play. The
 * shared shadcn primitives that legitimately use this pair as a static
 * `default` variant — src/components/ui/button.tsx and
 * src/components/ui/badge.tsx — stay clean of this guard NOT because of
 * anything in this function, but purely because src/components/ui sits
 * outside the two directories the test file's `listSourceFiles` walks
 * (src/app/(dashboard)/**, src/components/dashboard/**). Confirmed zero
 * violations against the current dashboard-scope tree (2026-07-25). If
 * either file — or any other legitimate use of this exact pair — ever
 * enters dashboard scope, allowlist it explicitly with a comment (the same
 * mechanism Guard 2 uses for colour literals) rather than reintroducing
 * idiom-based detection.
 * ---------------------------------------------------------------------- */
const BG_PRIMARY_RE = /\bbg-primary\b(?!-foreground)/g;
const TEXT_PRIMARY_FOREGROUND_RE = /\btext-primary-foreground\b/;

export function findDarkFillToggleViolations(source: string): Violation[] {
  // Gate on the rarer/more distinctive class first — if it's absent, the
  // pair can't co-occur and there is nothing to report.
  if (!TEXT_PRIMARY_FOREGROUND_RE.test(source)) return [];
  const violations: Violation[] = [];
  const re = new RegExp(BG_PRIMARY_RE.source, BG_PRIMARY_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    violations.push({ line: lineAt(source, m.index), match: m[0] });
  }
  return violations;
}

/* ------------------------------------------------------------------------
 * Guard 4 — categorical chart tokens stay inside chart implementations.
 *
 * --chart-1..7 encode categorical series. Reusing them for KPI decoration,
 * icons, badges, or other non-series UI gives one colour multiple meanings.
 * A file is chart-scoped only when its name contains Chart, Bar, Line, Pie,
 * Area, or Trend. Deliberate exceptions must be listed below with a reason.
 * ---------------------------------------------------------------------- */
export interface ChartTokenAllowEntry {
  /** Workspace-relative dashboard TSX path. */
  file: string;
  /** Why this non-chart file must reference a categorical series token. */
  reason: string;
}

// Empty by design. Add exceptions one per line with an adjacent reason.
export const CHART_TOKEN_ALLOWLIST: readonly ChartTokenAllowEntry[] = [];

const CHART_FILE_NAME_PARTS = ["Chart", "Bar", "Line", "Pie", "Area", "Trend"];
const CHART_TOKEN_RE = /--chart-/g;

export function findChartTokenViolations(
  source: string,
  file: string,
  allowlist: readonly ChartTokenAllowEntry[] = CHART_TOKEN_ALLOWLIST,
): Violation[] {
  const normalizedFile = file.replaceAll("\\", "/");
  const fileName = normalizedFile.split("/").at(-1) ?? normalizedFile;
  const lowerFileName = fileName.toLowerCase();
  const isChartFile = CHART_FILE_NAME_PARTS.some(
    (part) =>
      fileName.includes(part) || lowerFileName.startsWith(part.toLowerCase()),
  );
  if (isChartFile) return [];
  if (allowlist.some((entry) => entry.file === normalizedFile)) return [];

  const violations: Violation[] = [];
  const stringRe = new RegExp(
    STRING_LITERAL_RE.source,
    STRING_LITERAL_RE.flags,
  );
  let stringMatch: RegExpExecArray | null;
  while ((stringMatch = stringRe.exec(source))) {
    const tokenRe = new RegExp(CHART_TOKEN_RE.source, CHART_TOKEN_RE.flags);
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = tokenRe.exec(stringMatch[0]))) {
      violations.push({
        line: lineAt(source, stringMatch.index + tokenMatch.index),
        match: stringMatch[0],
      });
    }
  }
  return violations;
}

/* ------------------------------------------------------------------------
 * Guard 5 — font sizes below 12px on user-readable content.
 *
 * typography-spacing audit lane: text-[10px] (18 sites) / text-[11px] (13
 * sites) are load-bearing information in several places (DrillTable's
 * anomaly badge, ReportTable's data-quality caveats, FunnelChart's step
 * delta) — legacy content the audit assigned to Phase C (information-design
 * uplift), not Phase B (this program). Rewriting existing sites' copy
 * hierarchy is a restyle judgment call per-site, not a mechanical token
 * swap, so it is out of Phase B's "mechanical and safe" fix scope — see the
 * BASELINE ratchet in the test file, not a bulk fix here.
 *
 * findSubReadablePxFontSizes is still a general-purpose detector (proven
 * against fixtures below); how it's applied to real files is a policy
 * choice made in the test file, not here.
 *
 * Hardened 2026-07-25: the original version only recognised
 * `text-[Npx]`/`text-[Nrem]`. An adversarial review proved three more ways
 * to render sub-12px text that sailed through undetected: `text-[0.7em]`,
 * `text-[70%]`, and inline `style={{ fontSize: "10px" }}` (string form) —
 * plus the numeric form `style={{ fontSize: 10 }}`, which the DOM/React
 * both treat as px, same as the string form with an explicit unit. All four
 * are added below, converted to a common px basis per the task brief: 1rem
 * = 1em = 16px, and a percentage is a fraction of that same 16px baseline
 * (e.g. 70% => 11.2px). Broadening this detector changed what the real tree
 * scan finds — see the recomputed BASELINE comment in the test file for the
 * exact before/after count and which new sites it covers.
 * ---------------------------------------------------------------------- */
const ARBITRARY_PX_RE = /text-\[(\d+(?:\.\d+)?)px\]/g;
const ARBITRARY_REM_RE = /text-\[(\d*\.\d+|\d+)rem\]/g;
const ARBITRARY_EM_RE = /text-\[(\d*\.\d+|\d+)em\]/g;
const ARBITRARY_PERCENT_RE = /text-\[(\d*\.\d+|\d+)%\]/g;
/**
 * Inline style-object `fontSize`, quoted with any CSS unit ("10px",
 * "0.7rem", "70%") or bare numeric (10 — React/the DOM append "px" to a
 * unitless number, so this guard does too). Matches regardless of which
 * prop the style object is assigned to (`style={{...}}`, `wrapperStyle=
 * {{...}}`, `contentStyle={{...}}`, ...) — the risk is the CSS-in-JS
 * `fontSize:` property itself, not the enclosing prop name, and enumerating
 * every prop name a chart/UI library might use would be a losing game.
 * `(?<![A-Za-z])` avoids matching inside a longer camelCase identifier that
 * merely ends in "...fontSize".
 */
const INLINE_FONT_SIZE_RE =
  /(?<![A-Za-z])fontSize\b\s*:\s*(?:["'](\d*\.\d+|\d+)(px|rem|em|%)?["']|(\d*\.\d+|\d+))/g;

/** Task-specified common comparison basis: 1rem = 1em = 16px. */
const ROOT_FONT_SIZE_PX = 16;

function toComparablePx(value: number, unit: string | undefined): number {
  switch (unit) {
    case "rem":
    case "em":
      return value * ROOT_FONT_SIZE_PX;
    case "%":
      return (value / 100) * ROOT_FONT_SIZE_PX;
    default:
      // "px", or no unit at all (bare numeric fontSize — treated as px).
      return value;
  }
}

export function findSubReadablePxFontSizes(
  source: string,
  minPx = 12,
): Violation[] {
  const violations: Violation[] = [];

  const scan = (
    re: RegExp,
    getValue: (m: RegExpExecArray) => {
      value: number;
      unit: string | undefined;
    },
  ) => {
    const scoped = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = scoped.exec(source))) {
      const { value, unit } = getValue(m);
      if (Number.isNaN(value)) continue;
      if (toComparablePx(value, unit) < minPx) {
        violations.push({ line: lineAt(source, m.index), match: m[0] });
      }
    }
  };

  scan(ARBITRARY_PX_RE, (m) => ({ value: parseFloat(m[1]), unit: "px" }));
  scan(ARBITRARY_REM_RE, (m) => ({ value: parseFloat(m[1]), unit: "rem" }));
  scan(ARBITRARY_EM_RE, (m) => ({ value: parseFloat(m[1]), unit: "em" }));
  scan(ARBITRARY_PERCENT_RE, (m) => ({ value: parseFloat(m[1]), unit: "%" }));
  scan(INLINE_FONT_SIZE_RE, (m) => {
    if (m[1] !== undefined) {
      // Quoted form: fontSize: "10px" / "0.7rem" / "70%". A quoted value
      // with no recognised unit suffix is treated as px (matches CSS
      // convention for a bare-number string, and errs toward flagging
      // rather than silently ignoring a malformed value).
      return { value: parseFloat(m[1]), unit: m[2] ?? "px" };
    }
    // Bare numeric form: fontSize: 10 — React/DOM apply "px" implicitly.
    return { value: parseFloat(m[3]), unit: "px" };
  });

  return violations;
}
