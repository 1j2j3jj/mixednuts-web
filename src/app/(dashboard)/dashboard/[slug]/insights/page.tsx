import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getTopProducts, getTopLandingPages } from "@/lib/sources/ga4";
import { getTopGscQueries } from "@/lib/sources/gsc";
import ProductRanking from "@/components/dashboard/ProductRanking";
import LandingPageTable from "@/components/dashboard/LandingPageTable";
import GscQueryTable from "@/components/dashboard/GscQueryTable";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Screen 4 — Insights. Dedicated detail tab for:
 *   - 商品別売上 Top 30 (GA4 `items` report, 過去28日)
 *   - ランディングページ Top 30 (GA4 landingPagePlusQueryString, 過去28日)
 *   - オーガニック検索クエリ Top 50 (GSC `query`, 過去28日)
 *
 * These used to sit at the bottom of Overview as cramped Top-10 mini tables.
 * Moved here (2026-04-22) so CEO/client can drill into long-tail winners and
 * export full CSVs without scrolling past 5 other KPIs.
 *
 * Note: all three sections use a fixed 過去28日 window (not the page-level
 * DateRangePicker). The picker is kept in the chrome for consistency across
 * tabs, but these reports are anchored-to-current for SEO/product signal —
 * historical windows tend to be noise. A future "Benchmarks" tab can host
 * picker-aware versions.
 */
export const dynamic = "force-dynamic";

export default async function InsightsScreen({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await assertUserCanAccessClientBySlug(slug);

  const [products, landingPages, queries] = await Promise.all([
    getTopProducts(client),
    getTopLandingPages(client),
    getTopGscQueries(client),
  ]);

  const productCsv = products.map((p) => ({
    productName: p.productName,
    sku: p.sku,
    conversions: p.conversions,
    unitPrice: p.unitPrice,
    revenue: p.revenue,
  }));
  const landingCsv = landingPages.map((r) => ({
    path: r.path,
    sessions: r.sessions,
    conversions: r.conversions,
    cvr: r.sessions > 0 ? (r.conversions / r.sessions).toFixed(4) : "0",
    revenue: r.revenue,
  }));
  const queryCsv = queries.map((r) => ({
    query: r.query,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr.toFixed(4),
    position: r.position.toFixed(2),
  }));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Insights</div>
          <h1 className="text-2xl font-semibold tracking-tight">商品・検索 詳細</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            過去28日の Top リスト · GA4 商品購入 / ランディングページ / GSC 検索クエリ
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PrintButton />
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">商品別売上 Top 30（GA4 items）</CardTitle>
          <CsvExportButton
            filename={`products-${slug}-${today}.csv`}
            rows={productCsv}
            label="CSV"
          />
        </CardHeader>
        <CardContent>
          <ProductRanking rows={products} limit={30} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">ランディングページ Top 30（GA4 · 過去28日）</CardTitle>
          <CsvExportButton
            filename={`landing-${slug}-${today}.csv`}
            rows={landingCsv}
            label="CSV"
          />
        </CardHeader>
        <CardContent>
          <LandingPageTable rows={landingPages} limit={30} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">オーガニック検索クエリ Top 50（GSC · 過去28日）</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">順位は小さいほど良い（1 = 1位表示）</div>
          </div>
          <CsvExportButton
            filename={`gsc-queries-${slug}-${today}.csv`}
            rows={queryCsv}
            label="CSV"
          />
        </CardHeader>
        <CardContent>
          <GscQueryTable rows={queries} limit={50} />
        </CardContent>
      </Card>
    </div>
  );
}
