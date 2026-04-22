import { headers } from "next/headers";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import DashboardTabs from "@/components/dashboard/Tabs";
import DateRangePicker from "@/components/dashboard/DateRangePicker";

/**
 * Per-client layout. Resolves the slug (404 on unknown / unauthorised) and
 * renders the shared chrome every screen needs: the client label (so the
 * tenant identity is always on screen — replaces the removed sidebar),
 * a tab bar, and the date-range picker. Picker state lives in URL
 * searchParams (see src/lib/range.ts) so each page reads it and applies
 * its own filter.
 */
export const dynamic = "force-dynamic";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await assertUserCanAccessClientBySlug(slug);

  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");
  // Admin sees the subtitle (company name) since the admin index also shows
  // full labels. Client viewers just see the primary label — subtitle leaks
  // internal context that's not relevant to them.
  const subtitle =
    viewerKind === "admin" || viewerKind === null ? client.subtitle : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {client.label}
          {subtitle && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              · {subtitle}
            </span>
          )}
        </h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <DashboardTabs slug={slug} />
        <DateRangePicker />
      </div>
      {children}
    </div>
  );
}
