/**
 * Shared CSV cell-escaping used by every CSV writer in this app
 * (src/lib/csv.ts for client-facing exports, src/lib/master-csv.ts for
 * admin master-data downloads). Previously each file had its own
 * near-identical `escapeCell`/`escapeCsvField`, both doing RFC 4180
 * quoting only (commas/quotes/newlines) with zero guard against
 * formula-injection. Centralising here so there is exactly one place
 * to get this right, instead of two that can silently drift apart
 * (F-1, Phase F security audit, 2026-07-25).
 *
 * ── The vulnerability ────────────────────────────────────────────────
 * RFC 4180 quoting is necessary but not sufficient. Excel and Google
 * Sheets treat a cell whose value STARTS with =, +, -, @, or a literal
 * TAB/CR as a formula the instant the file is opened — CWE-1236
 * "Improper Neutralization of Formula Elements in a CSV File". Several
 * exports in this app carry client- or ad-platform-controlled strings
 * straight into a CSV cell with no sanitisation: product names (GA4
 * itemName), GSC search queries (directly attacker-typeable), campaign
 * and ad-group names (Google/Yahoo/Meta), and free-text notes fields on
 * the admin masters. A campaign literally named
 * `=HYPERLINK("http://evil.example","click")` becomes live, executable
 * content the moment the client opens their own exported CSV.
 *
 * ── THE RULE (do not weaken without re-reading this comment) ────────
 * The formula-prefix guard applies ONLY to values that are already a
 * JS `string` at the call site. Every genuinely numeric column in this
 * app (spend, cost, sessions, revenue, impressions, ...) is passed
 * through as a JS `number`, never as a string — including legitimate
 * negative figures (ad platforms do emit negative cost / billing-
 * correction rows). Gating strictly on `typeof v === "string"` means:
 *
 *   - a real negative number (e.g. -1234) stays a bare `-1234` and
 *     Excel/Sheets imports it as a NUMBER, unmolested;
 *   - a string that happens to start with one of the dangerous
 *     characters (a malicious payload, or an incidental case like a
 *     SKU literally named "-1") gets a leading apostrophe and imports
 *     as inert TEXT — which is the correct, safe behaviour for a
 *     name/ID/label field regardless of the injection angle.
 *
 * Do NOT change this to a character check on `String(v)` for every
 * value — that re-applies the guard to numbers and corrupts legitimate
 * negative figures into text. See csv-guard.test.ts for the exact
 * cases this must hold for.
 *
 * The guard also applies to header rows (a header row is just a row of
 * strings) — csv.ts previously escaped body cells but emitted the
 * header row completely raw.
 */

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/** True if `s` would be interpreted as a formula (or similar) by Excel/Sheets when it is the first character of an unquoted CSV cell. */
export function startsWithFormulaTrigger(s: string): boolean {
  return FORMULA_PREFIX_RE.test(s);
}

/**
 * Neutralise a string that would otherwise open a CSV cell with a
 * formula-triggering character, by prefixing a single apostrophe (the
 * standard OWASP-recommended CSV-injection mitigation — Excel/Sheets
 * treat a leading `'` as "force text" and the cell imports inertly).
 * No-op for strings that don't start with a dangerous character.
 */
export function guardFormulaPrefix(s: string): string {
  return startsWithFormulaTrigger(s) ? `'${s}` : s;
}

function quoteIfNeeded(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Escape one CSV cell: RFC 4180 quoting + formula-injection guard.
 * `null`/`undefined` → empty cell. Non-string values (numbers, booleans)
 * are stringified for quoting purposes but are NEVER formula-guarded —
 * see the module doc comment above for why that gate matters.
 */
export function escapeCsvCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v !== "string") return quoteIfNeeded(String(v));
  return quoteIfNeeded(guardFormulaPrefix(v));
}
