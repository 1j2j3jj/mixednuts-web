import {
  KpiRowSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ToolbarSkeleton,
} from "@/components/dashboard/skeletons";

/**
 * Loading skeleton for 広告詳細. Shown while the tab's parallel fetches
 * (daily rows + GA4 monthly channels + paid campaigns) resolve, so tab
 * switches don't look frozen. Shape mirrors ads/page.tsx.
 */
export default function AdsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <ToolbarSkeleton />
      <KpiRowSkeleton count={5} />
      <ChartSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
