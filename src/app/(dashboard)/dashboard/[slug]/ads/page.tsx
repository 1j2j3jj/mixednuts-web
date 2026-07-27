import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows, type DailyRow } from "@/lib/sources/raw";
import type { DailyRowWithTracking } from "@/lib/sources/bq-raw";
import {
  getGa4MonthlyChannels,
  getGa4PaidCampaigns,
  type Ga4CampaignRow,
} from "@/lib/sources/ga4";
import { getTargetsForMonth } from "@/lib/sources/target";
import { resolveFromSearchParams } from "@/lib/range";
import {
  Wallet,
  Target as TargetIcon,
  JapaneseYen,
  TrendingUp,
} from "lucide-react";
import MediaTable, { type MediaRow } from "@/components/dashboard/MediaTable";
import MediaCampaignTable, {
  type MediaCampaignRow,
} from "@/components/dashboard/MediaCampaignTable";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import MockBanner from "@/components/dashboard/MockBanner";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import SourceToggle from "@/components/dashboard/SourceToggle";
import PageHeader from "@/components/dashboard/PageHeader";
import StatusChip from "@/components/dashboard/StatusChip";
import { readSource } from "@/lib/source";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { lastN } from "@/lib/analysis";
import { fmtInt, fmtJpy, fmtRatioPct, safeDiv } from "@/lib/utils";
import { computeWinRate, meetsRoasTarget, winRateTone } from "@/lib/chip";
import { fmtJstTime } from "@/lib/datetime";

/**
 * Screen 2 — Ads summary.
 *
 * Range-aware. Compares selected window vs previous-window (or prior-year
 * equivalent) via the picker. Media table totals reflect the current window.
 */
export const dynamic = "force-dynamic";
// Allow up to 60s (Vercel default 30s was a timeout risk for the parallel
// BQ/GA4/Sheets fetches on cold cache — 監査#11). Within Hobby/Pro limits.
export const maxDuration = 60;

/** Sum GA4 paid-campaign rows per internal media. */
function ga4TotalsByMedia(
  rows: Ga4CampaignRow[],
): Map<string, { sessions: number; conversions: number; revenue: number }> {
  const m = new Map<
    string,
    { sessions: number; conversions: number; revenue: number }
  >();
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
function ga4DailyTotals(
  rows: Ga4CampaignRow[],
): Map<string, { conversions: number; revenue: number }> {
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

/** Achievement percentage for a "目標 X の Y%" KPI caption (Q1, spec §2.1). */
function pctOfTarget(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 100) : 0;
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

  const { rows: rawRows, fetchedAt, isMock } = await getDailyRows(client, sp);
  // BQ_SOURCE_RAW path (bq-raw.ts) attaches trackingId (Yahoo only, see
  // DailyRowWithTracking); the Sheet path never sets it. DailyRow itself
  // (raw.ts) isn't widened, so this is a same-shape cast, not a real type
  // change — trackingId is simply absent/undefined off the Sheet path.
  const rows = rawRows as DailyRowWithTracking[];
  const allDates = rows
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  const anchor =
    allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);

  const rr = resolveFromSearchParams(
    sp,
    { preset: "thisMonth", compare: "prev" },
    anchor,
  );

  const cur = filterByRange(
    rows,
    rr.current.start,
    rr.current.end,
  ) as DailyRowWithTracking[];
  const prev = rr.previous
    ? (filterByRange(
        rows,
        rr.previous.start,
        rr.previous.end,
      ) as DailyRowWithTracking[])
    : [];
  const curTotals = sumRows(cur);
  const prevTotals = sumRows(prev);

  // This tab's KPIs are ALL ad-attributed now (see ga4AttributedRevCur /
  // ga4AttributedCvCur below), so the site-wide monthly-channel rows are no
  // longer aggregated here — only their isMock flag is still needed, to feed
  // the MockBanner for this source. The call itself stays (it's cached and
  // shared with the サマリー tab, which legitimately IS site-wide).
  const { isMock: ga4AllIsMock } = await getGa4MonthlyChannels(client);

  // Pull GA4 paid-campaign data for the same window so the media table can
  // JOIN real GA4 CV / Revenue per media (not a fake 0.9x multiplier).
  const { rows: ga4Campaigns, isMock: ga4CampaignsIsMock } =
    await getGa4PaidCampaigns(client, rr.current.start, rr.current.end);
  const ga4MediaTot = ga4TotalsByMedia(ga4Campaigns);
  const ga4DailyTot = ga4DailyTotals(ga4Campaigns);

  // GA4 totals per (media, campaign matchKey) — used for the campaign-grain JOIN.
  // Sheet-side campaignId is the canonical join key for Google; for
  // Microsoft/meta where the ad-platform id is only surfaced as name through
  // GA4 auto-tagging, `ga4MatchKey()` (in ga4.ts) already falls back to the
  // campaignName at build time. Here we just aggregate to (media, key).
  const ga4CampaignTot = new Map<
    string,
    { conversions: number; revenue: number }
  >();
  // Yahoo-only: GA4 always reports sessionCampaignId="(not set)" for yhl/cpc
  // sessions, with the true numeric tracking id surfacing in
  // sessionCampaignName instead — same shape as the Meta id quirk, but
  // ga4MatchKey() doesn't special-case it, so matchKey is unusable for
  // Yahoo (confirmed 2026-07-02: GA4 REST check on HS property showed
  // sessionCampaignId="(not set)" / sessionCampaignName="15510337322" for
  // yhl/cpc). JOIN directly on raw campaignName (= campaign_tracking_id)
  // instead of matchKey for this one media.
  const ga4YahooByTrackingId = new Map<
    string,
    { conversions: number; revenue: number }
  >();
  for (const r of ga4Campaigns) {
    const key = `${r.media}|${r.matchKey}`;
    const cur = ga4CampaignTot.get(key) ?? { conversions: 0, revenue: 0 };
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    ga4CampaignTot.set(key, cur);

    if (r.media === "Yahoo" && r.campaignName) {
      const yCur = ga4YahooByTrackingId.get(r.campaignName) ?? {
        conversions: 0,
        revenue: 0,
      };
      yCur.conversions += r.conversions;
      yCur.revenue += r.revenue;
      ga4YahooByTrackingId.set(r.campaignName, yCur);
    }
  }

  function byMediaCampaign(list: DailyRowWithTracking[]): MediaCampaignRow[] {
    const map = new Map<string, MediaCampaignRow & { trackingId?: string }>();
    for (const r of list) {
      const key = `${r.media}|${r.campaignId || r.campaignName}`;
      const c = map.get(key) ?? {
        media: r.media,
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        spend: 0,
        impressions: 0,
        clicks: 0,
        adsCv: 0,
        ga4Cv: 0,
        conversionValue: 0,
        ga4Revenue: 0,
        trackingId: r.trackingId,
      };
      c.spend += r.cost;
      c.impressions += r.impressions;
      c.clicks += r.clicks;
      c.adsCv += r.conversions;
      c.conversionValue += r.conversionValue;
      if (!c.trackingId && r.trackingId) c.trackingId = r.trackingId;
      map.set(key, c);
    }
    // JOIN GA4: Yahoo uses campaign_tracking_id (see ga4YahooByTrackingId
    // above); other media join by (media, campaignId) first, falling back to
    // (media, campaignName) for media where GA4 surfaces the id in the name
    // slot.
    return Array.from(map.values()).map((m) => {
      const g =
        m.media === "Yahoo" && m.trackingId
          ? ga4YahooByTrackingId.get(m.trackingId)
          : (ga4CampaignTot.get(`${m.media}|${m.campaignId}`) ??
            ga4CampaignTot.get(`${m.media}|${m.campaignName}`));
      return {
        ...m,
        ga4Cv: g ? Math.round(g.conversions) : 0,
        ga4Revenue: g ? g.revenue : 0,
        // Join-failure marker (Phase D): `g === undefined` means the GA4
        // join found NO record at all for this campaign — the `0` above is
        // "couldn't match", not "measured zero". Never changes the rendered
        // number (ga4Cv/ga4Revenue are identical to before this field
        // existed); MediaCampaignTable renders it as a separate badge.
        ga4Matched: g !== undefined,
      };
    });
  }

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
        // Join-failure marker — same rationale as byMediaCampaign above.
        ga4Matched: g !== undefined,
      };
    });
  }
  const mediaRows = byMedia(cur);
  const mediaCampaignRows = byMediaCampaign(cur);

  // -----------------------------------------------------------------------
  // C3-g (CEO decision 2026-07-24) — THE ONE authorised rendered-number
  // change in this programme. The ads-tab "GA4 CV" KPI headline used to be
  // curGa4.conversions (getGa4MonthlyChannels / ga4RevenueAndCv — SITE-WIDE,
  // all traffic incl. organic/direct), while the 媒体別サマリ table directly
  // beneath it has always shown AD-ATTRIBUTED GA4 CV (mediaRows[].ga4Cv,
  // joined from getGa4PaidCampaigns). Same label, two different quantities —
  // they disagreed on every one of the 6 clients (45% hs down to 1.6% msec;
  // msec's gap is explained by its revenue being mostly non-ad, not a
  // defect). Switched the headline to the ad-attributed figure so it agrees
  // with its own table. GA4 売上/ROAS cards below are deliberately UNCHANGED
  // — they have the same latent site-wide-vs-ad-attributed split, but that
  // is a separate, not-yet-authorised change (see report).
  //
  // ga4AttributedCvCur is literally `mediaRows.reduce(ga4Cv)` — guaranteed
  // WYSIWYG-equal to MediaTable's own displayed total row, because it's the
  // exact same per-media join already rendered there, not a fresh
  // aggregation that could silently diverge (summing ga4Campaigns directly
  // would include media absent from the ad platform's own rows for the
  // window, which mediaRows does not — see PR notes). A media whose name
  // fails to join contributes 0, same as it already silently does in the
  // table today; the caveat note rendered below the KPI grid discloses this
  // rather than presenting the total as complete.
  const ga4AttributedCvCur = mediaRows.reduce((s, r) => s + r.ga4Cv, 0);

  // 2026-07-27 (CEO): the 売上 / ROAS cards were the remaining half of the
  // C3-g split above. CEO observed it directly — "媒体をクリックすると広告媒体
  // の売上になるけど、GA売上は全売上のような気がする" — and it was worse than
  // the CV case: the headline number was SITE-WIDE while *its own sparkline
  // directly underneath* (ga4DailyTot, from getGa4PaidCampaigns) was already
  // ad-attributed, as was the 媒体別サマリ table below. One card contradicted
  // itself. ROAS compounded it: site-wide GA revenue ÷ AD cost, while the ROAS
  // *target* (tgt.roasPct) is derived from 広告-channel adRevenue/adSpend —
  // so actual and target were on different bases too.
  // Same construction as ga4AttributedCvCur: literally the table's own total.
  const ga4AttributedRevCur = mediaRows.reduce(
    (s, r) => s + (r.ga4Revenue ?? 0),
    0,
  );

  // Previous-period comparison needs its own ad-attributed fetch — prevGa4
  // (still used by the untouched Revenue/ROAS cards) is site-wide, so
  // reusing it here would silently compare an ad-attributed current value
  // against a site-wide previous value (a subtler bug than the one being
  // fixed). Same per-media join as mediaRows, just for rr.previous's window.
  let ga4AttributedCvPrev = 0;
  let ga4AttributedRevPrev = 0;
  if (rr.previous) {
    const { rows: ga4CampaignsPrev } = await getGa4PaidCampaigns(
      client,
      rr.previous.start,
      rr.previous.end,
    );
    const ga4MediaTotPrev = ga4TotalsByMedia(ga4CampaignsPrev);
    for (const media of new Set(prev.map((r) => r.media))) {
      const g = ga4MediaTotPrev.get(media);
      if (g) {
        ga4AttributedCvPrev += Math.round(g.conversions);
        // Revenue needs the same ad-attributed previous window — reusing the
        // site-wide prevGa4.revenue here would compare an ad-attributed
        // current against a site-wide previous (the subtler bug C3 called out).
        ga4AttributedRevPrev += g.revenue;
      }
    }
  }

  // Both sides of the ratio are now ad-scoped: ad-attributed GA revenue over
  // ad spend. This also puts it on the same basis as its own target
  // (tgt.roasPct, derived from 広告-channel adRevenue/adSpend in target.ts).
  const curGa4RoasPct =
    curTotals.cost > 0 ? (ga4AttributedRevCur / curTotals.cost) * 100 : null;
  const prevGa4RoasPct =
    rr.previous && prevTotals.cost > 0
      ? (ga4AttributedRevPrev / prevTotals.cost) * 100
      : null;
  // -----------------------------------------------------------------------

  const tgt = await getTargetsForMonth(client, anchor.slice(0, 7));
  // tgt is always resolved for the LATEST-data month (anchor), not
  // necessarily the selected period — a target caption is only a true
  // statement when the two coincide (mirrors Overview's showGoals gate on
  // page.tsx, same reasoning: a target row from a different month than the
  // period being displayed would misrepresent achievement).
  const targetPeriodMatches =
    rr.current.start.slice(0, 7) === anchor.slice(0, 7);

  // Card-level "win rate" chip (C2-d) for 媒体別サマリ: share of media rows
  // whose ROAS meets-or-beats the target, reusing the exact per-cell
  // threshold MediaTable already colours with (roasClass). No target
  // configured (MSEC) or an empty media set => computeWinRate/winRateTone
  // both return null => no chip, never a false reading.
  const mediaWinHits =
    targetPeriodMatches && tgt.roasPct != null && tgt.roasPct > 0
      ? mediaRows.filter((r) => {
          const rev =
            source === "ga4" ? (r.ga4Revenue ?? 0) : r.conversionValue;
          const roasPct = r.spend > 0 ? (rev / r.spend) * 100 : null;
          return meetsRoasTarget(roasPct, tgt.roasPct);
        }).length
      : null;
  const mediaWinRate =
    mediaWinHits != null
      ? computeWinRate(mediaWinHits, mediaRows.length)
      : null;
  const mediaWinTone = winRateTone(mediaWinRate);

  const series = aggregateByDate(cur);

  // Sparklines: last 14 buckets. Dates paired for tooltip.
  const series14 = lastN(series, 14);
  const dates14 = series14.map((d) => d.date);
  const spend14 = series14.map((d) => d.cost);
  // CV / Revenue series switches per source so the sparkline matches the KPI.
  const cv14 = series14.map((d) =>
    source === "ga4"
      ? (ga4DailyTot.get(d.date)?.conversions ?? 0)
      : d.conversions,
  );
  const rev14 = series14.map((d) =>
    source === "ga4"
      ? (ga4DailyTot.get(d.date)?.revenue ?? 0)
      : d.conversionValue,
  );
  const roas14 = series14.map((d) => {
    const rev =
      source === "ga4"
        ? (ga4DailyTot.get(d.date)?.revenue ?? 0)
        : d.conversionValue;
    return d.cost > 0 ? (rev / d.cost) * 100 : 0;
  });

  const fetchedAtLabel = fmtJstTime(fetchedAt);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <MockBanner isMock={isMock || ga4AllIsMock || ga4CampaignsIsMock} />
        <PageHeader
          kicker="広告詳細"
          title={<>広告詳細 · {rr.presetLabel}</>}
          subtitle={
            <>
              {rr.current.start} 〜 {rr.current.end}
              {rr.previous && (
                <>
                  {" · "}
                  {rr.compareLabel}: {rr.previous.start} 〜 {rr.previous.end}
                </>
              )}
            </>
          }
          controls={
            <>
              <div className="text-xs text-muted-foreground">
                最終取得 {fetchedAtLabel}
              </div>
              <PrintButton />
              <RefreshButton clientId={client.id} />
            </>
          }
        />
      </div>

      {/* Period KPIs with comparison + sparkline */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          sparkDates={dates14}
          sparkFormat="jpy"
          sparkTone="negative"
          icon={Wallet}
          hue="chart-5"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA_CV(広告帰属)" : "媒体CV"}
          value={fmtInt(
            // C3-g: ad-attributed (agrees with 媒体別サマリ below), not
            // site-wide curGa4.conversions — see block comment above.
            source === "ga4" ? ga4AttributedCvCur : curTotals.conversions,
          )}
          caption={
            targetPeriodMatches &&
            tgt.conversions != null &&
            tgt.conversions > 0
              ? `目標 ${fmtInt(tgt.conversions)} の ${pctOfTarget(
                  source === "ga4" ? ga4AttributedCvCur : curTotals.conversions,
                  tgt.conversions,
                )}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtInt(
                    source === "ga4"
                      ? ga4AttributedCvPrev
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
                      ? ga4AttributedCvCur
                      : curTotals.conversions,
                    source === "ga4"
                      ? ga4AttributedCvPrev
                      : prevTotals.conversions,
                  ),
                }
              : undefined
          }
          sparkline={cv14}
          sparkDates={dates14}
          sparkFormat="int"
          icon={TargetIcon}
          hue="chart-3"
        />
        <BigKpiCard
          // (広告帰属) mirrors the vocabulary the report tab already uses to
          // distinguish these two populations ("GA_CV(広告帰属)" vs
          // "GA_CV(サイト全体·購入)"). Not a rename of the CEO-chosen GA売上 —
          // a qualifier, so this tab can't be read as the サマリー tab's
          // site-wide figure. 媒体 source is ad-platform data, inherently
          // ad-scoped, so it needs no qualifier.
          label={source === "ga4" ? "GA売上(広告帰属)" : "媒体売上"}
          value={fmtJpy(
            source === "ga4" ? ga4AttributedRevCur : curTotals.conversionValue,
          )}
          caption={
            // Compare against the 広告-channel target, not the all-channel
            // one: an ad-attributed actual over a site-wide target understates
            // achievement. null (client has no 広告 target rows) => fall
            // through to the period comparison rather than invent a ratio.
            targetPeriodMatches && tgt.adRevenue != null && tgt.adRevenue > 0
              ? `広告目標 ${fmtJpy(tgt.adRevenue)} の ${pctOfTarget(
                  source === "ga4"
                    ? ga4AttributedRevCur
                    : curTotals.conversionValue,
                  tgt.adRevenue,
                )}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtJpy(
                    source === "ga4"
                      ? ga4AttributedRevPrev
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
                      ? ga4AttributedRevCur
                      : curTotals.conversionValue,
                    source === "ga4"
                      ? ga4AttributedRevPrev
                      : prevTotals.conversionValue,
                  ),
                }
              : undefined
          }
          sparkline={rev14}
          sparkDates={dates14}
          sparkFormat="jpy"
          icon={JapaneseYen}
          hue="chart-1"
        />
        <BigKpiCard
          label={source === "ga4" ? "GA_ROAS(広告帰属)" : "媒体ROAS"}
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
          sparkDates={dates14}
          sparkFormat="pct"
          icon={TrendingUp}
          hue="chart-4"
        />
      </div>

      {/* C3-g caveat: GA4 CV above is now a sum of per-media GA4 figures
          joined against this ad platform's own media names for the window —
          a media whose name doesn't match contributes 0, same as the table
          below already does silently. Disclosed here rather than presented
          as a complete total. Only relevant when the KPI is actually
          showing the GA4-sourced number. */}
      {source === "ga4" && (
        <div className="text-xs text-muted-foreground">
          GA_CV は広告キャンペーンに帰属した GA4
          計測分の合計です（媒体別サマリの合計行と一致）。媒体名が一致しない場合、その媒体分は含まれません。
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">媒体別サマリ</h2>
          <div className="flex items-center gap-2">
            {mediaWinTone && mediaWinHits != null && (
              <StatusChip tone={mediaWinTone}>
                目標達成 {mediaWinHits}/{mediaRows.length} 媒体
              </StatusChip>
            )}
            <SourceToggle />
          </div>
        </div>
        <MediaTable
          rows={mediaRows}
          targetRoasPct={tgt.roasPct}
          source={source}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">媒体別キャンペーンサマリ</h2>
            <p className="text-xs text-muted-foreground">
              媒体 × CPN 単位で横比較。ボタンで媒体を絞り込み。KPI は上部の{" "}
              {source === "ga4" ? "GA4" : "媒体"} ソース切替と連動
            </p>
          </div>
        </div>
        <MediaCampaignTable
          rows={mediaCampaignRows}
          targetRoasPct={tgt.roasPct}
          source={source}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            日次推移（COST / 媒体CV / 媒体CPA）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyTrendChart
            data={series}
            absenceDetail={{
              periodLabel: `${rr.current.start} 〜 ${rr.current.end}`,
            }}
            title="日次推移（COST / 媒体CV / 媒体CPA）"
          />
        </CardContent>
      </Card>
    </div>
  );
}
