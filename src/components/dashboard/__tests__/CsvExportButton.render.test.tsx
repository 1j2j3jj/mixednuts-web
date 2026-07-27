import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CsvExportButton from "@/components/dashboard/CsvExportButton";

/**
 * G-3 payload-fix coverage (2026-07-26): CsvExportButton's `href` branch
 * must render as a plain link and must NOT require `rows` — that's the
 * whole point of the fix (drill's full row set no longer has to reach the
 * client just to make this button work). See
 * src/lib/dashboard/__tests__/drill-export-payload-guard.test.ts for the
 * companion source-text guard that drill/page.tsx actually uses this
 * branch instead of the old `rows={csvRows}` shape.
 */

describe("CsvExportButton", () => {
  it("href mode: renders a download link with no rows prop supplied at all", () => {
    const html = renderToStaticMarkup(
      React.createElement(CsvExportButton, {
        filename: "drill-x7k2q9-2026-07-26.csv",
        href: "/dashboard/x7k2q9/drill/export?preset=thisMonth",
      }),
    );
    expect(html).toContain("<a");
    expect(html).toContain(
      'href="/dashboard/x7k2q9/drill/export?preset=thisMonth"',
    );
    expect(html).toContain('download="drill-x7k2q9-2026-07-26.csv"');
  });

  it("href mode ignores an accompanying `rows` prop entirely (href always wins) — proves a future caller cannot accidentally reintroduce the payload by passing both", () => {
    const html = renderToStaticMarkup(
      React.createElement(CsvExportButton, {
        filename: "f.csv",
        href: "/export",
        rows: [{ a: 1 }, { a: 2 }],
      }),
    );
    expect(html).toContain("<a");
    // The rendered markup for the href branch never touches `rows`, so its
    // content cannot leak into the HTML via this component regardless of
    // what's passed — the values 1/2 only appear if the client-side branch
    // executed, which it must not when href is set.
    expect(html).not.toContain(">1<");
    expect(html).not.toContain(">2<");
  });

  it("rows mode (no href): still works for the bounded report/insights use — disabled when rows is empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(CsvExportButton, {
        filename: "f.csv",
        rows: [],
      }),
    );
    expect(html).toContain("<button");
    expect(html).toContain('disabled=""');
  });

  it("rows mode: enabled (not disabled) when rows has content", () => {
    const html = renderToStaticMarkup(
      React.createElement(CsvExportButton, {
        filename: "f.csv",
        rows: [{ a: 1 }],
      }),
    );
    expect(html).toContain("<button");
    expect(html).not.toContain('disabled=""');
  });
});
