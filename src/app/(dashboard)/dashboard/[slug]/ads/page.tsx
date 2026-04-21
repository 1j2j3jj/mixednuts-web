import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import { getGa4MonthlyChannels } from "@/lib/sources/ga4";
import MediaTable, { type MediaRow } from "@/components/dashboard/MediaTable";
import DiffMiniChart from "@/components/dashboard/DiffMiniChart";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import RefreshButton from "@/components/dashboard/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDate, filterByRange } from "@/lib/metrics";

/**
 * Screen 2 — Ads summary.
 *
 * Uses the Sheet-backed raw as the ad-side source of truth, and GA4 mock as
 * the site-side source. The MediaTable deliberately shows both CV counts
 * plus a diff column; the mini chart plots diff over time so spikes (a
 * signal for measurement drift) are visible without being alarming.
 */
export const dynamic = "force-dynamic";

/** Synthesize a GA4-side CV count per media by applying a plausible ratio to
 *  the ad-side CV. Real implementation reads the GA4 source/medium report. */
function fakeGa4CvPerMedia(media: string, adsCv: number): number {
  const ratio: Record<string, number> = {
    Google: 0.92,
    Microsoft: 0.88,
    Yahoo: 0.85,
    meta: 1.04, // meta often over-reports vs GA4 — here we flip the sign
  };
  return Math.round(adsCv * (ratio[media] ?? 0.9));
}

export default async function AdsScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await assertUserCanAccessClientBySlug(slug);

  const { rows, fetchedAt, isMock } = await getDailyRows(client);

  // Window: last 28 days from the max date in the data.
  const allDates = rows.map((r) => r.date).filter(Boolean).sort();
  const maxDate = allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const start = (() => {
    const d = new Date(`${maxDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 27);
    return d.toISOString().slice(0, 10);
  })();
  const windowRows = filterByRange(rows, start, maxDate);

  // Aggregate by media.
  const byMedia = new Map<string, DailyRow[]>();
  for (const r of windowRows) {
    const list = byMedia.get(r.media) ?? [];
    list.push(r);
    byMedia.set(r.media, list);
  }
  const mediaRows: MediaRow[] = Array.from(byMedia.entries()).map(([media, list]) => {
    const tot = list.reduce(
      (s, r) => ({
        spend: s.spend + r.cost,
        impressions: s.impressions + r.impressions,
        clicks: s.clicks + r.clicks,
        adsCv: s.adsCv + r.conversions,
        conversionValue: s.conversionValue + r.conversionValue,
      }),
      { spend: 0, impressions: 0, clicks: 0, adsCv: 0, conversionValue: 0 }
    );
    return {
      media,
      ...tot,
      ga4Cv: fakeGa4CvPerMedia(media, tot.adsCv),
    };
  });

  // Diff mini chart: daily (adsCv − ga4Cv totals across all media).
  const dailyAll = aggregateByDate(windowRows);
  const diffSeries = dailyAll.map((p) => ({
    date: p.date,
    adsCv: p.conversions,
    ga4Cv: Math.round(p.conversions * 0.9), // fake ga4 cv at 0.9x ratio for the sample
  }));

  // Daily trend (reuse existing component — cost + CV).
  const series = dailyAll;

  // New vs repeat: pull the last 6 months from GA4 mock and sum across channels.
  const ga4 = getGa4MonthlyChannels(client);
  const byMonthUsers = new Map<string, { new: number; returning: number }>();
  for (const r of ga4) {
    const cur = byMonthUsers.get(r.yearMonth) ?? { new: 0, returning: 0 };
    cur.new += r.newUsers;
    cur.returning += r.returningUsers;
    byMonthUsers.set(r.yearMonth, cur);
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
          <h1 className="text-2xl font-semibold tracking-tight">広告サマリー</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            期間: {start} 〜 {maxDate}（直近28日）
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

      {/* Media table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">媒体別サマリ</h2>
        <MediaTable rows={mediaRows} targetRoasPct={client.monthlyTargets.roasPct} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">媒体CV − GA4 CV 差分推移</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffMiniChart data={diffSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">新規 vs リピート Users（過去6ヶ月）</CardTitle>
          </CardHeader>
          <CardContent>
            <NewVsRepeatChart data={newVsRepeat} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">日次推移（Spend / CV）</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyTrendChart data={series} />
        </CardContent>
      </Card>
    </div>
  );
}
