"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Opens the browser print dialog. Combined with the print CSS in globals.css,
 * "Save as PDF" yields a clean PDF without requiring a server-side export
 * pipeline. Hidden from print via data-print-hide.
 */
export default function PrintButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      data-print-hide="true"
      onClick={() => window.print()}
      aria-label="PDF (print)"
    >
      <Printer />
      <span>PDF</span>
    </Button>
  );
}
