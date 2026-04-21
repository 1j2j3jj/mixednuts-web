import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import { getGa4PaidCampaigns, getGa4GoogleAdgroups } from "@/lib/sources/ga4";
import { getTargetsForMonth } from "@/lib/sources/target";
import { resolveFromSearchParams } from "@/lib/range";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { lastN } from "@/lib/analysis";
import DrillFilters from "@/components/dashboard/DrillFilters";
import DrillTable, { type DrillRow } from "@/components/dashboard/DrillTable";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import FunnelChart from "@/components/dashboard/FunnelChart";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtInt, fmtJpy, fmtRatioPct } from "@/lib/utils";

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

function bucketKey(date: string, granularity: "day" | "week" | "month"): string {
  if (granularity === "day") return date;
  if (granularity === "month") return date.slice(0, 7);
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

type Level = "media" | "campaign" | "adgroup" | "bucket";

interface JoinKeys {
  /** Keyed "<identifier>|<bucket>" → per-bucket GA4 totals. The identifier
   *  depends on level: media name (for media level), campaign id (for
   *  campaign level), ADG id (for adgroup level). */
  mediaByBucket: Map<string, { sessions: number; conversions: number; revenue: number }>;
  campaignByBucket: Map<string, { sessions: number; conversions: number; revenue: number }>;
  adgroupByBucket: Map<string, { sessions: number; conversions: number; revenue: number }>;
}

function aggregate(
  rows: DailyRow[],
  granularity: "day" | "week" | "month",
  level: Level,
  join: JoinKeys
): DrillRow[] {
  const map = new Map<string, DrillRow>();
  for (const r of rows) {
    const bucket = bucketKey(r.date, granularity);
    let key: string;
    let subKey: string | undefined;
    if (level === "media") {
      key = r.media;
    } else if (level === "campaign") {
      key = r.campaignName || r.campaignId;
      subKey = r.campaignId;
    } else if (level === "adgroup") {
      key = r.adgroupName || r.adgroupId || "(no adgroup)";
      subKey = r.adgroupId;
    } else {
      key = bucket;
    }
    const id = `${level}|${key}|${bucket}`;
    const cur = map.get(id) ?? {
      key,
      subKey,
      date: bucket,
      media: r.media,
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      conversionValue: 0,
      ga4Sessions: null as number | null,
      ga4Conversions: null as number | null,
      ga4Revenue: null as number | null,
    };
    cur.spend += r.cost;
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.conversions += r.conversions;
    cur.conversionValue += r.conversionValue;
    map.set(id, cur);
  }
  // Attach per-bucket GA4 totals. Key = "<identifier>|<bucket>" so the
  // JOIN is both by-identity and by-date — no more repeated window totals.
  for (const row of map.values()) {
    let hit: { sessions: number; conversions: number; revenue: number } | undefined;
    if (level === "media") {
      hit = join.mediaByBucket.get(`${row.media}|${row.date}`);
    } else if (level === "campaign" && row.subKey) {
      hit = join.campaignByBucket.get(`${row.subKey}|${row.date}`);
    } else if (level === "adgroup" && row.subKey) {
      hit = join.adgroupByBucket.get(`${row.subKey}|${row.date}`);
    }
    if (hit) {
      row.ga4Sessions = hit.sessions;
      row.ga4Conversions = hit.conversions;
      row.ga4Revenue = hit.revenue;
    }
  }
  return Array.from(map.values());
}

export default async function DrillScreen({
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
  const rr = resolveFromSearchParams(sp, { preset: "last28", compare: "none" }, anchor);

  const mediaFilter = sp.media ?? "";
  const campaignFilter = sp.campaign ?? "";
  const adgroupFilter = sp.adgroup ?? "";
  const granularity = (sp.g as "day" | "week" | "month" | undefined) ?? "day";

  // Apply range first, then facet filters.
  let filtered = filterByRange(rows, rr.current.start, rr.current.end);
  if (mediaFilter) filtered = filtered.filter((r) => r.media === mediaFilter);
  if (campaignFilter) filtered = filtered.filter((r) => r.campaignId === campaignFilter);
  if (adgroupFilter) filtered = filtered.filter((r) => r.adgroupId === adgroupFilter);

  const level: Level = adgroupFilter
    ? "bucket"
    : campaignFilter
    ? "adgroup"
    : mediaFilter
    ? "campaign"
    : "media";

  // Fetch GA4 data for JOIN. For media/campaign levels we use the paid-
  // campaign report; for adgroup we need the Google-Ads-specific ADG report.
  const [ga4Campaigns, ga4Adgroups] = await Promise.all([
    level === "media" || level === "campaign"
      ? getGa4PaidCampaigns(client, rr.current.start, rr.current.end)
      : Promise.resolve([]),
    level === "adgroup"
      ? getGa4GoogleAdgroups(client, rr.current.start, rr.current.end)
      : Promise.resolve([]),
  ]);

  // Bucket the GA4 daily rows into (identifier|bucket) → totals. For
  // week/month granularity we re-bucket GA4 days into the same bucket key
  // the ads side uses, so the two sides align exactly.
  function addTo(
    m: Map<string, { sessions: number; conversions: number; revenue: number }>,
    key: string,
    d: { sessions: number; conversions: number; revenue: number }
  ) {
    const cur = m.get(key) ?? { sessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += d.sessions;
    cur.conversions += d.conversions;
    cur.revenue += d.revenue;
    m.set(key, cur);
  }
  const join: JoinKeys = {
    mediaByBucket: new Map(),
    campaignByBucket: new Map(),
    adgroupByBucket: new Map(),
  };
  for (const g of ga4Campaigns) {
    const bucket = g.date ? bucketKey(g.date, granularity) : "";
    if (!bucket) continue;
    addTo(join.mediaByBucket, `${g.media}|${bucket}`, g);
    if (g.matchKey) addTo(join.campaignByBucket, `${g.matchKey}|${bucket}`, g);
  }
  for (const g of ga4Adgroups) {
    const bucket = g.date ? bucketKey(g.date, granularity) : "";
    if (!bucket) continue;
    if (g.adgroupId) addTo(join.adgroupByBucket, `${g.adgroupId}|${bucket}`, g);
  }

  const table = aggregate(filtered, granularity, level, join);

  const tgt = await getTargetsForMonth(client, anchor.slice(0, 7));

  // Period KPIs (reflect the filter: facet filters narrow, so KPIs change).
  const curTotals = sumRows(filtered);
  const prevFilteredAll = rr.previous ? filterByRange(rows, rr.previous.start, rr.previous.end) : [];
  let prevFiltered = prevFilteredAll;
  if (mediaFilter) prevFiltered = prevFiltered.filter((r) => r.media === mediaFilter);
  if (campaignFilter) prevFiltered = prevFiltered.filter((r) => r.campaignId === campaignFilter);
  if (adgroupFilter) prevFiltered = prevFiltered.filter((r) => r.adgroupId === adgroupFilter);
  const prevTotals = sumRows(prevFiltered);

  const pct = (a: number, b: number): number | null => (b === 0 ? null : (a - b) / b);

  // Trend series — bucketed by the same granularity as the table, so the
  // chart and the table agree on their x-axis.
  const trendMap = new Map<string, { date: string; cost: number; conversions: number; conversionValue: number; clicks: number }>();
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
  const series = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Sparklines still use daily — they're meant to be dense-and-readable.
  const dailySeries = aggregateByDate(filtered);
  const spend14 = lastN(dailySeries, 14).map((d) => d.cost);
  const cv14 = lastN(dailySeries, 14).map((d) => d.conversions);

  // Funnel for the current filter.
  const funnelStages: Array<{ label: string; value: number; format?: "int" | "jpy" }> = [
    { label: "Impressions", value: curTotals.impressions },
    { label: "Clicks", value: curTotals.clicks },
    { label: "Conversions", value: curTotals.conversions },
    { label: "Revenue", value: curTotals.conversionValue, format: "jpy" },
  ];

  // Facet option sources (unfiltered rows within the range, so options reflect
  // what is actually selectable in this window).
  const rangeRows = filterByRange(rows, rr.current.start, rr.current.end);
  const medias = Array.from(new Set(rangeRows.map((r) => r.media))).sort();
  const campaigns = Array.from(
    new Map(rangeRows.map((r) => [r.campaignId, { id: r.campaignId, name: r.campaignName, media: r.media }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const adgroups = Array.from(
    new Map(
      rangeRows
        .filter((r) => r.adgroupId)
        .map((r) => [r.adgroupId, { id: r.adgroupId, name: r.adgroupName, campaignId: r.campaignId }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const csvRows = table.map((r) => ({
    date: r.date,
    label: r.key,
    subKey: r.subKey ?? "",
    media: r.media,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    conversions: r.conversions,
    conversionValue: r.conversionValue,
  }));

  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Drilldown</div>
          <h1 className="text-2xl font-semibold tracking-tight">フィルター詳細 · {rr.presetLabel}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {rr.current.start} 〜 {rr.current.end} · 階層: 媒体 → キャンペーン → 広告グループ
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            最終取得 {fetchedAtLabel}
            {isMock && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">MOCK</span>}
          </div>
          <CsvExportButton
            filename={`drill-${slug}-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={csvRows}
          />
          <PrintButton />
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      <DrillFilters slug={slug} medias={medias} campaigns={campaigns} adgroups={adgroups} />

      {/* Period KPIs (reflect the filter) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigKpiCard
          label="Spend"
          value={fmtJpy(curTotals.cost)}
          lowerIsBetter
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(curTotals.cost, prevTotals.cost) }] : []}
          sparkline={spend14}
          sparkTone="negative"
        />
        <BigKpiCard
          label="媒体CV"
          value={fmtInt(curTotals.conversions)}
          comparisons={
            rr.previous ? [{ label: rr.compareLabel, delta: pct(curTotals.conversions, prevTotals.conversions) }] : []
          }
          sparkline={cv14}
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
            <CardTitle className="text-sm">
              {granularity === "day" ? "日次" : granularity === "week" ? "週次" : "月次"}
              推移（Spend / CV / CPA）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrendChart data={series} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {levelLabel} × {granularity === "day" ? "日" : granularity === "week" ? "週" : "月"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{table.length} 件</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DrillTable
            rows={table}
            level={level}
            targetRoasPct={tgt.roasPct}
            targetCpa={tgt.cpa}
          />
        </CardContent>
      </Card>
    </div>
  );
}
