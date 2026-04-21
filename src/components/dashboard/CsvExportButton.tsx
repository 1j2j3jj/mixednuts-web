"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/csv";

interface Props {
  filename: string;
  rows: Array<Record<string, unknown>>;
  headers?: string[];
  label?: string;
}

export default function CsvExportButton({ filename, rows, headers, label = "CSV" }: Props) {
  function onClick() {
    const csv = toCsv(rows, headers);
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
    <Button size="sm" variant="outline" onClick={onClick} disabled={rows.length === 0}>
      <Download />
      <span>{label}</span>
    </Button>
  );
}
