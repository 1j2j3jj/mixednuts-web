import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import { resolveFromSearchParams } from "@/lib/range";
import { filterByRange } from "@/lib/metrics";
import DrillFilters from "@/components/dashboard/DrillFilters";
import DrillTable, { type DrillRow } from "@/components/dashboard/DrillTable";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function aggregate(rows: DailyRow[], granularity: "day" | "week" | "month", level: Level): DrillRow[] {
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
    };
    cur.spend += r.cost;
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.conversions += r.conversions;
    cur.conversionValue += r.conversionValue;
    map.set(id, cur);
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

  const table = aggregate(filtered, granularity, level);

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
            targetRoasPct={client.monthlyTargets.roasPct}
            targetCpa={client.monthlyTargets.cpa}
          />
        </CardContent>
      </Card>
    </div>
  );
}
