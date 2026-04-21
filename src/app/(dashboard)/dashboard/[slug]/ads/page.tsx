import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import { getGa4MonthlyChannels } from "@/lib/sources/ga4";
import { resolveFromSearchParams } from "@/lib/range";
import MediaTable, { type MediaRow } from "@/components/dashboard/MediaTable";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import RefreshButton from "@/components/dashboard/RefreshButton";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { fmtInt, fmtJpy, fmtRatioPct, safeDiv } from "@/lib/utils";

/**
 * Screen 2 — Ads summary.
 *
 * Range-aware. Compares selected window vs previous-window (or prior-year
 * equivalent) via the picker. Media table totals reflect the current window.
 */
export const dynamic = "force-dynamic";

function fakeGa4CvPerMedia(media: string, adsCv: number): number {
  const ratio: Record<string, number> = {
    Google: 0.92,
    Microsoft: 0.88,
    Yahoo: 0.85,
    meta: 1.04,
  };
  return Math.round(adsCv * (ratio[media] ?? 0.9));
}

function pct(a: number, b: number): number | null {
  if (b === 0) return null;
  return (a - b) / b;
}

export default async function AdsScreen({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const client = await assertUserCanAccessClientBySlug(slug);

  const { rows, fetchedAt, isMock } = await getDailyRows(client);
  const allDates = rows.map((r) => r.date).filter(Boolean).sort();
  const anchor = allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);

  const rr = resolveFromSearchParams(sp, { preset: "last28", compare: "prev" }, anchor);

  const cur = filterByRange(rows, rr.current.start, rr.current.end);
  const prev = rr.previous ? filterByRange(rows, rr.previous.start, rr.previous.end) : [];
  const curTotals = sumRows(cur);
  const prevTotals = sumRows(prev);

  // Media aggregation.
  function byMedia(list: DailyRow[]): MediaRow[] {
    const map = new Map<string, MediaRow>();
    for (const r of list) {
      const c = map.get(r.media) ?? {
        media: r.media,
        spend: 0,
        impressions: 0,
        clicks: 0,
        adsCv: 0,
        ga4Cv: 0,
        conversionValue: 0,
      };
      c.spend += r.cost;
      c.impressions += r.impressions;
      c.clicks += r.clicks;
      c.adsCv += r.conversions;
      c.conversionValue += r.conversionValue;
      map.set(r.media, c);
    }
    return Array.from(map.values()).map((m) => ({ ...m, ga4Cv: fakeGa4CvPerMedia(m.media, m.adsCv) }));
  }
  const mediaRows = byMedia(cur);

  const series = aggregateByDate(cur);

  // New vs repeat, past 6 months from GA4 mock (context, not range-filtered).
  const ga4 = getGa4MonthlyChannels(client);
  const byMonthUsers = new Map<string, { new: number; returning: number }>();
  for (const r of ga4) {
    const acc = byMonthUsers.get(r.yearMonth) ?? { new: 0, returning: 0 };
    acc.new += r.newUsers;
    acc.returning += r.returningUsers;
    byMonthUsers.set(r.yearMonth, acc);
  }
  const newVsRepeat = Array.from(byMonthUsers.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ym, v]) => ({ yearMonth: ym, new: v.new, returning: v.returning }));

  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ads</div>
          <h1 className="text-2xl font-semibold tracking-tight">広告サマリー · {rr.presetLabel}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {rr.current.start} 〜 {rr.current.end}
            {rr.previous && (
              <span className="ml-2">
                · {rr.compareLabel}: {rr.previous.start} 〜 {rr.previous.end}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            最終取得 {fetchedAtLabel}
            {isMock && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">MOCK</span>}
          </div>
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      {/* Period KPIs with comparison */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigKpiCard
          label="Spend"
          value={fmtJpy(curTotals.cost)}
          lowerIsBetter
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(curTotals.cost, prevTotals.cost) }] : []}
        />
        <BigKpiCard
          label="媒体CV"
          value={fmtInt(curTotals.conversions)}
          comparisons={
            rr.previous ? [{ label: rr.compareLabel, delta: pct(curTotals.conversions, prevTotals.conversions) }] : []
          }
        />
        <BigKpiCard
          label="売上"
          value={fmtJpy(curTotals.conversionValue)}
          comparisons={
            rr.previous
              ? [{ label: rr.compareLabel, delta: pct(curTotals.conversionValue, prevTotals.conversionValue) }]
              : []
          }
        />
        <BigKpiCard
          label="ROAS"
          value={fmtRatioPct(curTotals.roasPct, 0)}
          comparisons={
            rr.previous && curTotals.roasPct != null && prevTotals.roasPct != null
              ? [{ label: rr.compareLabel, delta: pct(curTotals.roasPct, prevTotals.roasPct) }]
              : []
          }
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">媒体別サマリ</h2>
        <MediaTable rows={mediaRows} targetRoasPct={client.monthlyTargets.roasPct} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">日次推移（Spend / CV）</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrendChart data={series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">新規 vs リピート Users（過去6ヶ月・参考）</CardTitle>
          </CardHeader>
          <CardContent>
            <NewVsRepeatChart data={newVsRepeat} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
