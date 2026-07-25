import { describe, it, expect } from "vitest";
import {
  formatOverallCvLabel,
  formatOverallSalesLabel,
} from "@/lib/sources/bq-rpt";

describe("formatOverallCvLabel (C3-d / A-23)", () => {
  it("parenthesizes with the named source when one exists (dozo/hs style)", () => {
    expect(formatOverallCvLabel({ overallCvSourceName: "Shopify CV" })).toBe(
      "全体CV（Shopify CV）",
    );
    expect(formatOverallCvLabel({ overallCvSourceName: "EC-CUBE CV" })).toBe(
      "全体CV（EC-CUBE CV）",
    );
  });

  it("omits the parenthetical when there is no named source (msec/ogc/ogp style) — never renders the literal duplicate 全体CV（全体CV）", () => {
    expect(formatOverallCvLabel({ overallCvSourceName: undefined })).toBe(
      "全体CV",
    );
  });
});

describe("formatOverallSalesLabel (C3-d / A-23)", () => {
  it("parenthesizes with the source name, CV suffix stripped, when one exists", () => {
    expect(formatOverallSalesLabel({ overallCvSourceName: "Shopify CV" })).toBe(
      "全体売上（Shopify）",
    );
    expect(formatOverallSalesLabel({ overallCvSourceName: "EC-CUBE CV" })).toBe(
      "全体売上（EC-CUBE）",
    );
  });

  it("omits the parenthetical when there is no named source", () => {
    expect(formatOverallSalesLabel({ overallCvSourceName: undefined })).toBe(
      "全体売上",
    );
  });
});
