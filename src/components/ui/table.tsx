import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

/** Table standard (C2-b, 2026-07-25): headers are UPPERCASE / letter-spaced /
 *  small(text-xs=12px, the design-guard floor) / grey — was normal-case with
 *  no tracking. Single fix here cascades to every table in dashboard scope
 *  (see the survey note on ReportTable's own group-header row, which already
 *  hand-rolled this look one level up — its explicit className wins over
 *  this default via cn()'s last-write-wins merge, so it does not double up). */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

/** Row height standard (C2-b): py-3.5 (14px top+bottom) + text-sm content
 *  (20px line-height) = 48px, the reference's "generous" row height — was
 *  p-2 (8px), ~36px effective. tabular-nums here too so numeric columns line
 *  up even at call sites that forgot the per-cell class. */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-2 py-3.5 align-middle tabular-nums [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

/** Shared "total row" treatment (C2-b): thicker top rule + distinct fill +
 *  bolder weight, AND the hover state is neutralised to the same fill so the
 *  row doesn't flicker to a different shade on mouseover the way a normal
 *  data row does — "slightly bolder" was the old bar, this is the reference
 *  target of a row that reads as clearly separate at a glance. Exported so
 *  every table with a total/summary row (MediaTable, MediaCampaignTable,
 *  ChannelTargetTable, ReportTable) applies the identical rule instead of
 *  four hand-rolled copies drifting apart over time. */
export const TOTAL_ROW_CLASS =
  "border-t-2 border-border bg-muted/40 font-semibold hover:bg-muted/40";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
