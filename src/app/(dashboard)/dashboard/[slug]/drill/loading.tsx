import {
  KpiRowSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for フィルター詳細 (drill). Shown while the tab
 * re-fetches on filter / granularity changes so the page doesn't appear
 * frozen. Shape mirrors drill/page.tsx (filters bar → KPIs → funnel → table).
 */
export default function DrillLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <KpiRowSkeleton count={5} />
      <ChartSkeleton />
      <TableSkeleton rows={12} />
    </div>
  );
}
