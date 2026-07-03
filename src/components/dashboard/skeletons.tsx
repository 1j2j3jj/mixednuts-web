import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading-state building blocks for the dashboard tabs.
 *
 * Each dashboard sub-tab (ads / drill / report / insights) ships a
 * `loading.tsx` that composes these so navigating between tabs shows a
 * shaped skeleton instead of a frozen white screen while the server
 * component's parallel fetches resolve (Meta / Google Ads pattern).
 *
 * Skeletons are purely visual; the wrapping <div> carries aria-busy /
 * aria-live so assistive tech announces the loading state.
 */

/** Row of N big-KPI card placeholders (matches BigKpiCard shape). */
export function KpiRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** A bordered card with a title bar and a tall body (chart placeholder). */
export function ChartSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className={`w-full ${height}`} />
    </div>
  );
}

/** A table placeholder: header bar + N shimmer rows inside a bordered card. */
export function TableSkeleton({
  rows = 12,
  title = true,
}: {
  rows?: number;
  title?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      {title && <Skeleton className="mb-3 h-4 w-32" />}
      <div className="space-y-2">
        <Skeleton className="h-8 w-full opacity-70" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Section-heading + toolbar row placeholder (page title, buttons). */
export function ToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-5 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
