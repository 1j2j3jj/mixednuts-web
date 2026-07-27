import { headers } from "next/headers";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { isRptSupported } from "@/lib/sources/bq-rpt";
import DashboardTabs from "@/components/dashboard/Tabs";
import DataUpdatedFooter from "@/components/dashboard/DataUpdatedFooter";
import { getViewerOrgRole, canInviteMembers } from "@/lib/org-role";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { fmtJstTime } from "@/lib/datetime";

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
  const orgRole = await getViewerOrgRole(slug);
  // Admin sees the subtitle (company name) since the admin index also shows
  // full labels. Client viewers just see the primary label — subtitle leaks
  // internal context that's not relevant to them.
  const subtitle =
    viewerKind === "admin" || viewerKind === null ? client.subtitle : null;
  const renderedAtLabel = fmtJstTime(new Date());

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* C2-a (defect A-3): client-name + tab row + date picker used to be
          two separately-margined bands (h2 row, then a gap, then the tabs+
          picker row) — merged into one row here. The client identity (was
          the sidebar's job before the sidebar was removed) now sits inline
          to the left of the tabs instead of on its own line; the bottom
          rule that used to live on <nav> (see Tabs.tsx) moved to this
          wrapper so it still spans the full row, not just the tab links. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* C3-a (defect A-22): this is tenant-identity CHROME shared by
              every tab, not page content — it must not be a heading at all.
              It used to be an <h2>, which put a level-2 heading in the DOM
              before any page's own <h1> (PageHeader.tsx) on every single
              tab, an invalid heading order for screen-reader users. A <div>
              styled identically has no semantic heading role, so the page's
              own <h1> (rendered inside {children} below) is once again the
              first heading in document order — with no visible-text change. */}
          <div className="shrink-0 text-sm font-semibold tracking-tight">
            {client.label}
            {subtitle && (
              // C3-e (defect A-24): was `ml-1.5` + literal "· " (space only
              // AFTER the dot, via CSS margin BEFORE it) — asymmetric and the
              // one inconsistent spot vs. the " · " (space-space) composition
              // used everywhere else in the dashboard (ads/drill/report/
              // insights page titles). Switched to the same literal " · "
              // token, no CSS margin, for one consistent separator idiom.
              <span className="font-normal text-muted-foreground">
                {" · "}
                {subtitle}
              </span>
            )}
          </div>
          <DashboardTabs
            slug={slug}
            showReport={isRptSupported(client.id)}
            showMembers={canInviteMembers(orgRole)}
          />
        </div>
        {/* ml-auto: カスタム期間で日付入力が増えて 2 行目に折り返しても右端に
            アンカーし続ける（折り返し時に左へジャンプして見えるのを防ぐ）。 */}
        <div className="ml-auto">
          <DateRangePicker />
        </div>
      </div>
      {children}
      <DataUpdatedFooter timestamp={renderedAtLabel} />
      {/* サポート導線（Batch5）: 行き止まりを作らない。バグ報告も同じ窓口。 */}
      <footer className="border-t border-border pt-3 pb-2 text-center text-xs text-muted-foreground">
        お困りですか？{" "}
        <a
          href="mailto:info@mixednuts-inc.com?subject=ダッシュボードについて"
          className="underline hover:text-brand-ink"
        >
          info@mixednuts-inc.com
        </a>
        （バグ報告もこちら）
      </footer>
    </div>
  );
}
