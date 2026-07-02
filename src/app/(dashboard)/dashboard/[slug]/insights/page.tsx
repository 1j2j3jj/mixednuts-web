import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getTopProducts, getTopLandingPages } from "@/lib/sources/ga4";
import { getTopGscQueries } from "@/lib/sources/gsc";
import { resolveFromSearchParams } from "@/lib/range";
import ProductRanking from "@/components/dashboard/ProductRanking";
import LandingPageTable from "@/components/dashboard/LandingPageTable";
import GscQueryTable from "@/components/dashboard/GscQueryTable";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import MockBanner from "@/components/dashboard/MockBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Screen 4 — Insights. Dedicated detail tab for:
 *   - 商品別売上 Top 30 (GA4 `items` report)
 *   - ランディングページ Top 30 (GA4 landingPagePlusQueryString)
 *   - オーガニック検索クエリ Top 50 (GSC `query`)
 *
 * These used to sit at the bottom of Overview as cramped Top-10 mini tables.
 * Moved here (2026-04-22) so CEO/client can drill into long-tail winners and
 * export full CSVs without scrolling past 5 other KPIs.
 *
 * Period-aware (2026-07-02): all three sections now follow the page-level
 * DateRangePicker (`?preset=`/`?start=`/`?end=`) via resolveFromSearchParams,
 * same as ads/report/drill. Defaults to 直近28日 (preset="last28") when the
 * URL has no explicit selection, matching the previous hardcoded 過去28日
 * behaviour. `cmp`/`previous` window is irrelevant here (no comparison UI
 * on this tab) — only `current` is used.
 */
export const dynamic = "force-dynamic";

export default async function InsightsScreen({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const client = await assertUserCanAccessClientBySlug(slug);

  const anchor = new Date().toISOString().slice(0, 10);
  const rr = resolveFromSearchParams(sp, { preset: "last28", compare: "none" }, anchor);
  const period = { start: rr.current.start, end: rr.current.end };

  const [productsResult, landingPagesResult, queriesResult] = await Promise.all([
    getTopProducts(client, period),
    getTopLandingPages(client, period),
    getTopGscQueries(client, period),
  ]);
  const {
    rows: { rows: products, dataQualityNote: productDataQualityNote, revenueUnreliable },
  } = productsResult;
  const { rows: landingPages } = landingPagesResult;
  const { rows: queries } = queriesResult;
  const anyMock =
    productsResult.isMock || landingPagesResult.isMock || queriesResult.isMock;

  // CSV mirrors the on-screen columns: when revenue is unreliable the
  // 単価/売上 columns are hidden, so they are excluded from the export too.
  const productCsv = products.map((p) =>
    revenueUnreliable
      ? { productName: p.productName, sku: p.sku, conversions: p.conversions }
      : {
          productName: p.productName,
          sku: p.sku,
          conversions: p.conversions,
          unitPrice: p.unitPrice,
          revenue: p.revenue,
        }
  );
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

  const periodLabel = `${period.start} 〜 ${period.end}`;
  const periodSlug = `${period.start}_${period.end}`;

  return (
    <div className="space-y-6">
      <MockBanner isMock={anyMock} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Insights</div>
          <h1 className="text-2xl font-semibold tracking-tight">商品・検索 詳細</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {rr.presetLabel}（{periodLabel}）の Top リスト · GA4 商品購入 / ランディングページ / GSC 検索クエリ
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
            filename={`products-${slug}-${periodSlug}.csv`}
            rows={productCsv}
            label="CSV"
          />
        </CardHeader>
        <CardContent>
          <ProductRanking rows={products} limit={30} hideRevenue={revenueUnreliable} />
          {productDataQualityNote && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {productDataQualityNote}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">ランディングページ Top 30（GA4 · {periodLabel}）</CardTitle>
          <CsvExportButton
            filename={`landing-${slug}-${periodSlug}.csv`}
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
            <CardTitle className="text-sm">オーガニック検索クエリ Top 50（GSC · {periodLabel}）</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">順位は小さいほど良い（1 = 1位表示）</div>
          </div>
          <CsvExportButton
            filename={`gsc-queries-${slug}-${periodSlug}.csv`}
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
