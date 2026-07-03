import { assertUserCanAccessClientBySlug } from "@/lib/access";
import {
  getRptAdg,
  getRptAll,
  getRptCpn,
  getRptDaily,
  getRptMedia,
  getRptMonthlyAds,
  getRptWeekly,
  isRptSupported,
  RPT_SUPPORTED,
  type RptAllRow,
  type RptDailyRow,
  type RptMetrics,
} from "@/lib/sources/bq-rpt";
import { resolveFromSearchParams } from "@/lib/range";
import { REPORT_VIEWS, type ReportViewKey } from "@/lib/report-views";
import ReportViewTabs from "@/components/dashboard/ReportViewTabs";
import StaleDataBanner from "@/components/dashboard/StaleDataBanner";
import { hasWarnReason } from "@/lib/fetch-warnings";
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
 *   媒体CV (ad platform) / GA_CV(購入) / 全体CV (dozo: Shopify, hs: EC-CUBE).
 * GA_CV is purchase-event based (see bq-rpt.ts); secondary key events
 * (client-specific: dozo Thanks/Wedding, hs 会員登録/問合せ) show as extra
 * columns via RPT_SUPPORTED[client].secondaryEvents. add_to_cart is fetched
 * but not shown as a default column (soft signal).
 *
 * 🔴 GA_CV(購入) grain differs by tab (verified 2026-07-02 against
 * ga4_daily / fct_ad_daily / rpt_all.sql — see bq-rpt.ts module doc for the
 * full derivation):
 *  - daily / monthly ("GA（サイト全体）" group): GA_CV(購入) is SITE-WIDE
 *    (RptAllRow.gaCv/gaValue — ga4_daily's ecommercePurchases, NOT
 *    RptAllRow.gaCvPurchase, which is ad-attributed despite living on the
 *    "site-wide" rpt_all view). These two tabs also show a reference
 *    "GA_CV(広告帰属)" column (adCvPurchase) for the ad-attributed number,
 *    since the two diverge materially (dozo 2026-06: site 2,334 vs
 *    ad-attributed 369 = 6.3x; hs 2026-06: site 1,846 vs ad-attributed
 *    842 = 2.2x).
 *  - weekly / media / cpn / adg ("GA（広告帰属）" group): GA_CV(購入) is
 *    genuinely ad-attributed (fct_ad_daily-grained rpt_daily/rpt_media/
 *    rpt_cpn/rpt_adg) — no separate reference column needed there.
 *
 * Granularity tabs: Daily / 週次 / 月次 / 媒体 / キャンペーン / 広告グループ (?view=).
 * Daily merges rpt_daily (ads metrics) with rpt_all daily rows (site-wide
 * GA + overall CV). Weekly/Monthly roll rpt_daily up by week/month; Monthly
 * additionally joins rpt_all's monthly rows for target_cv/target_value +
 * the overall-CV layer (see getMonthlyRows()). Entity tabs (media/cpn/adg)
 * aggregate the per-day view rows over the selected window; ratios are
 * recomputed from sums (never averaged).
 *
 * cpn/adg rows are grouped by (media, campaign[, ad_group]) WITHOUT
 * match_status in the key (changed 2026-07-02) — matched and unmapped rows
 * for the same entity are folded into one row so a campaign's total isn't
 * split across two lines. matchStatus displayed = "matched" if any
 * constituent row matched, else the first status seen; hasUnmapped flags
 * when unmapped rows were folded in (renders "+未突合分" badge).
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
  /** Ad-attributed purchase CV reference column (daily/monthly only — see
   *  module doc). Undefined on tabs that don't populate it. */
  adCvPurchase?: number;
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
    gaCvPurchase: 0,
    gaCvEvents: {},
    gaCvAddToCart: 0,
    overallCv: null,
    overallValue: null,
  };
}

/** Accepts RptMetrics rows AND ReportTableRow rows (the latter omits
 *  gaCvAddToCart — a soft signal not surfaced in the table, so totalRow()'s
 *  fold-up over already-mapped ReportTableRow[] doesn't carry it).
 *  adCvPurchase is summed only when present on the source row (daily/
 *  monthly); absent on other tabs, so the total row's adCvPurchase stays
 *  undefined there rather than folding in a spurious 0. */
function addMetrics(
  b: Bucket,
  m: Omit<RptMetrics, "gaCvAddToCart"> & { gaCvAddToCart?: number; adCvPurchase?: number },
): void {
  b.cost += m.cost;
  b.impressions += m.impressions;
  b.clicks += m.clicks;
  b.sessions += m.sessions;
  b.mediaCv += m.mediaCv;
  b.mediaValue += m.mediaValue;
  b.gaCv += m.gaCv;
  b.gaValue += m.gaValue;
  b.gaCvPurchase += m.gaCvPurchase;
  b.gaCvAddToCart += m.gaCvAddToCart ?? 0;
  if (m.adCvPurchase != null) {
    b.adCvPurchase = (b.adCvPurchase ?? 0) + m.adCvPurchase;
  }
  for (const [k, v] of Object.entries(m.gaCvEvents)) {
    b.gaCvEvents[k] = (b.gaCvEvents[k] ?? 0) + v;
  }
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
  const allMonthly = allRes.rows.filter((r) => r.granularity === "monthly");
  const anchorDates = [...dailyRes.rows, ...allDaily]
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  // Data-freshness banner input (Batch2 監査P0): MAX(date) across the two
  // always-fetched views — derived from rows already in hand, no extra query.
  // null (no rows at all) renders no banner; the empty state covers that.
  const maxDataDate = anchorDates[anchorDates.length - 1] ?? null;
  const anchor = maxDataDate ?? new Date().toISOString().slice(0, 10);
  const rr = resolveFromSearchParams(sp, { preset: "thisMonth", compare: "none" }, anchor);
  const { start, end } = rr.current;

  const dailyCur = dailyRes.rows.filter((r) => inRange(r.date, start, end));
  const allCur = allDaily.filter((r) => inRange(r.date, start, end));

  /* ---------------- Period KPI (window totals, tab-independent) ------- */
  const kpi = emptyBucket();
  for (const r of dailyCur) addMetrics(kpi, r);
  // 🔴 Site-wide purchase CV/value MUST come from RptAllRow.gaCv/gaValue
  // (ga4_daily's ecommercePurchases), NOT gaCvPurchase — the latter is
  // ad-attributed even on rpt_all (see bq-rpt.ts module doc). Using
  // gaCvPurchase here previously understated the KPI card by 6.3x (dozo) /
  // 2.2x (hs) for 2026-06.
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
  let showAdCvPurchase = false;
  let monoLabel = false;
  let gaGroupLabel = "GA（広告帰属）";
  let gaCvLabel = "GA_CV(購入)";
  // Monthly tab only: achievement-rate column (全体売上 ÷ 目標). Rendered
  // as a lightweight table below the main ReportTable rather than wired
  // into ReportTable's generic column set (target/achievement is a
  // monthly-only concept, unlike the other granularities).
  let monthlyTargetRows: {
    month: string;
    overallValue: number | null;
    targetValue: number | null;
    achievementRate: number | null;
    externalCv: RptAllRow["externalCv"];
  }[] = [];

  if (view === "daily") {
    // Merge rpt_daily (ads side) with rpt_all daily (site GA + overall CV)
    // by date. GA columns on this tab are the site-wide GA4 numbers — this
    // is the classic daily report layout (ads block | GA block | overall).
    //
    // 🔴 gaCvPurchase/gaValue here are mapped from a.gaCv/a.gaValue (the
    // genuinely site-wide columns), NOT a.gaCvPurchase (which is
    // ad-attributed even on rpt_all — see bq-rpt.ts module doc). The
    // ad-attributed purchase count is still surfaced, as a separate
    // reference column (adCvPurchase → "GA_CV(広告帰属)").
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
        gaCvPurchase: a?.gaCv ?? 0,
        gaCvEvents: a?.gaCvEvents ?? {},
        adCvPurchase: a?.gaCvPurchase ?? 0,
        overallCv: a?.overallCv ?? null,
        overallValue: a?.overallValue ?? null,
      }));
    labelHeader = "日付";
    monoLabel = true;
    showOverall = true;
    showOverallValue = meta.hasOverallValue;
    showAdCvPurchase = true;
    gaGroupLabel = "GA（サイト全体）";
    gaCvLabel = "GA_CV(サイト全体·購入)";
  } else if (view === "weekly") {
    // Ads-side rollup only (rpt_daily grouped by ISO week) — same shape as
    // the ads block on the Daily tab, no site-wide GA/overall join (that
    // would need a rpt_all weekly rollup which the mart doesn't provide;
    // Monthly below is the one granularity that does the rpt_all join).
    //
    // The [start,end] window is applied INSIDE getRptWeekly's SQL (filter
    // rpt_daily by date, then DATE_TRUNC to week) rather than here by
    // filtering on week_start — filtering by week_start after grouping
    // would either drop a straddling week entirely or (with the old "OR"
    // check) admit a week whose truncated start falls outside the window
    // while still carrying summed days from the adjacent month. Rows
    // returned here are already scoped to the window, so no further date
    // filter is applied — only the display sort.
    const res = await getRptWeekly(client.id, { start, end });
    warnings.push(...res.warnings);
    fetchedAt = Math.max(fetchedAt, res.fetchedAt);
    rows = res.rows
      .slice()
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      .map((r) => ({
        label: r.weekStart,
        cost: r.cost,
        impressions: r.impressions,
        clicks: r.clicks,
        mediaCv: r.mediaCv,
        mediaValue: r.mediaValue,
        sessions: r.sessions,
        gaCv: r.gaCv,
        gaValue: r.gaValue,
        gaCvPurchase: r.gaCvPurchase,
        gaCvEvents: r.gaCvEvents,
        overallCv: null,
        overallValue: null,
      }));
    labelHeader = "週（月曜起点）";
    monoLabel = true;
    gaGroupLabel = "GA（広告帰属・週次集計）";
  } else if (view === "monthly") {
    // Ads-side block from rpt_daily (month-truncated) joined with rpt_all's
    // monthly rows (site GA + overall CV + target) by month. Window filter
    // uses calendar-month overlap (a month row "counts" if its first day
    // falls in [start,end] OR the selected range is entirely inside that
    // month) so a mid-month "This Month" preset still shows the row.
    //
    // 🔴 Same site-wide vs ad-attributed split as the Daily tab: gaCvPurchase
    // here is all?.gaCv (site-wide), not all?.gaCvPurchase (ad-attributed —
    // see bq-rpt.ts module doc). Ad-attributed purchase count is exposed
    // separately via adCvPurchase → "GA_CV(広告帰属)".
    const adsRes = await getRptMonthlyAds(client.id);
    warnings.push(...adsRes.warnings);
    fetchedAt = Math.max(fetchedAt, adsRes.fetchedAt);
    const byMonth = new Map<string, { ads?: (typeof adsRes.rows)[number]; all?: RptAllRow }>();
    for (const r of adsRes.rows) byMonth.set(r.month, { ads: r });
    for (const r of allMonthly) byMonth.set(r.date, { ...byMonth.get(r.date), all: r });
    const monthInWindow = (month: string) => month <= end && month.slice(0, 7) >= start.slice(0, 7);
    rows = Array.from(byMonth.entries())
      .filter(([month]) => monthInWindow(month))
      .sort((x, y) => y[0].localeCompare(x[0]))
      .map(([month, { ads, all }]) => ({
        label: month,
        cost: ads?.cost ?? all?.cost ?? 0,
        impressions: ads?.impressions ?? 0,
        clicks: ads?.clicks ?? 0,
        mediaCv: ads?.mediaCv ?? 0,
        mediaValue: ads?.mediaValue ?? 0,
        sessions: all?.sessions ?? 0,
        gaCv: all?.gaCv ?? 0,
        gaValue: all?.gaValue ?? 0,
        gaCvPurchase: all?.gaCv ?? 0,
        gaCvEvents: all?.gaCvEvents ?? {},
        adCvPurchase: all?.gaCvPurchase ?? 0,
        overallCv: all?.overallCv ?? null,
        overallValue: all?.overallValue ?? null,
      }));
    monthlyTargetRows = Array.from(byMonth.entries())
      .filter(([month]) => monthInWindow(month))
      .sort((x, y) => y[0].localeCompare(x[0]))
      .map(([month, { all }]) => {
        const overallValue = all?.overallValue ?? null;
        const targetValue = all?.targetValue ?? null;
        const achievementRate =
          overallValue != null && targetValue != null && targetValue !== 0
            ? overallValue / targetValue
            : null;
        return { month, overallValue, targetValue, achievementRate, externalCv: all?.externalCv ?? null };
      });
    labelHeader = "月";
    monoLabel = true;
    showOverall = true;
    showOverallValue = meta.hasOverallValue;
    showAdCvPurchase = true;
    gaGroupLabel = "GA（サイト全体・月次）";
    gaCvLabel = "GA_CV(サイト全体·購入)";
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
    // Grouped WITHOUT match_status — matched/unmapped rows for the same
    // campaign are unified into one row (see module doc + hasUnmapped).
    // sawMatched/sawUnmapped are tracked separately from the displayed
    // matchStatus so the fold-in detection is independent of which status's
    // row happens to arrive first in res.rows (dates interleave the two).
    const map = new Map<string, ReportTableRow>();
    const sawMatched = new Set<string>();
    const sawUnmapped = new Set<string>();
    for (const r of res.rows) {
      if (!inRange(r.date, start, end)) continue;
      const key = `${r.media}|${r.campaignId}`;
      const cur =
        map.get(key) ??
        ({
          label: r.campaignName || r.campaignId || "(no campaign)",
          subLabel: r.campaignId,
          media: r.media,
          matchStatus: r.matchStatus,
          hasUnmapped: false,
          ...emptyBucket(),
        } as ReportTableRow);
      addMetrics(cur as unknown as Bucket, r);
      // "matched" wins as the representative badge.
      if (r.matchStatus === "matched") cur.matchStatus = "matched";
      if (r.matchStatus === "matched") sawMatched.add(key);
      if (r.matchStatus === "unmapped") sawUnmapped.add(key);
      map.set(key, cur);
    }
    // hasUnmapped ("+未突合分") means "this matched total also folds in some
    // unmapped rows" — a purely-unmapped entity (no matched constituent row)
    // must NOT get the badge; it's shown via the plain unmapped badge alone.
    for (const [key, cur] of map) {
      cur.hasUnmapped = sawMatched.has(key) && sawUnmapped.has(key);
    }
    rows = Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    labelHeader = "キャンペーン";
    showMedia = true;
    showBadges = true;
  } else if (view === "adg") {
    const res = await getRptAdg(client.id);
    warnings.push(...res.warnings);
    fetchedAt = Math.max(fetchedAt, res.fetchedAt);
    // Grouped WITHOUT match_status — same unification as cpn above
    // (sawMatched/sawUnmapped tracked separately, order-independent).
    const map = new Map<string, ReportTableRow>();
    const sawMatched = new Set<string>();
    const sawUnmapped = new Set<string>();
    for (const r of res.rows) {
      if (!inRange(r.date, start, end)) continue;
      const key = `${r.media}|${r.campaignId}|${r.adGroupId}|${r.grainLevel}`;
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
          hasUnmapped: false,
          ...emptyBucket(),
        } as ReportTableRow);
      addMetrics(cur as unknown as Bucket, r);
      if (r.matchStatus === "matched") cur.matchStatus = "matched";
      if (r.matchStatus === "matched") sawMatched.add(key);
      if (r.matchStatus === "unmapped") sawUnmapped.add(key);
      map.set(key, cur);
    }
    // hasUnmapped ("+未突合分") = matched total that also folds in unmapped
    // rows; a purely-unmapped entity keeps hasUnmapped=false (see cpn above).
    for (const [key, cur] of map) {
      cur.hasUnmapped = sawMatched.has(key) && sawUnmapped.has(key);
    }
    rows = Array.from(map.values()).sort((a, b) => b.cost - a.cost);
    labelHeader = "広告グループ";
    showMedia = true;
    showBadges = true;
  }

  // Period summary pinned first — same total row shown at the top of the
  // table, so CSV export must include it too (see csvRows below).
  const periodTotalRow = rows.length > 0 ? totalRow(rows) : null;
  const tableRows = periodTotalRow ? [periodTotalRow, ...rows] : rows;

  // CSV column set mirrors ReportTable's displayed columns (label/media/
  // badges + the three CV-layer blocks); row order matches the table's
  // default (server-computed) sort — cost desc for entity views, date desc
  // for daily/weekly/monthly — since client-side re-sort state isn't
  // available server-side (documented in the footer note below).
  // ga_cv_purchase column name reflects grain per the same split as the
  // table (site-wide on daily/monthly via showAdCvPurchase, ad-attributed
  // elsewhere) — see module doc. The ad-attributed reference column is only
  // included when the tab actually populates adCvPurchase.
  const gaCvPurchaseCsvKey = showAdCvPurchase ? "ga_cv_purchase_sitewide" : "ga_cv_purchase";
  function toCsvRow(r: ReportTableRow) {
    const eventCols: Record<string, number> = {};
    for (const ev of meta.secondaryEvents) {
      eventCols[`ga_cv_${ev.key}`] = r.gaCvEvents[ev.key] ?? 0;
    }
    return {
      label: r.label,
      id: r.subLabel ?? "",
      media: r.media ?? "",
      grain_level: r.grainLevel ?? "",
      match_status: r.matchStatus ?? "",
      has_unmapped: r.hasUnmapped ? "1" : "",
      cost: r.cost,
      impressions: r.impressions,
      clicks: r.clicks,
      media_cv: r.mediaCv,
      media_value: r.mediaValue,
      sessions: r.sessions,
      [gaCvPurchaseCsvKey]: r.gaCvPurchase,
      ...(showAdCvPurchase ? { ga_cv_purchase_ad_attributed: r.adCvPurchase ?? "" } : {}),
      ...eventCols,
      ga_value: r.gaValue,
      overall_cv: r.overallCv ?? "",
      overall_value: r.overallValue ?? "",
    };
  }

  const csvRows = [
    ...(periodTotalRow ? [toCsvRow(periodTotalRow)] : []),
    ...rows.map(toCsvRow),
  ];

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
            {start} 〜 {end} · CV3層: 媒体CV / GA_CV(購入) / 全体CV（{meta.overallCvLabel}）
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

      <StaleDataBanner maxDate={maxDataDate} />

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
          label="GA_CV(サイト全体·購入)"
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
        {/* GA_CV の定義がタブで切替わる（サイト全体 ⇄ 広告帰属）ことを常時明示。
            サイト全体は広告以外の流入も含むため広告帰属より大きく出る（誤読防止・監査P1-4）。 */}
        {(() => {
          const siteWide = view === "daily" || view === "monthly";
          return (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                siteWide
                  ? "border-sky-200 bg-sky-50 text-sky-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {siteWide
                ? "このタブの GA_CV / GA売上 は「サイト全体」の GA4 計測です（広告以外の流入も含むため広告帰属より大きく出ます）。広告経由の購入CVは「GA_CV(購入)」列で別掲。"
                : "このタブの GA_CV / GA売上 は「広告帰属」（この広告経由の GA4 計測のみ）です。サイト全体の数値は Daily / 月次 タブで確認できます。"}
            </div>
          );
        })()}
        <ReportTable
          rows={tableRows}
          labelHeader={labelHeader}
          showMedia={showMedia}
          showBadges={showBadges}
          showOverall={showOverall}
          overallLabel={meta.overallCvLabel}
          showOverallValue={showOverallValue}
          gaGroupLabel={gaGroupLabel}
          gaCvLabel={gaCvLabel}
          monoLabel={monoLabel}
          eventDefs={meta.secondaryEvents}
          showAdCvPurchase={showAdCvPurchase}
        />
        {view === "monthly" && monthlyTargetRows.length > 0 && (
          <div className="rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-3 py-2 text-left font-semibold">月</th>
                  <th className="px-3 py-2 text-right font-semibold">全体売上（{meta.overallCvLabel.replace(" CV", "")}）</th>
                  <th className="px-3 py-2 text-right font-semibold">売上目標</th>
                  <th className="px-3 py-2 text-right font-semibold">達成率</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTargetRows.map((r) => (
                  <tr key={r.month} className="border-t">
                    <td className="px-3 py-1.5 font-mono">{r.month}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtJpy(r.overallValue)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtJpy(r.targetValue)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {r.achievementRate != null ? fmtRatioPct(r.achievementRate * 100, 1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {view === "monthly" &&
          monthlyTargetRows.some((r) => r.externalCv != null) && (
            <div className="rounded-md border">
              <div className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold">
                外部CV（オフライン／アップロード分・GA×広告突合とは別系列）
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="px-3 py-2 text-left font-semibold">月</th>
                    <th className="px-3 py-2 text-right font-semibold">電話</th>
                    <th className="px-3 py-2 text-right font-semibold">店舗</th>
                    <th className="px-3 py-2 text-right font-semibold">イベント</th>
                    <th className="px-3 py-2 text-right font-semibold">フォーム</th>
                    <th className="px-3 py-2 text-right font-semibold">その他</th>
                    <th className="px-3 py-2 text-right font-semibold">合計CV</th>
                    <th className="px-3 py-2 text-right font-semibold">売上</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTargetRows
                    .filter((r) => r.externalCv != null)
                    .map((r) => {
                      const e = r.externalCv!;
                      return (
                        <tr key={r.month} className="border-t">
                          <td className="px-3 py-1.5 font-mono">{r.month}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(e.phone)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(e.store)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(e.event)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(e.form)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(e.other)}</td>
                          <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{fmtInt(e.total)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtJpy(e.value)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div>
            ROAS = 売上 ÷ Cost の%表示（例 1677% = 16.77倍）。比率は期間合計から再計算（日次比率の平均ではない）。
          </div>
          <div>
            CSVは合計行を含み、表の既定ソート順（並び替え前の順序）で出力されます。テーブル上でソートを変更してもCSVの行順には反映されません。
          </div>
          <div>
            {gaCvLabel} は GA4 purchase（ecommercePurchases）イベント基準（旧表示の GA_CV は全 key event 合算だったが、purchase 基準に変更）。
            {meta.secondaryEvents.length > 0 && (
              <>
                {" "}
                {meta.secondaryEvents.map((ev) => ev.label).join(" / ")} は別列で参考表示。
              </>
            )}
          </div>
          {view === "daily" || view === "monthly" ? (
            <div>
              GA列はサイト全体（全チャネル）の GA4 実測（返品は0フロア済）。{gaCvLabel} はサイト全体の purchase 件数、GA_CV(広告帰属) は広告エンティティに帰属した参考値（媒体別/CPN/ADGタブの GA_CV(購入) と同一系列）——両者は一致しない（未計測トラフィックや直接流入分だけサイト全体側が上回るため）。全体CV（{meta.overallCvLabel}）は連携未取得の期間は「—」表示。
            </div>
          ) : view === "weekly" ? (
            <div>
              GA列は広告エンティティに帰属した GA4 計測分の週次集計。全体CV（サイト全体・目標比較）は月次タブを参照。
            </div>
          ) : (
            <div>
              GA列は広告エンティティに帰属した GA4 計測分。バッジ:
              matched=広告費とGA計測が突合済み / unmapped=GA計測はあるが対応広告費が未着（1日遅れで翌日回収）/
              ad_only=広告費のみでGA計測なし。同一キャンペーン・広告グループ配下に matched と unmapped が混在する場合は1行に統合し「+未突合分」バッジを付与。
            </div>
          )}
          {view === "adg" && (
            <div>
              PMax は媒体仕様上 ADG 粒度が存在しないため、該当行は CPN 粒度に折返して表示（grain_level=campaign のバッジ行）。
            </div>
          )}
        </div>
      </section>

      {rows.length === 0 &&
        // Empty-state 3分類 (Batch2 監査P0 §4): 「データなし」「取得失敗」
        // 「権限なし」を warnings の reason タグ ([permission]/[fetch_failed],
        // fetch-warnings.ts) で分岐。permission 優先 — 権限が無いのに
        // 「期間を広げて」と案内するのは誤誘導のため。
        (hasWarnReason(warnings, "permission") ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">データにアクセスできません（権限エラー）</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              データソース（BigQuery）への権限が不足しているため取得できませんでした。
              期間を変更しても解消しません。管理者に連絡してください。
            </CardContent>
          </Card>
        ) : hasWarnReason(warnings, "fetch_failed") ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">データの取得に失敗しました</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              一時的なエラーでデータを取得できませんでした（表示されている他の数値は
              古いキャッシュの可能性があります）。時間をおいて再読み込みするか、
              右上の「更新」を実行してください。解消しない場合は管理者に連絡してください。
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">データなし</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              選択期間（{start} 〜 {end}）に表示できるレポートデータがありません。
              上部の「期間」を広げるか別の期間に変更してください。データ連携直後は
              反映まで時間がかかる場合があります。
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
