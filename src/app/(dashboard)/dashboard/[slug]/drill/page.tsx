import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import {
  getGa4PaidCampaigns,
  getGa4GoogleAdgroups,
  type Ga4CampaignRow,
  type Ga4AdgroupRow,
} from "@/lib/sources/ga4";
import { getTargetsForMonth } from "@/lib/sources/target";
import type { MonthlyTargets } from "@/config/clients";
import { resolveFromSearchParams } from "@/lib/range";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { lastN } from "@/lib/analysis";
import DrillFilters from "@/components/dashboard/DrillFilters";
import DrillTable from "@/components/dashboard/DrillTable";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import {
  type Level,
  bucketKey,
  resolveDrillScope,
  buildJoin,
  aggregateDrillRows,
  sortDrillRows,
  paginateDrillRows,
} from "@/lib/dashboard/drill-shared";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import FunnelChart from "@/components/dashboard/FunnelChart";
import MockBanner from "@/components/dashboard/MockBanner";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import SourceToggle from "@/components/dashboard/SourceToggle";
import PageHeader from "@/components/dashboard/PageHeader";
import { readSource } from "@/lib/source";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtInt, fmtJpy, fmtRatioPct } from "@/lib/utils";
import { fmtJstTime } from "@/lib/datetime";

/**
 * Screen 3 — Drilldown. Cascade: 媒体 → キャンペーン → 広告グループ. Aggregation
 * is always grouped by (level × bucket) so every row carries a date.
 *
 * Level is decided by the deepest active filter:
 *   no filter        → media
 *   media filter     → campaign
 *   + campaign       → adgroup
 *   + adgroup        → bucket (single series)
 */
export const dynamic = "force-dynamic";
// Allow up to 60s (Vercel default 30s was a timeout risk for the parallel
// BQ/GA4/Sheets fetches on cold cache — 監査#11). Within Hobby/Pro limits.
export const maxDuration = 60;

// bucketKey / Level / JoinKeys / the aggregate() function moved to
// @/lib/dashboard/drill-shared.ts (2026-07-26, G-3 payload fix) so the CSV
// export route (drill/export/route.ts) can compute the identical `table`
// via the identical functions, fed by an independently-fetched but
// identically-shaped input. See that file's doc comment.

export default async function DrillScreen({
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

  const { rows, fetchedAt, isMock } = await getDailyRows(client, sp);

  const allDates = rows
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  const anchor =
    allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const rr = resolveFromSearchParams(
    sp,
    { preset: "thisMonth", compare: "none" },
    anchor,
  );

  // Facet filters + cascade level + GA4 scope sets — shared with the CSV
  // export route so both compute the identical scope from identical inputs
  // (@/lib/dashboard/drill-shared.ts resolveDrillScope, moved verbatim from
  // this file 2026-07-26).
  const scope = resolveDrillScope(rows, rr, sp);
  const {
    filtered,
    level,
    granularity,
    scopeMedia,
    scopeCampaignKeys,
    scopeAdgroupIds,
    isGoogleOnlyScope,
    needAdgroupData,
  } = scope;
  const mediaFilter = scope.mediaFilter;
  const campaignFilter = scope.campaignFilter;
  const adgroupFilter = scope.adgroupFilter;

  // Fetch GA4 data. Current + previous windows in parallel so KPI deltas are
  // real (prev was hardcoded 0 before, making GA4 deltas meaningless).
  // getGa4PaidCampaigns / getGa4GoogleAdgroups return a Ga4Result<T> envelope
  // ({rows, isMock, warnings}) — unwrap .rows for the array below.
  const [
    ga4CampaignsRes,
    ga4AdgroupsRes,
    ga4CampaignsPrevRes,
    ga4AdgroupsPrevRes,
  ] = await Promise.all([
    getGa4PaidCampaigns(client, rr.current.start, rr.current.end),
    needAdgroupData
      ? getGa4GoogleAdgroups(client, rr.current.start, rr.current.end)
      : Promise.resolve({
          rows: [] as Ga4AdgroupRow[],
          isMock: false,
          warnings: [],
        }),
    rr.previous
      ? getGa4PaidCampaigns(client, rr.previous.start, rr.previous.end)
      : Promise.resolve({
          rows: [] as Ga4CampaignRow[],
          isMock: false,
          warnings: [],
        }),
    rr.previous && needAdgroupData
      ? getGa4GoogleAdgroups(client, rr.previous.start, rr.previous.end)
      : Promise.resolve({
          rows: [] as Ga4AdgroupRow[],
          isMock: false,
          warnings: [],
        }),
  ]);
  const ga4Campaigns = ga4CampaignsRes.rows;
  const ga4Adgroups = ga4AdgroupsRes.rows;
  const ga4CampaignsPrev = ga4CampaignsPrevRes.rows;
  const ga4AdgroupsPrev = ga4AdgroupsPrevRes.rows;

  // Apply cascade scope to GA4 rows. For Google + ADG filter we further
  // restrict to ga4Adgroups (the only source with ADG-level grain). For
  // non-Google ADG filter GA4 can at best answer at campaign grain, so we
  // fall back to campaign scope with the same (media+campaign) filter.
  function scopeGa4Campaigns(list: Ga4CampaignRow[]): Ga4CampaignRow[] {
    let l = list;
    if (scopeMedia.size > 0) l = l.filter((g) => scopeMedia.has(g.media));
    if (campaignFilter) l = l.filter((g) => scopeCampaignKeys.has(g.matchKey));
    return l;
  }
  function scopeGa4Adgroups(list: Ga4AdgroupRow[]): Ga4AdgroupRow[] {
    if (!adgroupFilter) return list;
    return list.filter((g) => scopeAdgroupIds.has(g.adgroupId));
  }
  const curGa4CampaignsScoped = scopeGa4Campaigns(ga4Campaigns);
  const prevGa4CampaignsScoped = scopeGa4Campaigns(ga4CampaignsPrev);
  const curGa4AdgroupsScoped = scopeGa4Adgroups(ga4Adgroups);
  const prevGa4AdgroupsScoped = scopeGa4Adgroups(ga4AdgroupsPrev);

  // Bucket the GA4 daily rows into (identifier|bucket) → totals, then
  // aggregate the table — shared with the CSV export route (buildJoin /
  // aggregateDrillRows in @/lib/dashboard/drill-shared.ts) so both compute
  // the identical `table` via the identical functions.
  const join = buildJoin(ga4Campaigns, ga4Adgroups, granularity);
  const table = aggregateDrillRows(filtered, granularity, level, join);

  // Windowing (G-3b, 2026-07-26): `table` above is still the COMPLETE
  // aggregated (entity × bucket) row set — CSV export, the row-count badge,
  // and sort all still operate on every row. Only the ON-SCREEN render is
  // bounded: the full set is sorted ONCE here (sortDrillRows — date desc,
  // then spend desc), then sliced into one page (paginateDrillRows). This
  // is what fixed drill's ~19MB HTML/RSC-payload at deep filters (measured:
  // hs `?preset=last12m&media=Google`, 3,193 rows) without capping what a
  // client can reach — every row is still one Prev/Next click away, and
  // CsvExportButton's href (below) still exports every row regardless of
  // which page is on screen. See @/lib/dashboard/drill-shared.ts's module
  // doc and projects/mixednuts-web/_reports/
  // 2026-07-26_dashboard-performance-budget.md.
  const drillPage = paginateDrillRows(sortDrillRows(table), sp.dpage);

  // P2-1: colour-code ROAS/CPA against each row's own month, not a single
  // anchor-month target. week/month granularity buckets can straddle two
  // calendar months (e.g. a week bucket starting 2026-06-29 spans into
  // July) — row.date is sliced to its first 7 chars ("YYYY-MM") as the
  // month key, which for week buckets means the bucket's *start* month.
  // getTargetsForMonth resolves from the upload SoT (targets_long →
  // targets_monthly) only; unset fields are null. A resolved target with
  // roasPct/cpa null or <=0 is treated as "no configured target for this
  // month" and gets no colour (see targetsForRow in DrillTable).
  const rowMonths = Array.from(
    new Set(table.map((r) => r.date.slice(0, 7)).filter(Boolean)),
  );
  if (rowMonths.length === 0) rowMonths.push(anchor.slice(0, 7));
  const targetsEntries = await Promise.all(
    rowMonths.map(async (ym): Promise<[string, MonthlyTargets]> => [
      ym,
      await getTargetsForMonth(client, ym),
    ]),
  );
  const targetsByMonth = new Map<string, MonthlyTargets>(targetsEntries);
  const tgt =
    targetsByMonth.get(anchor.slice(0, 7)) ??
    (await getTargetsForMonth(client, anchor.slice(0, 7)));
  // tgt is always resolved for the LATEST-data month (anchor), not
  // necessarily the selected period — a target caption is only a true
  // statement when the two coincide (mirrors Overview's showGoals gate on
  // page.tsx).
  const targetPeriodMatches =
    rr.current.start.slice(0, 7) === anchor.slice(0, 7);

  // Period KPIs (reflect the filter: facet filters narrow, so KPIs change).
  const curTotals = sumRows(filtered);
  const prevFilteredAll = rr.previous
    ? filterByRange(rows, rr.previous.start, rr.previous.end)
    : [];
  let prevFiltered = prevFilteredAll;
  if (mediaFilter)
    prevFiltered = prevFiltered.filter((r) => r.media === mediaFilter);
  if (campaignFilter)
    prevFiltered = prevFiltered.filter((r) => r.campaignId === campaignFilter);
  if (adgroupFilter)
    prevFiltered = prevFiltered.filter((r) => r.adgroupId === adgroupFilter);
  const prevTotals = sumRows(prevFiltered);

  const pct = (a: number, b: number): number | null =>
    b === 0 ? null : (a - b) / b;
  /** Achievement percentage for a "目標 X の Y%" KPI caption (Q1, spec §2.1). */
  const pctOfTarget = (actual: number, target: number): number =>
    target > 0 ? Math.round((actual / target) * 100) : 0;

  // GA4-side totals for the current/previous window, scoped by the cascade
  // filter. For Google + ADG filter we use the ADG-grained source
  // (ga4Adgroups); otherwise the campaign-grained source scoped by
  // (media+campaign). For non-Google ADG filter the ADG-level GA4 number is
  // not retrievable (GA4 only exposes ADG for Google Ads), so we show the
  // campaign-level total — an honest upper bound — with a disclaimer.
  function sumGa4Campaigns(list: Ga4CampaignRow[]): {
    conversions: number;
    revenue: number;
  } {
    let c = 0,
      r = 0;
    for (const row of list) {
      c += row.conversions;
      r += row.revenue;
    }
    return { conversions: c, revenue: r };
  }
  function sumGa4Adgroups(list: Ga4AdgroupRow[]): {
    conversions: number;
    revenue: number;
  } {
    let c = 0,
      r = 0;
    for (const row of list) {
      c += row.conversions;
      r += row.revenue;
    }
    return { conversions: c, revenue: r };
  }
  const useAdgGa4 = !!adgroupFilter && isGoogleOnlyScope;
  const ga4ApproxNonGoogleAdg = !!adgroupFilter && !isGoogleOnlyScope;
  const curGa4 = useAdgGa4
    ? sumGa4Adgroups(curGa4AdgroupsScoped)
    : sumGa4Campaigns(curGa4CampaignsScoped);
  const prevGa4 = useAdgGa4
    ? sumGa4Adgroups(prevGa4AdgroupsScoped)
    : sumGa4Campaigns(prevGa4CampaignsScoped);
  const curGa4RoasPct =
    curTotals.cost > 0 ? (curGa4.revenue / curTotals.cost) * 100 : null;
  const prevGa4RoasPct =
    rr.previous && prevTotals.cost > 0
      ? (prevGa4.revenue / prevTotals.cost) * 100
      : null;

  // Trend series — bucketed by the same granularity as the table, so the
  // chart and the table agree on their x-axis.
  const trendMap = new Map<
    string,
    {
      date: string;
      cost: number;
      conversions: number;
      conversionValue: number;
      clicks: number;
    }
  >();
  for (const r of filtered) {
    const bucket = bucketKey(r.date, granularity);
    const cur = trendMap.get(bucket) ?? {
      date: bucket,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      clicks: 0,
    };
    cur.cost += r.cost;
    cur.conversions += r.conversions;
    cur.conversionValue += r.conversionValue;
    cur.clicks += r.clicks;
    trendMap.set(bucket, cur);
  }
  const series = Array.from(trendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Sparklines: daily, with dates for hover tooltip. CV/Revenue switch per
  // source so the sparkline matches the Big KPI card above it.
  const dailySeries = aggregateByDate(filtered);
  const daily14 = lastN(dailySeries, 14);
  const sparkDates = daily14.map((d) => d.date);
  const spend14 = daily14.map((d) => d.cost);

  // Build a GA4 daily totals map from the scoped data so the sparkline
  // respects the cascade filter exactly like the Big KPI card does.
  const ga4DailyMap = new Map<
    string,
    { conversions: number; revenue: number }
  >();
  const ga4DailySource: Array<{
    date: string;
    conversions: number;
    revenue: number;
  }> = useAdgGa4 ? curGa4AdgroupsScoped : curGa4CampaignsScoped;
  for (const g of ga4DailySource) {
    if (!g.date) continue;
    const cur = ga4DailyMap.get(g.date) ?? { conversions: 0, revenue: 0 };
    cur.conversions += g.conversions;
    cur.revenue += g.revenue;
    ga4DailyMap.set(g.date, cur);
  }
  const cv14 = daily14.map((d) =>
    source === "ga4"
      ? (ga4DailyMap.get(d.date)?.conversions ?? 0)
      : d.conversions,
  );
  const rev14 = daily14.map((d) =>
    source === "ga4"
      ? (ga4DailyMap.get(d.date)?.revenue ?? 0)
      : d.conversionValue,
  );
  const roas14 = daily14.map((d) => {
    const rev =
      source === "ga4"
        ? (ga4DailyMap.get(d.date)?.revenue ?? 0)
        : d.conversionValue;
    return d.cost > 0 ? (rev / d.cost) * 100 : 0;
  });

  // Funnel respects the source toggle. Impressions/Clicks always come from
  // the ad platform (GA4 has no ad-side impression metric); CV and Revenue
  // switch per toggle. GA4 values use the same scoped totals as Big KPI.
  const funnelCv =
    source === "ga4" ? curGa4.conversions : curTotals.conversions;
  const funnelRevenue =
    source === "ga4" ? curGa4.revenue : curTotals.conversionValue;
  const funnelStages: Array<{
    label: string;
    value: number;
    format?: "int" | "jpy";
  }> = [
    { label: "Impressions", value: curTotals.impressions },
    { label: "Clicks", value: curTotals.clicks },
    { label: source === "ga4" ? "GA_CV" : "媒体CV", value: funnelCv },
    {
      label: source === "ga4" ? "GA売上" : "媒体売上",
      value: funnelRevenue,
      format: "jpy",
    },
  ];

  // Facet option sources (unfiltered rows within the range, so options reflect
  // what is actually selectable in this window).
  const rangeRows = filterByRange(rows, rr.current.start, rr.current.end);
  const medias = Array.from(new Set(rangeRows.map((r) => r.media))).sort();
  const campaigns = Array.from(
    new Map(
      rangeRows.map((r) => [
        r.campaignId,
        { id: r.campaignId, name: r.campaignName, media: r.media },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const adgroups = Array.from(
    new Map(
      rangeRows
        .filter((r) => r.adgroupId)
        .map((r) => [
          r.adgroupId,
          { id: r.adgroupId, name: r.adgroupName, campaignId: r.campaignId },
        ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  // CSV export (G-3 payload fix, 2026-07-26): the export button no longer
  // receives `table` as a client-component prop — the full row set used to
  // be re-serialized whole into the page's RSC hydration payload here
  // (verified up to 19.9MB HTML at deep drill/long-period filters, see
  // _reports/2026-07-24_dashboard-phaseA-defect-ledger.md G-3 measurement).
  // CsvExportButton now links to a route handler
  // (drill/export/route.ts) that recomputes the exact same `table` from the
  // same searchParams via the shared functions in
  // @/lib/dashboard/drill-shared.ts and streams the CSV directly — nothing
  // client-side needs the row data at all. Forward every search param the
  // page itself resolved from (facet filters, granularity, preset/cmp/
  // start/end) so the export matches what's on screen exactly.
  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v !== undefined) exportParams.set(k, v);
  }
  const exportHref = `/dashboard/${slug}/drill/export?${exportParams.toString()}`;

  const fetchedAtLabel = fmtJstTime(fetchedAt);

  const levelLabel =
    level === "media"
      ? "媒体"
      : level === "campaign"
        ? "キャンペーン"
        : level === "adgroup"
          ? "広告グループ"
          : "期間のみ";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <MockBanner isMock={isMock} />
        <PageHeader
          kicker="フィルター詳細"
          title={<>フィルター詳細 · {rr.presetLabel}</>}
          subtitle={
            <>
              {rr.current.start} 〜 {rr.current.end} · 階層: 媒体 → キャンペーン
              → 広告グループ
            </>
          }
          controls={
            <>
              <div className="text-xs text-muted-foreground">
                最終取得 {fetchedAtLabel}
              </div>
              <CsvExportButton
                filename={`drill-${slug}-${new Date().toISOString().slice(0, 10)}.csv`}
                href={exportHref}
              />
              <PrintButton />
              <RefreshButton clientId={client.id} />
            </>
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DrillFilters
          slug={slug}
          medias={medias}
          campaigns={campaigns}
          adgroups={adgroups}
        />
        <SourceToggle />
      </div>

      {/* Period KPIs with 4 sparklines + hover date tooltip */}
      <div className="kpi-card-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigKpiCard
          label="COST"
          value={fmtJpy(curTotals.cost)}
          caption={
            targetPeriodMatches &&
            tgt.adSpendBudget != null &&
            tgt.adSpendBudget > 0
              ? `予算 ${fmtJpy(tgt.adSpendBudget)} の ${pctOfTarget(curTotals.cost, tgt.adSpendBudget)}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtJpy(prevTotals.cost)}`
                : "比較対象なし"
          }
          lowerIsBetter
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta: pct(curTotals.cost, prevTotals.cost),
                }
              : undefined
          }
          sparkline={spend14}
          sparkDates={sparkDates}
          sparkFormat="jpy"
          sparkTone="negative"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA_CV" : "媒体CV"}
          value={fmtInt(
            source === "ga4" ? curGa4.conversions : curTotals.conversions,
          )}
          caption={
            targetPeriodMatches &&
            tgt.conversions != null &&
            tgt.conversions > 0
              ? `目標 ${fmtInt(tgt.conversions)} の ${pctOfTarget(
                  source === "ga4" ? curGa4.conversions : curTotals.conversions,
                  tgt.conversions,
                )}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtInt(
                    source === "ga4"
                      ? prevGa4.conversions
                      : prevTotals.conversions,
                  )}`
                : "比較対象なし"
          }
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta: pct(
                    source === "ga4"
                      ? curGa4.conversions
                      : curTotals.conversions,
                    source === "ga4"
                      ? prevGa4.conversions
                      : prevTotals.conversions,
                  ),
                }
              : undefined
          }
          sparkline={cv14}
          sparkDates={sparkDates}
          sparkFormat="int"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA売上" : "媒体売上"}
          value={fmtJpy(
            source === "ga4" ? curGa4.revenue : curTotals.conversionValue,
          )}
          caption={
            targetPeriodMatches && tgt.revenue != null && tgt.revenue > 0
              ? `目標 ${fmtJpy(tgt.revenue)} の ${pctOfTarget(
                  source === "ga4" ? curGa4.revenue : curTotals.conversionValue,
                  tgt.revenue,
                )}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtJpy(
                    source === "ga4"
                      ? prevGa4.revenue
                      : prevTotals.conversionValue,
                  )}`
                : "比較対象なし"
          }
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta: pct(
                    source === "ga4"
                      ? curGa4.revenue
                      : curTotals.conversionValue,
                    source === "ga4"
                      ? prevGa4.revenue
                      : prevTotals.conversionValue,
                  ),
                }
              : undefined
          }
          sparkline={rev14}
          sparkDates={sparkDates}
          sparkFormat="jpy"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA_ROAS" : "媒体ROAS"}
          value={fmtRatioPct(
            source === "ga4" ? curGa4RoasPct : curTotals.roasPct,
            0,
          )}
          caption={(() => {
            const curRoas =
              source === "ga4" ? curGa4RoasPct : curTotals.roasPct;
            const prevRoas =
              source === "ga4" ? prevGa4RoasPct : prevTotals.roasPct;
            if (
              targetPeriodMatches &&
              tgt.roasPct != null &&
              tgt.roasPct > 0 &&
              curRoas != null
            ) {
              return `目標 ${fmtRatioPct(tgt.roasPct, 0)} の ${pctOfTarget(curRoas, tgt.roasPct)}%`;
            }
            if (rr.previous && prevRoas != null) {
              return `${rr.compareLabel} ${fmtRatioPct(prevRoas, 0)}`;
            }
            return "比較対象なし";
          })()}
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta:
                    source === "ga4"
                      ? curGa4RoasPct != null && prevGa4RoasPct != null
                        ? pct(curGa4RoasPct, prevGa4RoasPct)
                        : null
                      : curTotals.roasPct != null && prevTotals.roasPct != null
                        ? pct(curTotals.roasPct, prevTotals.roasPct)
                        : null,
                }
              : undefined
          }
          sparkline={roas14}
          sparkDates={sparkDates}
          sparkFormat="pct"
        />
      </div>

      {ga4ApproxNonGoogleAdg && source === "ga4" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          注: GA4 は Google Ads 以外の ADG 粒度を提供しないため、GA_CV / GA売上
          / GA_ROAS は
          キャンペーン単位の値（上限近似）を表示しています。媒体値は広告プラットフォーム実績ベース。
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              ファネル（Imp → Click → CV → 売上）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart
              stages={funnelStages}
              absenceDetail={{
                periodLabel: `${rr.current.start} 〜 ${rr.current.end}`,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {granularity === "day"
                ? "日次"
                : granularity === "week"
                  ? "週次"
                  : "月次"}
              推移（COST / CV / CPA）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrendChart
              data={series}
              absenceDetail={{
                periodLabel: `${rr.current.start} 〜 ${rr.current.end}`,
              }}
              title={`${
                granularity === "day"
                  ? "日次"
                  : granularity === "week"
                    ? "週次"
                    : "月次"
              }推移（COST / CV / CPA）`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {levelLabel} ×{" "}
            {granularity === "day"
              ? "日"
              : granularity === "week"
                ? "週"
                : "月"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {table.length} 件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DrillTable
            rows={table}
            level={level}
            source={source}
            targetRoasPct={tgt.roasPct}
            targetCpa={tgt.cpa}
            targetsByMonth={targetsByMonth}
          />
        </CardContent>
      </Card>
    </div>
  );
}
