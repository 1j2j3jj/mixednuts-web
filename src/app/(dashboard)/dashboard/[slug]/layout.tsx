import { assertUserCanAccessClientBySlug } from "@/lib/access";
import DashboardTabs from "@/components/dashboard/Tabs";
import DateRangePicker from "@/components/dashboard/DateRangePicker";

/**
 * Per-client layout. Resolves the slug (404 on unknown / unauthorised) and
 * renders the shared chrome every screen needs: a date-range picker and the
 * Overview / Ads / Drill tab bar. Picker state lives in URL searchParams
 * (see src/lib/range.ts) so each page reads it and applies its own filter.
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
  await assertUserCanAccessClientBySlug(slug);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <DashboardTabs slug={slug} />
        <DateRangePicker />
      </div>
      {children}
    </div>
  );
}
