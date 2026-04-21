import { assertUserCanAccessClientBySlug } from "@/lib/access";
import DashboardTabs from "@/components/dashboard/Tabs";

/**
 * Per-client layout. Resolves the slug (404 on unknown / unauthorised) and
 * renders the tabs shared by Overview / Ads / Drill screens.
 *
 * Note: we *don't* display the client name here — see design doc §2.
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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <DashboardTabs slug={slug} />
      {children}
    </div>
  );
}
