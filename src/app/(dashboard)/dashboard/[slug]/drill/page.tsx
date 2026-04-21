import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import DrillFilters from "@/components/dashboard/DrillFilters";
import DrillTable, { type DrillRow } from "@/components/dashboard/DrillTable";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import RefreshButton from "@/components/dashboard/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Screen 3 — Drilldown.
 *
 * Hierarchy: 媒体 → CPN → ADG → KW/商品. Phase 1 sample: we only have media
 * and campaign from the raw sheet, so ADG / KW are rendered via synthetic
 * sub-rows when a campaign is selected. Real drilldown arrives when the
 * master sheet + Google Ads search-term API are wired in Phase 2.
 */
export const dynamic = "force-dynamic";

function bucketKey(date: string, granularity: "day" | "week" | "month"): string {
  if (granularity === "day") return date;
  if (granularity === "month") return date.slice(0, 7);
  // week: ISO-ish "YYYY-Www" by Monday
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Always aggregate by (classification × bucket) so every row has a date.
 * Classification switches based on which filters are active:
 *   - no filter          → media
 *   - media filter       → campaign
 *   - campaign filter    → campaign (single one, so effectively the bucket)
 */
function aggregateByBucket(
  rows: DailyRow[],
  granularity: "day" | "week" | "month",
  level: "media" | "campaign"
): DrillRow[] {
  const map = new Map<string, DrillRow>();
  for (const r of rows) {
    const bucket = bucketKey(r.date, granularity);
    let key: string;
    let subKey: string | undefined;
    if (level === "media") {
      key = r.media;
    } else {
      key = r.campaignName || r.campaignId;
      subKey = r.campaignId;
    }
    const id = `${key}|${bucket}`;
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

  const mediaFilter = sp.media ?? "";
  const campaignFilter = sp.campaign ?? "";
  const bgFilter = sp.bg ?? "";
  const granularity = (sp.g as "day" | "week" | "month" | undefined) ?? "day";

  let filtered = rows;
  if (mediaFilter) filtered = filtered.filter((r) => r.media === mediaFilter);
  if (campaignFilter) filtered = filtered.filter((r) => r.campaignId === campaignFilter);
  if (bgFilter) filtered = filtered.filter((r) => r.brandGeneral === bgFilter);

  // When media (or campaign) is filtered we classify by campaign; otherwise by
  // media. Bucketing by the granularity toggle is orthogonal — always applied.
  const level: "media" | "campaign" = mediaFilter || campaignFilter ? "campaign" : "media";
  const table = aggregateByBucket(filtered, granularity, level);

  // Filter options
  const medias = Array.from(new Set(rows.map((r) => r.media))).sort();
  const campaigns = Array.from(
    new Map(rows.map((r) => [r.campaignId, { id: r.campaignId, name: r.campaignName, media: r.media }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // CSV payload — export current filtered table rows flat with resolved metrics.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Drilldown</div>
          <h1 className="text-2xl font-semibold tracking-tight">フィルター詳細</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            階層: 媒体 → キャンペーン → 期間（フィルタで掘り下げ）
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
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      <DrillFilters slug={slug} medias={medias} campaigns={campaigns} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {level === "media" ? "媒体 × " : "キャンペーン × "}
            {granularity === "day" ? "日" : granularity === "week" ? "週" : "月"}
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
