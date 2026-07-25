import { describe, it, expect } from "vitest";
import {
  escapeCsvCell,
  guardFormulaPrefix,
  startsWithFormulaTrigger,
} from "../csv-guard";
import { toCsv } from "../csv";
import { rowsToCsv } from "../master-csv";

/**
 * F-1 regression suite (Phase F security audit, 2026-07-25).
 *
 * Covers: each dangerous leading character, quoted forms interacting with
 * the guard, the numeric/string gating rule (a real negative number must
 * still import as a number; a string that merely looks like one must not),
 * and both call sites (csv.ts row bodies + header row, master-csv.ts row
 * bodies + header row).
 */

describe("startsWithFormulaTrigger / guardFormulaPrefix", () => {
  it.each([
    ["=1+1", true],
    ['=HYPERLINK("http://evil.example","click")', true],
    ["+1", true],
    ["-1", true],
    ["-1234", true],
    ["@SUM(A1:A2)", true],
    ["\tevil", true],
    ["\revil", true],
    ["normal text", false],
    ["", false],
    ["中文商品名", false],
    ["a=b", false], // = not in first position — not a trigger
  ])("startsWithFormulaTrigger(%j) === %j", (input, expected) => {
    expect(startsWithFormulaTrigger(input)).toBe(expected);
  });

  it("prefixes a single apostrophe for each dangerous leading character", () => {
    expect(guardFormulaPrefix("=1+1")).toBe("'=1+1");
    expect(guardFormulaPrefix("+81-3-1234")).toBe("'+81-3-1234");
    expect(guardFormulaPrefix("-1+2")).toBe("'-1+2");
    expect(guardFormulaPrefix("@mention")).toBe("'@mention");
  });

  it("is a no-op for safe strings", () => {
    expect(guardFormulaPrefix("普通の商品名")).toBe("普通の商品名");
    expect(guardFormulaPrefix("SKU-123")).toBe("SKU-123"); // hyphen not in position 0
  });
});

describe("escapeCsvCell — the typeof gate (design decision under test)", () => {
  it("guards a string that starts with a formula trigger", () => {
    // No comma/quote in this one, so no RFC 4180 quoting kicks in — just
    // the apostrophe guard, isolating that behaviour from the quoting one.
    expect(escapeCsvCell("=1+1+cmd")).toBe("'=1+1+cmd");
  });

  it("guards AND quotes when the guarded value also needs RFC 4180 quoting", () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"',
    );
  });

  it("does NOT guard a genuine JS number, even a negative one", () => {
    // This is the crux of the negative-number reconciliation: ad platforms
    // emit real negative cost/billing-correction rows. They must reach the
    // CSV as a bare number, not text.
    expect(escapeCsvCell(-1234)).toBe("-1234");
    expect(escapeCsvCell(-0.5)).toBe("-0.5");
    expect(escapeCsvCell(1234)).toBe("1234");
    expect(escapeCsvCell(0)).toBe("0");
  });

  it("DOES guard a string that merely looks like a negative number", () => {
    // A malicious payload, or an incidental string-typed field (e.g. a
    // literal SKU "-1"), gets the apostrophe — correct because it's a
    // name/ID/label context, not a numeric one, if it arrived as a string.
    expect(escapeCsvCell("-1")).toBe("'-1");
    expect(escapeCsvCell("-1+2")).toBe("'-1+2");
  });

  it("quotes cells containing commas, quotes, or newlines after guarding", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    // guard applies before quoting: a formula-looking value with a comma
    // gets both the apostrophe AND quoting.
    expect(escapeCsvCell("=1,2")).toBe('"\'=1,2"');
  });

  it("null/undefined become an empty cell", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("non-string, non-number values (e.g. boolean) are stringified but never formula-guarded", () => {
    expect(escapeCsvCell(true)).toBe("true");
    expect(escapeCsvCell(false)).toBe("false");
  });
});

describe("toCsv (csv.ts) — client-facing export call sites", () => {
  it("guards a malicious campaign/product name in a body cell", () => {
    const csv = toCsv([{ label: "=cmd|'/c calc'!A0", spend: -500 }]);
    expect(csv).toContain("'=cmd|'/c calc'!A0");
    // the negative spend must remain a bare number, unguarded
    expect(csv).toContain(",-500");
    expect(csv).not.toContain(",'-500");
  });

  it("guards the header row too, not just body cells", () => {
    const csv = toCsv([{ productName: "normal" }], ["=cmd|'/c calc'!A1"]);
    const [headerLine] = csv.split("\r\n");
    expect(headerLine).toBe("'=cmd|'/c calc'!A1");
  });

  it("a GSC query starting with '@' is neutralised", () => {
    const csv = toCsv([{ query: "@everyone check this out" }]);
    expect(csv).toContain("'@everyone check this out");
  });
});

describe("rowsToCsv (master-csv.ts) — admin master-data download call site", () => {
  it("guards a malicious value in the free-text notes column", () => {
    const csv = rowsToCsv(["notes"] as const, [{ notes: "=1+1" }]);
    expect(csv).toContain("'=1+1");
  });

  it("preserves a genuine negative numeric field as a bare number", () => {
    const csv = rowsToCsv(["ad_spend_budget"] as const, [
      { ad_spend_budget: -1000 },
    ]);
    const lines = csv.trim().split("\n");
    expect(lines[1]).toBe("-1000");
  });

  it("guards the header row (column names) as well as body cells", () => {
    const csv = rowsToCsv(["=SUM(A1)"] as const, [{ "=SUM(A1)": "x" }]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("'=SUM(A1)");
  });
});
