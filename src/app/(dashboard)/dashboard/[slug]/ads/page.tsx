import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import { getGa4MonthlyChannels, getGa4PaidCampaigns, type Ga4CampaignRow } from "@/lib/sources/ga4";
import { getTargetsForMonth } from "@/lib/sources/target";
import { resolveFromSearchParams, type DateRange } from "@/lib/range";
import MediaTable, { type MediaRow } from "@/components/dashboard/MediaTable";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import FunnelChart from "@/components/dashboard/FunnelChart";
import SourceToggle from "@/components/dashboard/SourceToggle";
import { readSource } from "@/lib/source";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { lastN } from "@/lib/analysis";
import { fmtInt, fmtJpy, fmtRatioPct, safeDiv } from "@/lib/utils";

/**
 * Screen 2 — Ads summary.
 *
 * Range-aware. Compares selected window vs previous-window (or prior-year
 * equivalent) via the picker. Media table totals reflect the current window.
 */
export const dynamic = "force-dynamic";

/** Sum GA4 paid-campaign rows per internal media. */
function ga4TotalsByMedia(rows: Ga4CampaignRow[]): Map<string, { sessions: number; conversions: number; revenue: number }> {
  const m = new Map<string, { sessions: number; conversions: number; revenue: number }>();
  for (const r of rows) {
    const cur = m.get(r.media) ?? { sessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    m.set(r.media, cur);
  }
  return m;
}

/** Sum GA4 paid-campaign rows per day (all media). */
function ga4DailyTotals(rows: Ga4CampaignRow[]): Map<string, { conversions: number; revenue: number }> {
  const m = new Map<string, { conversions: number; revenue: number }>();
  for (const r of rows) {
    if (!r.date) continue;
    const cur = m.get(r.date) ?? { conversions: 0, revenue: 0 };
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    m.set(r.date, cur);
  }
  return m;
}

function pct(a: number, b: number): number | null {
  if (b === 0) return null;
  return (a - b) / b;
}

/** Sum GA4 monthly rows whose yearMonth overlaps the [start, end] range. */
function filterGa4ByRange<T extends { yearMonth: string }>(rows: T[], r: DateRange): T[] {
  return rows.filter((x) => {
    const monthStart = `${x.yearMonth}-01`;
    const [y, m] = x.yearMonth.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return monthStart <= r.end && monthEnd >= r.start;
  });
}

function ga4RevenueAndCv(
  rows: Array<{ yearMonth: string; revenue: number; conversions: number }>,
  range: DateRange
): { revenue: number; conversions: number } {
  let revenue = 0;
  let conversions = 0;
  for (const r of filterGa4ByRange(rows, range)) {
    revenue += r.revenue;
    conversions += r.conversions;
  }
  return { revenue, conversions };
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
  const source = readSource(sp);
  const client = await assertUserCanAccessClientBySlug(slug);

  const { rows, fetchedAt, isMock } = await getDailyRows(client);
  const allDates = rows.map((r) => r.date).filter(Boolean).sort();
  const anchor = allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);

  const rr = resolveFromSearchParams(sp, { preset: "last28", compare: "prev" }, anchor);

  const cur = filterByRange(rows, rr.current.start, rr.current.end);
  const prev = rr.previous ? filterByRange(rows, rr.previous.start, rr.previous.end) : [];
  const curTotals = sumRows(cur);
  const prevTotals = sumRows(prev);

  // Top-level KPIs prefer GA4 for Revenue / ROAS (site-side truth). The
  // media table stays ad-platform side because only that source breaks out
  // per-media. Differences between the two are expected (attribution).
  const ga4All = await getGa4MonthlyChannels(client);
  const curGa4 = ga4RevenueAndCv(ga4All, rr.current);
  const prevGa4 = rr.previous ? ga4RevenueAndCv(ga4All, rr.previous) : { revenue: 0, conversions: 0 };
  const curGa4RoasPct = curTotals.cost > 0 ? (curGa4.revenue / curTotals.cost) * 100 : null;
  const prevGa4RoasPct =
    rr.previous && prevTotals.cost > 0 ? (prevGa4.revenue / prevTotals.cost) * 100 : null;

  // Pull GA4 paid-campaign data for the same window so the media table can
  // JOIN real GA4 CV / Revenue per media (not a fake 0.9x multiplier).
  const ga4Campaigns = await getGa4PaidCampaigns(client, rr.current.start, rr.current.end);
  const ga4MediaTot = ga4TotalsByMedia(ga4Campaigns);
  const ga4DailyTot = ga4DailyTotals(ga4Campaigns);

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
        ga4Revenue: 0,
      };
      c.spend += r.cost;
      c.impressions += r.impressions;
      c.clicks += r.clicks;
      c.adsCv += r.conversions;
      c.conversionValue += r.conversionValue;
      map.set(r.media, c);
    }
    return Array.from(map.values()).map((m) => {
      const g = ga4MediaTot.get(m.media);
      return {
        ...m,
        ga4Cv: g ? Math.round(g.conversions) : 0,
        ga4Revenue: g ? g.revenue : 0,
      };
    });
  }
  const mediaRows = byMedia(cur);

  const tgt = await getTargetsForMonth(client, anchor.slice(0, 7));

  const series = aggregateByDate(cur);

  // Sparklines: last 14 buckets. Dates paired for tooltip.
  const series14 = lastN(series, 14);
  const dates14 = series14.map((d) => d.date);
  const spend14 = series14.map((d) => d.cost);
  // CV / Revenue series switches per source so the sparkline matches the KPI.
  const cv14 = series14.map((d) =>
    source === "ga4" ? ga4DailyTot.get(d.date)?.conversions ?? 0 : d.conversions
  );
  const rev14 = series14.map((d) =>
    source === "ga4" ? ga4DailyTot.get(d.date)?.revenue ?? 0 : d.conversionValue
  );
  const roas14 = series14.map((d) => {
    const rev = source === "ga4" ? ga4DailyTot.get(d.date)?.revenue ?? 0 : d.conversionValue;
    return d.cost > 0 ? (rev / d.cost) * 100 : 0;
  });

  // Funnel uses ad-side counts through CV, then GA4 revenue for the final
  // stage so the shown ¥ matches the GA4-based top-KPI card above.
  const funnelStages: Array<{ label: string; value: number; format?: "int" | "jpy" }> = [
    { label: "Impressions", value: curTotals.impressions },
    { label: "Clicks", value: curTotals.clicks },
    { label: "Conversions", value: curTotals.conversions },
    { label: "Revenue (GA4)", value: curGa4.revenue, format: "jpy" },
  ];

  // New vs repeat, past 6 months from GA4 mock (context, not range-filtered).
  const byMonthUsers = new Map<string, { new: number; returning: number }>();
  for (const r of ga4All) {
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
          <PrintButton />
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      {/* Period KPIs with comparison + sparkline */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigKpiCard
          label="Spend"
          value={fmtJpy(curTotals.cost)}
          lowerIsBetter
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(curTotals.cost, prevTotals.cost) }] : []}
          sparkline={spend14}
          sparkDates={dates14}
          sparkFormat="jpy"
          sparkTone="negative"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA4 CV" : "媒体CV"}
          value={fmtInt(source === "ga4" ? curGa4.conversions : curTotals.conversions)}
          comparisons={
            rr.previous
              ? [
                  {
                    label: rr.compareLabel,
                    delta: pct(
                      source === "ga4" ? curGa4.conversions : curTotals.conversions,
                      source === "ga4" ? prevGa4.conversions : prevTotals.conversions
                    ),
                  },
                ]
              : []
          }
          sparkline={cv14}
          sparkDates={dates14}
          sparkFormat="int"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA4 売上" : "媒体売上"}
          value={fmtJpy(source === "ga4" ? curGa4.revenue : curTotals.conversionValue)}
          comparisons={
            rr.previous
              ? [
                  {
                    label: rr.compareLabel,
                    delta: pct(
                      source === "ga4" ? curGa4.revenue : curTotals.conversionValue,
                      source === "ga4" ? prevGa4.revenue : prevTotals.conversionValue
                    ),
                  },
                ]
              : []
          }
          sparkline={rev14}
          sparkDates={dates14}
          sparkFormat="jpy"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA4 ROAS" : "媒体ROAS"}
          value={fmtRatioPct(
            source === "ga4" ? curGa4RoasPct : curTotals.roasPct,
            0
          )}
          comparisons={
            rr.previous
              ? [
                  {
                    label: rr.compareLabel,
                    delta:
                      source === "ga4"
                        ? curGa4RoasPct != null && prevGa4RoasPct != null
                          ? pct(curGa4RoasPct, prevGa4RoasPct)
                          : null
                        : curTotals.roasPct != null && prevTotals.roasPct != null
                        ? pct(curTotals.roasPct, prevTotals.roasPct)
                        : null,
                  },
                ]
              : []
          }
          sparkline={roas14}
          sparkDates={dates14}
          sparkFormat="pct"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">媒体別サマリ</h2>
          <SourceToggle />
        </div>
        <MediaTable rows={mediaRows} targetRoasPct={tgt.roasPct} source={source} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ファネル（Imp → Click → CV → 売上）</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnelStages} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">日次推移（Spend / CV）</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrendChart data={series} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">新規 vs リピート Users（過去6ヶ月・参考）</CardTitle>
        </CardHeader>
        <CardContent>
          <NewVsRepeatChart data={newVsRepeat} />
        </CardContent>
      </Card>
    </div>
  );
}
