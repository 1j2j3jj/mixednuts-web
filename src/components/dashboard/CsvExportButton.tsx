"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/csv";

interface Props {
  filename: string;
  /**
   * Client-side mode: rows are already in hand (small, bounded datasets \u2014
   * report/insights tabs). The CSV is built in the browser from this array.
   */
  rows?: Array<Record<string, unknown>>;
  headers?: string[];
  label?: string;
  /**
   * Server-side mode (G-3 payload fix, 2026-07-26): a route-handler URL
   * that streams the CSV directly. Use this instead of `rows` whenever the
   * full row set would otherwise have to be serialized into the page's RSC
   * hydration payload just to reach this button \u2014 the drill tab's
   * unbounded (entity \u00d7 time-bucket) row count is exactly that case (see
   * drill/export/route.ts). When set, `rows` is ignored and no row data
   * ever reaches the client; this renders as a plain download link, no
   * client-side CSV construction.
   */
  href?: string;
}

export default function CsvExportButton({
  filename,
  rows,
  headers,
  label = "CSV",
  href,
}: Props) {
  if (href) {
    return (
      <Button size="sm" variant="outline" asChild>
        <a href={href} download={filename}>
          <Download />
          <span>{label}</span>
        </a>
      </Button>
    );
  }

  const dataRows = rows ?? [];
  function onClick() {
    const csv = toCsv(dataRows, headers);
    // BOM for Excel's JA auto-detection.
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={dataRows.length === 0}
    >
      <Download />
      <span>{label}</span>
    </Button>
  );
}
