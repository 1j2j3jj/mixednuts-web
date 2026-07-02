import { assertUserCanAccessClientBySlug } from "@/lib/access";
import {
  getRptAdg,
  getRptAll,
  getRptCpn,
  getRptDaily,
  getRptMedia,
  isRptSupported,
  RPT_SUPPORTED,
  type RptAllRow,
  type RptDailyRow,
  type RptMetrics,
} from "@/lib/sources/bq-rpt";
import { resolveFromSearchParams } from "@/lib/range";
import ReportViewTabs, {
  REPORT_VIEWS,
  type ReportViewKey,
} from "@/components/dashboard/ReportViewTabs";
import ReportTable, { type ReportTableRow } from "@/components/dashboard/ReportTable";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import CsvExportButton from "@/components/dashboard/CsvExportButton";
import PrintButton from "@/components/dashboard/PrintButton";
import RefreshButton from "@/components/dashboard/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtInt, fmtJpy, fmtRatioPct } from "@/lib/utils";

/**
 * Screen — レポート (BQ rpt_* views).
 *
 * Reads the GA × ads reconciled reporting marts ({client}_marts.rpt_*)
 * and shows the three CV layers side by side:
 *   媒体CV (ad platform) / GA_CV (GA4) / 全体CV (dozo: Shopify, hs: EC-CUBE).
 *
 * Granularity tabs: Daily / 媒体 / キャンペーン / 広告グループ (?view=).
 * Daily merges rpt_daily (ads metrics) with rpt_all daily rows (site-wide
 * GA + overall CV). Entity tabs aggregate the per-day view rows over the
 * selected window; ratios are recomputed from sums (never averaged).
 *
 * Only dozo / hs have rpt_* views — other clients get an explicit
 * "未対応" card (the nav tab is also hidden for them, defence in depth).
 */
export const dynamic = "force-dynamic";

function inRange(date: string, start: string, end: string): boolean {
  return !!date && date >= start && date <= end;
}

/** Null-preserving accumulator for the overall-CV layer: NULL means "no
 *  shop-side data yet" and must stay NULL (→ "—"), not become 0. */
function addNullable(acc: number | null, v: number | null): number | null {
  if (v == null) return acc;
  return (acc ?? 0) + v;
}

interface Bucket extends RptMetrics {
  overallCv: number | null;
  overallValue: number | null;
}

function emptyBucket(): Bucket {
  return {
    cost: 0,
    impressions: 0,
    clicks: 0,
    sessions: 0,
    mediaCv: 0,
    mediaValue: 0,
    gaCv: 0,
    gaValue: 0,
    overallCv: null,
    overallValue: null,
  };
}

function addMetrics(b: Bucket, m: RptMetrics): void {
  b.cost += m.cost;
  b.impressions += m.impressions;
  b.clicks += m.clicks;
  b.sessions += m.sessions;
  b.mediaCv += m.mediaCv;
  b.mediaValue += m.mediaValue;
  b.gaCv += m.gaCv;
  b.gaValue += m.gaValue;
}

function totalRow(rows: ReportTableRow[], label = "合計"): ReportTableRow {
  const t: ReportTableRow = { label, isTotal: true, ...emptyBucket() };
  for (const r of rows) {
    addMetrics(t as unknown as Bucket, r);
    t.overallCv = addNullable(t.overallCv, r.overallCv);
    t.overallValue = addNullable(t.overallValue, r.overallValue);
  }
  return t;
}

export default async function ReportScreen({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const client = await assertUserCanAccessClientBySlug(slug);

  if (!isRptSupported(client.id)) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Report</div>
          <h1 className="text-2xl font-semibold tracking-tight">レポート</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            このワークスペースではレポート（GA×広告 突合ビュー）は未対応です。
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = RPT_SUPPORTED[client.id];
  const view: ReportViewKey =
    REPORT_VIEWS.find((v) => v.key === sp.view)?.key ?? "daily";

  // Sequential fetches (small views; avoids parallel job bursts). rpt_daily
  // and rpt_all are always needed: anchor date + KPI cards + Daily tab.
  const dailyRes = await getRptDaily(client.id);
  const allRes = await getRptAll(client.id);
  const warnings = [...dailyRes.warnings, ...allRes.warnings];

  const allDaily = allRes.rows.filter((r) => r.granularity === "daily");
  const anchorDates = [...dailyRes.rows, ...allDaily]
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  const anchor =
    anchorDates[anchorDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const rr = resolveFromSearchParams(sp, { preset: "thisMonth", compare: "none" }, anchor);
  const { start, end } = rr.current;

  const dailyCur = dailyRes.rows.filter((r) => inRange(r.date, start, end));
  const allCur = allDaily.filter((r) => inRange(r.date, start, end));

  /* ---------------- Period KPI (window totals, tab-independent) ------- */
  const kpi = emptyBucket();
  for (const r of dailyCur) addMetrics(kpi, r);
  let kpiSiteGaCv = 0;
  let kpiSiteGaValue = 0;
  let kpiOverallCv: number | null = null;
  for (const r of allCur) {
    kpiSiteGaCv += r.gaCv;
    kpiSiteGaValue += r.gaValue;
    kpiOverallCv = addNullable(kpiOverallCv, r.overallCv);
  }
  const kpiGaRoasPct = kpi.cost > 0 ? (kpiSiteGaValue / kpi.cost) * 100 : null;

  /* ---------------- Tab rows ----------------------------------------- */
  let rows: ReportTableRow[] = [];
  let fetchedAt = Math.max(dailyRes.fetchedAt, allRes.fetchedAt);
  let labelHeader = "日付";
  let showMedia = false;
  let showBadges = false;
  let showOverall = false;
  let showOverallValue = false;
  let monoLabel = false;
  let gaGroupLabel = "GA（広告帰属）";

  if (view === "daily") {
    // Merge rpt_daily (ads side) with rpt_all daily (site GA + overall CV)
    // by date. GA columns on this tab are the site-wide GA4 numbers — this
    // is the classic daily report layout (ads block | GA block | overall).
    const byDate = new Map<string, { d?: RptDailyRow; a?: RptAllRow }>();
    for (const r of dailyCur) byDate.set(r.date, { d: r });
    for (const r of allCur) byDate.set(r.date, { ...byDate.get(r.date), a: r });
    rows = Array.from(byDate.entries())
      .sort((x, y) => y[0].localeCompare(x[0]))
      .map(([date, { d, a }]) => ({
        label: date,
        cost: d?.cost ?? a?.cost ?? 0,
        impressions: d?.impressions ?? 0,
        clicks: d?.clicks ?? 0,
        mediaCv: d?.mediaCv ?? 0,
        mediaValue: d?.mediaValue ?? 0,
        sessions: a?.sessions ?? 0,
        gaCv: a?.gaCv ?? 0,
        gaValue: a?.gaValue ?? 0,
        overallCv: a?.overallCv ?? null,
        overallValue: a?.overallValue ?? null,
      }));
    labelHeader = "日付";
    monoLabel = true;
    showOverall = true;
    showOverallValue = meta.hasOverallValue;
    gaGroupLabel = "GA（サイト全体）";
  } else if (view === "media") {
    const res = await getRptMedia(client.id);
    warnings.push(...res.warnings);
    fetchedAt = Math.max(fetchedAt, res.fetchedAt);
    const map = new Map<string, ReportTableRow>();
    for (const r of res.rows) {
      if (!inRange(r.date, start, end)) continue;
      const cur = map.get(r.media) ?? { label: r.media, ...emptyBucket() };
      addMetrics(cur as unknown as Bucket, r);
      cur.overallCv = addNullable(cur.overallCv ?? null, r.overallCv);
      map.set(r.media, cur);
    }
    rows = Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    labelHeader = "媒体";
    showOverall = meta.mediaHasOverallCv;
  } else if (view === "cpn") {
    const res = await getRptCpn(client.id);
    warnings.push(...res.warnings);
    fetchedAt = Math.max(fetchedAt, res.fetchedAt);
    const map = new Map<string, ReportTableRow>();
    for (const r of res.rows) {
      if (!inRange(r.date, start, end)) continue;
      const key = `${r.media}|${r.campaignId}|${r.matchStatus}`;
      const cur =
        map.get(key) ??
        ({
          label: r.campaignName || r.campaignId || "(no campaign)",
          subLabel: r.campaignId,
          media: r.media,
          matchStatus: r.matchStatus,
          ...emptyBucket(),
        } as ReportTableRow);
      addMetrics(cur as unknown as Bucket, r);
      map.set(key, cur);
    }
    rows = Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    labelHeader = "キャンペーン";
    showMedia = true;
    showBadges = true;
  } else {
    const res = await getRptAdg(client.id);
    warnings.push(...res.warnings);
    fetchedAt = Math.max(fetchedAt, res.fetchedAt);
    const map = new Map<string, ReportTableRow>();
    for (const r of res.rows) {
      if (!inRange(r.date, start, end)) continue;
      const key = `${r.media}|${r.campaignId}|${r.adGroupId}|${r.grainLevel}|${r.matchStatus}`;
      const cur =
        map.get(key) ??
        ({
          // PMax folds back to campaign grain — ad_group_name is empty
          // there, so fall back to the campaign name as the row label.
          label: r.adGroupName || r.campaignName || r.adGroupId || "(no ad group)",
          subLabel: r.adGroupName ? r.campaignName : r.adGroupId || r.campaignId,
          media: r.media,
          grainLevel: r.grainLevel,
          matchStatus: r.matchStatus,
          ...emptyBucket(),
        } as ReportTableRow);
      addMetrics(cur as unknown as Bucket, r);
      map.set(key, cur);
    }
    rows = Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    labelHeader = "広告グループ";
    showMedia = true;
    showBadges = true;
  }

  // Period summary pinned first.
  const tableRows = rows.length > 0 ? [totalRow(rows), ...rows] : rows;

  const csvRows = rows.map((r) => ({
    label: r.label,
    id: r.subLabel ?? "",
    media: r.media ?? "",
    grain_level: r.grainLevel ?? "",
    match_status: r.matchStatus ?? "",
    cost: r.cost,
    impressions: r.impressions,
    clicks: r.clicks,
    media_cv: r.mediaCv,
    media_value: r.mediaValue,
    sessions: r.sessions,
    ga_cv: r.gaCv,
    ga_value: r.gaValue,
    overall_cv: r.overallCv ?? "",
    overall_value: r.overallValue ?? "",
  }));

  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const viewLabel = REPORT_VIEWS.find((v) => v.key === view)?.label ?? view;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Report</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            レポート（GA×広告 突合） · {rr.presetLabel}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {start} 〜 {end} · CV3層: 媒体CV / GA_CV / 全体CV（{meta.overallCvLabel}）
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">最終取得 {fetchedAtLabel}</div>
          <CsvExportButton
            filename={`report-${view}-${slug}-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={csvRows}
          />
          <PrintButton />
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          データ取得で問題が発生した項目があります: {warnings.join(" / ")}
        </div>
      )}

      {/* Period KPIs — window totals independent of the granularity tab. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BigKpiCard label="Cost" value={fmtJpy(kpi.cost)} lowerIsBetter />
        <BigKpiCard label="媒体CV" value={fmtInt(kpi.mediaCv)} />
        <BigKpiCard
          label="GA_CV（サイト全体）"
          value={fmtInt(kpiSiteGaCv)}
          comparisons={[]}
        />
        <BigKpiCard
          label={`全体CV（${meta.overallCvLabel}）`}
          value={fmtInt(kpiOverallCv)}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        期間 GA_ROAS（サイト全体GA売上 ÷ Cost）: {fmtRatioPct(kpiGaRoasPct, 0)}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            {viewLabel} 粒度
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {rows.length} 件
            </span>
          </h2>
          <ReportViewTabs slug={slug} active={view} />
        </div>
        <ReportTable
          rows={tableRows}
          labelHeader={labelHeader}
          showMedia={showMedia}
          showBadges={showBadges}
          showOverall={showOverall}
          overallLabel={meta.overallCvLabel}
          showOverallValue={showOverallValue}
          gaGroupLabel={gaGroupLabel}
          monoLabel={monoLabel}
        />
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div>
            ROAS = 売上 ÷ Cost の%表示（例 1677% = 16.77倍）。比率は期間合計から再計算（日次比率の平均ではない）。
          </div>
          {view === "daily" ? (
            <div>
              GA列はサイト全体（全チャネル）の GA4 実測（返品は0フロア済）。全体CV（{meta.overallCvLabel}）は連携未取得の期間は「—」表示。
            </div>
          ) : (
            <div>
              GA列は広告エンティティに帰属した GA4 計測分。match_status: matched=マスタ突合済 / unmapped=マスタ未対応 / ad_only=GA側データなし。
            </div>
          )}
          {view === "adg" && (
            <div>
              PMax は媒体仕様上 ADG 粒度が存在しないため、該当行は CPN 粒度に折返して表示（grain_level=campaign のバッジ行）。
            </div>
          )}
        </div>
      </section>

      {rows.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">データなし</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            選択期間（{start} 〜 {end}）に rpt ビューのデータがありません。期間プリセットを変更してください。
          </CardContent>
        </Card>
      )}
    </div>
  );
}
