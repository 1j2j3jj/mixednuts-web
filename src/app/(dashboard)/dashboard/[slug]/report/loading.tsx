import {
  KpiRowSkeleton,
  TableSkeleton,
} from "@/components/dashboard/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for レポート (BQ rpt_* views). Shown while the
 * granularity view (daily / media / cpn / adg) re-fetches so switching
 * tabs / views doesn't look frozen. Shape mirrors report/page.tsx.
 */
export default function ReportLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* View switcher + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <KpiRowSkeleton count={3} />
      <TableSkeleton rows={20} />
    </div>
  );
}
