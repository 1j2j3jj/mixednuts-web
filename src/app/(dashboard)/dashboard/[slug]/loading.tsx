/**
 * Skeleton shown while the dashboard's parallel data fetches (GA4
 * + Sheets + GSC + ECCUBE) resolve. Previously every page left the
 * user staring at a white screen for 1-3s. Design review P1 fix.
 *
 * Shape matches the Overview page so the layout doesn't jump when
 * real content replaces the skeleton.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      </div>

      {/* 5 big KPI skeletons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Big chart skeleton */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-72 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-72 w-full animate-pulse rounded bg-muted" />
      </div>

      {/* Two-column skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-40 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
