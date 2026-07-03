import { TableSkeleton } from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for 商品・検索 (insights). Shown while the three
 * ranking tables (products / landing pages / GSC queries) fetch in
 * parallel so a date-range change doesn't leave blank space.
 */
export default function InsightsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <TableSkeleton rows={10} />
      <TableSkeleton rows={10} />
      <TableSkeleton rows={12} />
    </div>
  );
}
