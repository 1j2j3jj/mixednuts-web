import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { clientHasTargets } from "@/config/clients";
import { getDailyRows } from "@/lib/sources/raw";
import {
  getGa4MonthlyChannels,
  getGa4DailyChannels,
  getDeviceTotals,
  ga4SecondaryEventDefs,
  type ChannelGroup,
  type ChannelDay,
} from "@/lib/sources/ga4";
import { getEccubeDaily, sumEccubeRange } from "@/lib/sources/eccube";
import {
  getTargetsForMonth,
  getChannelTargetsForMonth,
  GA4_TO_PLAN_CHANNEL,
  UNMAPPED_PLAN_CHANNEL,
} from "@/lib/sources/target";
import { resolveFromSearchParams, type DateRange } from "@/lib/range";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { analysePacing, lastN } from "@/lib/analysis";
import { readSource, type MetricSource } from "@/lib/source";
import { JapaneseYen, Target, Users, Receipt, TrendingUp } from "lucide-react";
import SourceToggle from "@/components/dashboard/SourceToggle";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import ChannelTrendChart from "@/components/dashboard/ChannelTrendChart";
import ChannelTargetTable, {
  type ChannelTargetRow,
} from "@/components/dashboard/ChannelTargetTable";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import GoalGauge from "@/components/dashboard/GoalGauge";
import PacingAlert from "@/components/dashboard/PacingAlert";
import DeviceBar from "@/components/dashboard/DeviceBar";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import MockBanner from "@/components/dashboard/MockBanner";
import StaleDataBanner from "@/components/dashboard/StaleDataBanner";
import FirstRunGuide from "@/components/dashboard/FirstRunGuide";
import PageHeader from "@/components/dashboard/PageHeader";
import ShareBar from "@/components/dashboard/ShareBar";
import StatusChip from "@/components/dashboard/StatusChip";
import ChakinOverview from "@/components/dashboard/ChakinOverview";
import AbsenceNotice from "@/components/dashboard/AbsenceNotice";
import AbsenceTableRow from "@/components/dashboard/AbsenceTableRow";
import { permissionDeniedCopy } from "@/lib/absence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";
import { computeShare } from "@/lib/share";
import { achievementTone, sumAchievement } from "@/lib/chip";
import { fmtJstTime, jstDateString, jstYesterdayString } from "@/lib/datetime";
import { getAdSyncStatus } from "@/lib/sources/sync-status";
import { resolveDataTail, tailNotice } from "@/lib/data-tail";

export const dynamic = "force-dynamic";
// Allow up to 60s (Vercel default 30s was a timeout risk for the parallel
// BQ/GA4/Sheets fetches on cold cache — 監査#11). Within Hobby/Pro limits.
export const maxDuration = 60;

/** GA4 daily-channel fetch window (see realDailyChannels in ga4.ts: fixed
 *  "90daysAgo"-"today"). Ranges that fit entirely inside this window can be
 *  summed exactly from ga4Daily; ranges reaching further back fall back to
 *  the coarser month-level `ga4` rows (see filterGa4MonthlyByRange below). */
const GA4_DAILY_WINDOW_DAYS = 90;

function withinGa4DailyWindow(r: DateRange): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - GA4_DAILY_WINDOW_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return r.start >= cutoffIso && r.end <= today;
}

function filterChannelDaysByRange(
  rows: ChannelDay[],
  r: DateRange,
): ChannelDay[] {
  return rows.filter((x) => x.date >= r.start && x.date <= r.end);
}

/** Month-rounded fallback for ranges that reach outside the 90-day daily
 *  window (e.g. 過去6ヶ月/過去12ヶ月) — a full-month approximation is an
 *  acceptable trade-off there since the range already spans many months.
 *  NOT used for short/day-level presets (last7/last28/thisMonth/lastMonth)
 *  any more — those go through filterChannelDaysByRange, which fixed a bug
 *  where any preset crossing a month boundary picked up whole extra months
 *  of GA4 sessions (up to ~4x over-count, confirmed on HS last7: real daily
 *  sum 60,745 sessions vs. old month-rounded 237,327). */
function filterGa4MonthlyByRange<T extends { yearMonth: string }>(
  rows: T[],
  r: DateRange,
): T[] {
  return rows.filter((x) => {
    const monthStart = `${x.yearMonth}-01`;
    const [y, m] = x.yearMonth.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return monthStart <= r.end && monthEnd >= r.start;
  });
}

interface Ga4SumRow {
  sessions: number;
  conversions: number;
  revenue: number;
}

function sumGa4(rows: Ga4SumRow[]) {
  let sessions = 0,
    conversions = 0,
    revenue = 0;
  for (const r of rows) {
    sessions += r.sessions;
    conversions += r.conversions;
    revenue += r.revenue;
  }
  return { sessions, conversions, revenue };
}

/** Resolve the effective-window GA4 channel rows for a DateRange: exact
 *  daily sum when the range fits inside ga4Daily's 90-day window, else the
 *  coarser month-rounded fallback (see filterGa4MonthlyByRange doc). Both
 *  branches return rows shaped like { channel, sessions, conversions,
 *  revenue } so downstream sumGa4()/byChannel logic doesn't need to care
 *  which path was taken. */
function resolveGa4ChannelRows(
  ga4Daily: ChannelDay[],
  ga4Monthly: Array<{
    yearMonth: string;
    channel: ChannelGroup;
    sessions: number;
    conversions: number;
    revenue: number;
  }>,
  r: DateRange,
): Array<{
  channel: ChannelGroup;
  sessions: number;
  conversions: number;
  revenue: number;
}> {
  if (withinGa4DailyWindow(r)) {
    return filterChannelDaysByRange(ga4Daily, r).map((d) => ({
      channel: d.channel,
      sessions: d.sessions,
      conversions: d.conversions,
      revenue: d.revenue,
    }));
  }
  return filterGa4MonthlyByRange(ga4Monthly, r).map((m) => ({
    channel: m.channel,
    sessions: m.sessions,
    conversions: m.conversions,
    revenue: m.revenue,
  }));
}

function pct(a: number, b: number): number | null {
  if (b === 0) return null;
  return (a - b) / b;
}

/** Achievement percentage for a "目標 X の Y%" KPI caption (Q1, spec §2.1).
 *  Rounds like the existing GoalGauge ratio display so the two stay
 *  internally consistent. */
function pctOfTarget(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 100) : 0;
}

/** KPI card vocabulary — matches the weekly/monthly client-report vocabulary
 *  (COST / SESSION / GA_CV / GA売上 / GA_ROAS / 媒体CV / EC-CUBE_CV /
 *  EC-CUBE売上 / EC-CUBE_ROAS), switching with the 表示値 source toggle
 *  (2026-07-24 CEO review). The prior generic CPA/ROAS wording is retired;
 *  the cards keep their 全媒体COST合算 nuance visible via
 *  KPI_COST_NOTE instead of folding it into the label. */
const KPI_LABELS: Record<
  MetricSource,
  { revenue: string; cv: string; cpa: string; roas: string }
> = {
  ga4: { revenue: "GA売上", cv: "GA_CV", cpa: "GA_CPA", roas: "GA_ROAS" },
  media: {
    revenue: "媒体売上",
    cv: "媒体CV",
    cpa: "媒体CPA",
    roas: "媒体ROAS",
  },
  eccube: {
    revenue: "EC-CUBE売上",
    cv: "EC-CUBE_CV",
    cpa: "EC-CUBE_CPA",
    roas: "EC-CUBE_ROAS",
  },
};
/** CPA/ROAS's cost side is always 全媒体COST合算 regardless of which
 *  revenue/CV source is toggled; surfaced explicitly so it isn't lost. */
const KPI_COST_NOTE = "COST=全媒体合算";

export default async function Overview({
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

  if (client.id === "chakin") {
    return <ChakinOverview client={client} slug={slug} searchParams={sp} />;
  }

  const { rows: adRows, fetchedAt, isMock } = await getDailyRows(client, sp);
  const [ga4Result, ga4DailyResult, eccube] = await Promise.all([
    getGa4MonthlyChannels(client),
    getGa4DailyChannels(client),
    getEccubeDaily(client),
  ]);
  const ga4 = ga4Result.rows;
  const ga4Daily = ga4DailyResult.rows;
  const hasEccube = eccube.rows.length > 0;

  const adDates = adRows
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  // 広告行が1件でもある場合のみ、末尾の解釈を通す（CEO 2026-07-27「昨日まで数値を
  // 更新してほしい」。土日配信停止で Google Ads が行を返さず anchor が金曜で止まる
  // 問題。詳細は `@/lib/data-tail`）。同期成功の証拠があるときだけ前日へ進める。
  //
  // 広告行がゼロのクライアント（chakin は広告シートがヘッダのみ）は**従来の GA4
  // フォールバックをそのまま使う** — ここを前日に変えると、広告を出していない
  // クライアントの期間計算まで動いてしまう。
  const lastAdDate = adDates[adDates.length - 1] ?? null;
  const adTail = lastAdDate
    ? resolveDataTail({
        lastAdDate,
        yesterday: jstYesterdayString(),
        adSyncOk: (await getAdSyncStatus(client.id)).ok,
      })
    : null;
  const anchor =
    adTail?.anchor ??
    adDates[adDates.length - 1] ??
    `${ga4[ga4.length - 1]?.yearMonth ?? jstDateString().slice(0, 7)}-01`;

  const rr = resolveFromSearchParams(
    sp,
    { preset: "thisMonth", compare: "prev" },
    anchor,
  );

  const adCur = filterByRange(adRows, rr.current.start, rr.current.end);
  const gaCurRows = resolveGa4ChannelRows(ga4Daily, ga4, rr.current);
  const gaCur = sumGa4(gaCurRows);
  const costCur = adCur.reduce((s, r) => s + r.cost, 0);

  const adPrev = rr.previous
    ? filterByRange(adRows, rr.previous.start, rr.previous.end)
    : [];
  const gaPrevRows = rr.previous
    ? resolveGa4ChannelRows(ga4Daily, ga4, rr.previous)
    : [];
  const gaPrev = sumGa4(gaPrevRows);
  const costPrev = adPrev.reduce((s, r) => s + r.cost, 0);

  // ECCUBE aggregates within the current/previous window.
  const eccubeCur = sumEccubeRange(
    eccube.rows,
    rr.current.start,
    rr.current.end,
  );
  const eccubePrev = rr.previous
    ? sumEccubeRange(eccube.rows, rr.previous.start, rr.previous.end)
    : { conversions: 0, revenue: 0, avgOrderValue: null };

  // Ad-side totals for CV/Revenue — needed for the 媒体 source path.
  const adTotals = sumRows(adCur);
  const adTotalsPrev = sumRows(adPrev);

  // Select the effective CV/Revenue per source. Cost always comes from ad
  // rows — it's not a revenue-side metric. CPA/ROAS are computed
  // against whichever source is active so the card math is internally
  // consistent (ROAS uses the same numerator source as the Revenue card).
  const pickCv = (src: "ga4" | "media" | "eccube"): number =>
    src === "ga4"
      ? gaCur.conversions
      : src === "media"
        ? adTotals.conversions
        : eccubeCur.conversions;
  const pickRev = (src: "ga4" | "media" | "eccube"): number =>
    src === "ga4"
      ? gaCur.revenue
      : src === "media"
        ? adTotals.conversionValue
        : eccubeCur.revenue;
  const pickCvPrev = (src: "ga4" | "media" | "eccube"): number =>
    src === "ga4"
      ? gaPrev.conversions
      : src === "media"
        ? adTotalsPrev.conversions
        : eccubePrev.conversions;
  const pickRevPrev = (src: "ga4" | "media" | "eccube"): number =>
    src === "ga4"
      ? gaPrev.revenue
      : src === "media"
        ? adTotalsPrev.conversionValue
        : eccubePrev.revenue;

  const effectiveCv = pickCv(source);
  const effectiveRev = pickRev(source);
  const effectiveCvPrev = pickCvPrev(source);
  const effectiveRevPrev = pickRevPrev(source);

  const blendedCpa = safeDiv(costCur, effectiveCv);
  const blendedRoas = safeDiv(effectiveRev, costCur);
  const blendedCpaPrev = safeDiv(costPrev, effectiveCvPrev);
  const blendedRoasPrev = safeDiv(effectiveRevPrev, costPrev);

  // Sparkline: last 14 days within the range. The 5 Big KPI cards above
  // pull from mixed sources (GA4 for Revenue/CV/Sessions/ROAS, ad-side for
  // CPA / Spend), so the sparklines must pull from the same source to match
  // the headline number. GA4 daily data is fetched below and joined here.
  const daily = aggregateByDate(adCur);
  const daily14 = lastN(daily, 14);
  const sparkDates = daily14.map((d) => d.date);
  const costSpark = daily14.map((d) => d.cost);

  // New vs repeat — past 6 months (site-wide, moved from Ads page).
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

  // Monthly channel chart is titled "過去12ヶ月" but ga4 (getGa4MonthlyChannels)
  // actually spans ~24 months (730daysAgo) — previously passed through
  // unsliced, silently rendering up to 2 years of bars under a 12-month
  // label. yearMonth strings sort lexicographically, so the last 12 distinct
  // months (× channels) is a plain tail slice of the sorted-ascending series.
  const last12Months = Array.from(new Set(ga4.map((r) => r.yearMonth)))
    .sort()
    .slice(-12);
  const last12MonthsSet = new Set(last12Months);
  const ga4Last12Months = ga4.filter((r) => last12MonthsSet.has(r.yearMonth));

  // Channels (current-month GA4 rows) — full set feeds the channel-target
  // table's actuals; top 5 by revenue feeds the fallback Top-5 table.
  const byChannel = new Map<
    string,
    {
      channel: ChannelGroup;
      sessions: number;
      conversions: number;
      revenue: number;
    }
  >();
  for (const r of gaCurRows) {
    const cur = byChannel.get(r.channel) ?? {
      channel: r.channel,
      sessions: 0,
      conversions: 0,
      revenue: 0,
    };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    byChannel.set(r.channel, cur);
  }
  const topChannelsAll = Array.from(byChannel.values());
  // Denominator for the Top-5 table's 売上比 share bar (C2-b): revenue across
  // ALL channels, not just the 5 shown — "share of total", matching the
  // MediaTable Spend share-bar pattern (share of the table's grand total).
  const totalChannelRevenue = topChannelsAll.reduce((s, c) => s + c.revenue, 0);
  const topChannels = topChannelsAll
    .slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Budget pacing — only when the preset is "当月". Computed after tgt is
  // fetched below (pacing needs the uploaded budget; 未設定なら表示しない).
  const showPacing = rr.preset === "thisMonth";

  const showGoals = rr.preset === "thisMonth" || rr.preset === "lastMonth";
  // Target month follows the *selected* period, not always the anchor's
  // month — previously this was hardcoded to anchor.slice(0,7), so picking
  // "先月" (lastMonth) still queried the current month's row in the 計画
  // sheet/targets_monthly table (targets and actuals silently mismatched by
  // one month). rr.current.start is authoritative for both thisMonth and
  // lastMonth since resolvePreset() already resolves lastMonth to the prior
  // calendar month's [start,end].
  const targetYm = rr.current.start.slice(0, 7);

  // Extra context modules (parallel fetch for speed). Products & GSC queries
  // now live on the /insights tab — dropped from here to declutter Overview.
  // Targets come from the upload SoT (targets_long → targets_monthly) only;
  // unset fields are null and render as「—」. Only one month is fetched —
  // goals/channel-target table are only rendered for single-month presets
  // anyway. Channel-level targets are only populated for clients whose
  // upload carries a per-channel breakdown for the selected month (today:
  // HS) — getChannelTargetsForMonth returns [] otherwise and the Overview
  // falls back to the plain Top-5-by-GA4-channel table.
  const [devicesResult, tgt, channelTargets] = await Promise.all([
    getDeviceTotals(client, anchor),
    getTargetsForMonth(client, targetYm),
    getChannelTargetsForMonth(client, targetYm),
  ]);
  const devices = devicesResult.rows;

  // Budget pacing — 予算(adSpendBudget)が未設定(null)なら計算せずバナーも出さない。
  const pacing =
    showPacing && tgt.adSpendBudget != null && tgt.adSpendBudget > 0
      ? analysePacing(
          costCur,
          tgt.adSpendBudget,
          new Date(`${anchor}T00:00:00Z`),
        )
      : null;

  // Actuals (topChannelsAll, from gaCurRows) follow whatever period the user
  // picked, but channelTargets is always a single-month row (targetYm) — the
  // two are only comparable when the selected preset resolves to exactly one
  // calendar month. showGoals already gates on thisMonth/lastMonth for the
  // same reason (the 3 GoalGauge cards above), so reuse it here rather than
  // rendering a target-vs-actual table where actuals span e.g. 6 months
  // against a 1-month target (previously ungated — any preset with an
  // HS-style channel-target sheet would render this table regardless).
  const channelTargetRows: ChannelTargetRow[] = (() => {
    if (!showGoals) return [];
    if (channelTargets.length === 0) return [];
    const byPlanChannel = new Map<
      string,
      { revenue: number; conversions: number }
    >();
    for (const c of topChannelsAll) {
      const planChannel =
        GA4_TO_PLAN_CHANNEL[c.channel] ?? UNMAPPED_PLAN_CHANNEL;
      const acc = byPlanChannel.get(planChannel) ?? {
        revenue: 0,
        conversions: 0,
      };
      acc.revenue += c.revenue;
      acc.conversions += c.conversions;
      byPlanChannel.set(planChannel, acc);
    }
    const targetByChannel = new Map(channelTargets.map((t) => [t.channel, t]));
    // Union of sheet-budgeted channels and GA4-observed channels, sheet order first.
    const order = [...channelTargets.map((t) => t.channel)];
    for (const k of byPlanChannel.keys()) {
      if (!order.includes(k)) order.push(k);
    }
    return order.map((channel) => {
      const actual = byPlanChannel.get(channel) ?? {
        revenue: 0,
        conversions: 0,
      };
      const target = targetByChannel.get(channel);
      return {
        channel,
        revenue: actual.revenue,
        conversions: actual.conversions,
        revenueTarget: target ? target.revenue : null,
        conversionsTarget: target ? target.conversions : null,
      };
    });
  })();

  // Card-level chip (C2-d) for the チャネル別 目標vs実績 card: reuses the
  // exact rows/thresholds ChannelTargetTable already renders per-cell
  // (achievementColour), so the chip can't disagree with the table under it.
  // sumAchievement returns ratio=null when no row carries a target (or the
  // summed target is 0) — achievementTone then returns null and no chip
  // renders, rather than a false "0% achieved" reading.
  const channelAchievement = sumAchievement(
    channelTargetRows.map((r) => ({
      actual: r.revenue,
      target: r.revenueTarget,
    })),
  );
  const channelAchievementTone = achievementTone(channelAchievement.ratio);

  const monthProgressNote = (() => {
    if (channelTargetRows.length === 0) return undefined;
    if (rr.preset === "lastMonth") return `${rr.presetLabel}（確定月）`;
    const d = new Date(`${anchor}T00:00:00Z`);
    const dayOfMonth = d.getUTCDate();
    const daysInMonth = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const pct = Math.round((dayOfMonth / daysInMonth) * 100);
    return `当月進捗: 経過${dayOfMonth}日/${daysInMonth}日（${pct}%）`;
  })();

  // Build a site-wide daily GA4 map so Big KPI sparklines reflect the actual
  // headline source. Previously sessions/ROAS sparks were faked (monthly
  // total / days → always flat, and ad-side conversionValue / cost instead
  // of GA4 revenue / cost → number mismatch with the KPI above it).
  const ga4DailyMap = new Map<
    string,
    { sessions: number; conversions: number; revenue: number }
  >();
  for (const r of ga4Daily) {
    const cur = ga4DailyMap.get(r.date) ?? {
      sessions: 0,
      conversions: 0,
      revenue: 0,
    };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    ga4DailyMap.set(r.date, cur);
  }
  // Media + ECCUBE daily maps for source-aware sparklines.
  const mediaDailyMap = new Map<
    string,
    { conversions: number; revenue: number }
  >();
  for (const d of daily) {
    mediaDailyMap.set(d.date, {
      conversions: d.conversions,
      revenue: d.conversionValue,
    });
  }
  const eccubeDailyMap = new Map<
    string,
    { conversions: number; revenue: number }
  >();
  for (const r of eccube.rows) {
    eccubeDailyMap.set(r.date, {
      conversions: r.conversions,
      revenue: r.revenue,
    });
  }
  function cvAt(date: string, src: "ga4" | "media" | "eccube"): number {
    return src === "ga4"
      ? (ga4DailyMap.get(date)?.conversions ?? 0)
      : src === "media"
        ? (mediaDailyMap.get(date)?.conversions ?? 0)
        : (eccubeDailyMap.get(date)?.conversions ?? 0);
  }
  function revAt(date: string, src: "ga4" | "media" | "eccube"): number {
    return src === "ga4"
      ? (ga4DailyMap.get(date)?.revenue ?? 0)
      : src === "media"
        ? (mediaDailyMap.get(date)?.revenue ?? 0)
        : (eccubeDailyMap.get(date)?.revenue ?? 0);
  }

  // Sessions is always GA4 — no per-source equivalent (media has clicks but
  // that's not sessions; ECCUBE has no traffic dim).
  const sessionsSpark = daily14.map(
    (d) => ga4DailyMap.get(d.date)?.sessions ?? 0,
  );
  const cvSpark = daily14.map((d) => cvAt(d.date, source));
  const revSpark = daily14.map((d) => revAt(d.date, source));
  const roasSpark = daily14.map((d) => {
    const rev = revAt(d.date, source);
    return d.cost > 0 ? (rev / d.cost) * 100 : 0;
  });
  // CPA sparkline: ad spend / effective-source CV per day.
  const cpaSpark = daily14.map((d) => {
    const conv = cvAt(d.date, source);
    return conv > 0 ? d.cost / conv : 0;
  });

  const fetchedAtLabel = fmtJstTime(fetchedAt);

  // Any upstream source running on mock fallback should surface the banner —
  // previously only the ad-sheet isMock was wired in, so a client with a
  // working ad sheet but a missing/failing GA4 property (or ECCUBE sheet)
  // silently showed mock GA4/ECCUBE numbers with no disclosure.
  const anyMock =
    isMock ||
    ga4Result.isMock ||
    ga4DailyResult.isMock ||
    devicesResult.isMock ||
    eccube.isMock;

  // Data-freshness banner (Batch2 監査P0): the ad rows' MAX(date) is already
  // in hand (adDates, sorted asc — also feeds `anchor` above), so no extra
  // query. Suppressed on mock data (MockBanner already covers that mode —
  // mock dates would make the freshness judgment meaningless anyway).
  const adMaxDate = anyMock ? null : (adDates[adDates.length - 1] ?? null);

  // Page-level "period has no data" statement (A-21 fix, item 4): both the
  // ad-side and GA4-side row sets for the SELECTED range are empty — e.g. a
  // custom date range before this client's data starts. Previously the
  // client had to infer this from zeros scattered across 5 KPI cards; state
  // it once, plainly, above the fold. Not shown on mock data (MockBanner
  // already covers that) or when there's at least some real data for the
  // period (a genuine measured zero on one metric is not this state).
  const periodEmpty = !anyMock && adCur.length === 0 && gaCurRows.length === 0;
  // Earliest date this client's data is actually known to start, so the
  // banner can offer a concrete next step ("try from {date}") instead of a
  // vague "pick another period" — adDates is already sorted ascending across
  // the client's FULL ad history (not just the selected range).
  const earliestAdDate = adDates[0];
  const earliestGa4Month = ga4[0]?.yearMonth;
  const sinceDate =
    earliestAdDate ?? (earliestGa4Month ? `${earliestGa4Month}-01` : undefined);

  // Item 8: viewer role hitting an editor-only settings surface used to be a
  // silent, unexplained redirect back here (settings/targets, /members). The
  // redirect now carries `?denied=targets|members` so the landing page can
  // state what happened instead of leaving the client to wonder why their
  // click/link did nothing.
  const denied =
    sp.denied === "targets" || sp.denied === "members" ? sp.denied : null;

  return (
    <div className="space-y-6">
      {/* C2-a: banners + page header + pacing alert are one tight cluster
          (space-y-3, 12px) instead of riding the page's normal space-y-6
          (24px) rhythm — they're all "before you see any data" chrome, not
          content sections that deserve full breathing room. The KPI grid
          onward keeps the normal 24px rhythm. */}
      <div className="space-y-3">
        <MockBanner isMock={anyMock} />
        <StaleDataBanner maxDate={adMaxDate} />
        {/* 末尾の状態（配信なし / 未取得）を広告詳細タブと同一文言で出す。片方の
            タブだけ日曜まで・もう片方は金曜までという不整合を作らないため。 */}
        {adTail &&
          (() => {
            const msg = tailNotice(adTail);
            if (!msg) return null;
            return (
              <div
                role={adTail.state === "not_fetched" ? "alert" : "note"}
                className={
                  adTail.state === "not_fetched"
                    ? "rounded-card border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900"
                    : "rounded-card border bg-muted px-3 py-2 text-xs text-muted-foreground"
                }
              >
                {msg}
              </div>
            );
          })()}
        {denied && <PermissionDeniedNotice surface={denied} />}
        <FirstRunGuide />
        <PageHeader
          kicker="サマリー"
          title={<>サマリー · {rr.presetLabel}</>}
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
              <SourceToggle
                sources={
                  hasEccube ? ["ga4", "media", "eccube"] : ["ga4", "media"]
                }
              />
              <div className="text-xs text-muted-foreground">
                最終取得 {fetchedAtLabel}
              </div>
              <PrintButton />
              <RefreshButton clientId={client.id} />
            </>
          }
        />
        {periodEmpty && (
          <AbsenceNotice
            compact
            reason="no_data_period"
            detail={{
              periodLabel: `${rr.current.start} 〜 ${rr.current.end}`,
              sinceDate,
            }}
          />
        )}
        {source === "eccube" && hasEccube && (
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            表示値: ECCUBE 購入実績（shop DB 直接）。データ開始日:
            <span className="ml-1 font-mono">{eccube.rows[0].date}</span>
            {rr.current.start < eccube.rows[0].date && (
              <>
                {" · "}
                この期間の一部は ECCUBE データ未取得のため売上・CV
                が過小表示されている可能性あり。
              </>
            )}
          </div>
        )}

        {pacing && tgt.adSpendBudget != null && (
          <PacingAlert
            result={pacing}
            actualSpend={costCur}
            monthlyBudget={tgt.adSpendBudget}
          />
        )}
      </div>

      {/* 5 big KPI with sparklines */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <BigKpiCard
          label={KPI_LABELS[source].revenue}
          value={fmtJpy(effectiveRev)}
          caption={
            showGoals && tgt.revenue != null && tgt.revenue > 0
              ? `目標 ${fmtJpy(tgt.revenue)} の ${pctOfTarget(effectiveRev, tgt.revenue)}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtJpy(effectiveRevPrev)}`
                : "比較対象なし（今期のみ）"
          }
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta: pct(effectiveRev, effectiveRevPrev),
                }
              : undefined
          }
          sparkline={revSpark}
          sparkDates={sparkDates}
          sparkFormat="jpy"
          icon={JapaneseYen}
          hue="chart-1"
        />
        <BigKpiCard
          label={KPI_LABELS[source].cv}
          value={fmtInt(effectiveCv)}
          caption={
            showGoals && tgt.conversions != null && tgt.conversions > 0
              ? `目標 ${fmtInt(tgt.conversions)} の ${pctOfTarget(effectiveCv, tgt.conversions)}%`
              : rr.previous
                ? `${rr.compareLabel} ${fmtInt(effectiveCvPrev)}`
                : "比較対象なし（今期のみ）"
          }
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta: pct(effectiveCv, effectiveCvPrev),
                }
              : undefined
          }
          sparkline={cvSpark}
          sparkDates={sparkDates}
          sparkFormat="int"
          icon={Target}
          hue="chart-3"
        />
        <BigKpiCard
          label="SESSION (GA4)"
          value={fmtInt(gaCur.sessions)}
          caption={
            rr.previous
              ? `${rr.compareLabel} ${fmtInt(gaPrev.sessions)}`
              : "比較対象なし（今期のみ）"
          }
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta: pct(gaCur.sessions, gaPrev.sessions),
                }
              : undefined
          }
          sparkline={sessionsSpark}
          sparkDates={sparkDates}
          sparkFormat="int"
          icon={Users}
          hue="chart-7"
        />
        <BigKpiCard
          label={KPI_LABELS[source].cpa}
          value={blendedCpa != null ? fmtJpy(blendedCpa) : "—"}
          caption={KPI_COST_NOTE}
          lowerIsBetter
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta:
                    blendedCpa != null && blendedCpaPrev != null
                      ? pct(blendedCpa, blendedCpaPrev)
                      : null,
                }
              : undefined
          }
          sparkline={cpaSpark}
          sparkDates={sparkDates}
          sparkFormat="jpy"
          icon={Receipt}
          hue="chart-6"
        />
        <BigKpiCard
          label={KPI_LABELS[source].roas}
          value={blendedRoas != null ? fmtRatioPct(blendedRoas * 100, 0) : "—"}
          caption={KPI_COST_NOTE}
          comparison={
            rr.previous
              ? {
                  label: rr.compareLabel,
                  delta:
                    blendedRoas != null && blendedRoasPrev != null
                      ? pct(blendedRoas, blendedRoasPrev)
                      : null,
                }
              : undefined
          }
          sparkline={roasSpark}
          sparkDates={sparkDates}
          sparkFormat="pct"
          icon={TrendingUp}
          hue="chart-4"
        />
      </div>

      {showGoals &&
        clientHasTargets(client) &&
        (tgt.revenue != null ||
        tgt.conversions != null ||
        tgt.adSpendBudget != null ? (
          <div className="grid gap-5 sm:grid-cols-3">
            {tgt.revenue != null && (
              <GoalGauge
                label="売上達成"
                actual={fmtJpy(effectiveRev)}
                target={fmtJpy(tgt.revenue)}
                ratio={effectiveRev / (tgt.revenue || 1)}
              />
            )}
            {tgt.conversions != null && (
              <GoalGauge
                label="CV 達成"
                actual={fmtInt(effectiveCv)}
                target={fmtInt(tgt.conversions)}
                ratio={effectiveCv / (tgt.conversions || 1)}
              />
            )}
            {tgt.adSpendBudget != null && (
              <GoalGauge
                label="広告予算消化"
                actual={fmtJpy(costCur)}
                target={fmtJpy(tgt.adSpendBudget)}
                ratio={costCur / (tgt.adSpendBudget || 1)}
                hint={costCur > tgt.adSpendBudget ? "予算超過" : undefined}
              />
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            目標未設定（—）。設定画面の目標アップロードから当月の目標を登録すると達成率が表示されます。
          </div>
        ))}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            月次チャネル別（GA4 · 過去12ヶ月・参考）
          </CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            チャネル別内訳は GA4
            のみで集計しています。売上・CVは常にGA4の購入実績を使用しており、上部の表示値トグルの選択には連動しません。
          </div>
        </CardHeader>
        <CardContent>
          <ChannelStackedBar
            data={ga4Last12Months}
            defaultMetric="sessions"
            secondaryDefs={ga4SecondaryEventDefs(client)}
            absenceReason={client.ga4PropertyId ? undefined : "not_configured"}
            title="月次チャネル別（GA4 過去12ヶ月）"
          />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            日別/週別チャネル別（GA4 · 過去90日）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelTrendChart
            data={ga4Daily}
            defaultMetric="sessions"
            defaultGranularity="day"
            secondaryDefs={ga4SecondaryEventDefs(client)}
            absenceReason={client.ga4PropertyId ? undefined : "not_configured"}
            title="日別/週別チャネル別（GA4 過去90日）"
          />
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">
            新規 vs リピート Users（GA4 · 過去6ヶ月・参考）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewVsRepeatChart
            data={newVsRepeat}
            absenceReason={client.ga4PropertyId ? undefined : "not_configured"}
            title="新規 vs リピート Users（GA4 過去6ヶ月）"
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 意図的にデータ駆動: チャネル別目標(matrix形式シート)が取れるクライアントは自動で
            目標対比カードへ切替。HS固定ゲートにしない（他クライアントのシートが matrix 化されたら
            自動有効化する設計、2026-07-02 Codex監査で協議の上維持）。非対応クライアントは Top5 表示。 */}
        {channelTargetRows.length > 0 ? (
          <Card className="shadow-card">
            {/* flex-wrap (Phase H): this header is a flex ROW holding a long
                description block plus a shrink-0 StatusChip, with no wrapping
                allowed — so on a 375px screen the two could not fit on one
                ~295px line and the chip pushed the page 27px sideways on every
                client that has channel targets configured (MSEC has none, so it
                renders no chip and never showed the bug). Allowing the row to
                wrap lets the chip drop to its own line instead of widening the
                card. Same idiom PacingAlert already uses. */}
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                {/* 期間ラベルを動的化 — 固定「（当月）」だと 先月 選択時に実績と表示が矛盾する
                    （channelTargetRows は showGoals=thisMonth/lastMonth の時のみ populate、上参照）。 */}
                <CardTitle className="text-base">
                  チャネル別 目標vs実績（{rr.presetLabel}）
                </CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">
                  実績は GA4 チャネル別（{rr.presetLabel}
                  ）を計画シートのチャネル区分（organic/direct/mail/referral/広告）へ集約。目標欄が「—」の行は計画シートに対応する区分がないチャネル（実績のみ表示）
                </div>
              </div>
              {/* C2-d: card-level chip, reusing the exact ratio the table
                  below already colours per-cell — see channelAchievement /
                  channelAchievementTone above. No target configured (MSEC-
                  style) or a zero summed target => tone is null => no chip,
                  never a false "0% achieved". */}
              {channelAchievementTone && (
                <StatusChip tone={channelAchievementTone}>
                  売上達成率{" "}
                  {fmtRatioPct((channelAchievement.ratio ?? 0) * 100, 0)}
                  {/* E-3: the chip's tone (colour) was the only signal for
                      whether this percentage was on-track — a qualifier
                      word makes that explicit in text too when it's not a
                      clean pass. */}
                  {channelAchievementTone !== "positive" &&
                    (channelAchievementTone === "warning"
                      ? "（未達）"
                      : "（大幅未達）")}
                </StatusChip>
              )}
            </CardHeader>
            <CardContent>
              <ChannelTargetTable
                rows={channelTargetRows}
                progressNote={monthProgressNote}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Top 5 チャネル（GA4）</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>チャネル</TableHead>
                    <TableHead className="text-right">SESSION</TableHead>
                    <TableHead className="text-right">CV</TableHead>
                    <TableHead className="text-right">CVR</TableHead>
                    <TableHead className="text-right">売上</TableHead>
                    <TableHead className="text-right">売上比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topChannels.length === 0 && (
                    <AbsenceTableRow
                      colSpan={6}
                      reason="no_data_period"
                      detail={{
                        periodLabel: `${rr.current.start} 〜 ${rr.current.end}`,
                        sinceDate,
                      }}
                    />
                  )}
                  {topChannels.map((c) => {
                    const cvr = safeDiv(c.conversions, c.sessions);
                    return (
                      <TableRow key={c.channel}>
                        <TableCell className="font-medium">
                          {c.channel}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtInt(c.sessions)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtInt(c.conversions)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtPct(cvr, 2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtJpy(c.revenue)}
                        </TableCell>
                        <TableCell>
                          <ShareBar
                            ratio={computeShare(c.revenue, totalChannelRevenue)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">デバイス別</CardTitle>
          </CardHeader>
          <CardContent>
            <DeviceBar
              rows={devices}
              absenceReason={
                client.ga4PropertyId ? undefined : "not_configured"
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Item 8 fix: a viewer-role user hitting /settings/targets or
 * /settings/members used to be silently redirected here with no
 * explanation (settings/targets/page.tsx, settings/members/page.tsx — both
 * already `redirect(`/dashboard/${slug}`)` on a failed `canInviteMembers`
 * check). The redirect now carries `?denied=targets|members`; this renders
 * the reason instead of leaving the navigation looking broken. Neutral tone
 * (`permissionDeniedCopy`'s `tone: "neutral"`) — this is a designed access
 * boundary, not an error.
 */
function PermissionDeniedNotice({
  surface,
}: {
  surface: "targets" | "members";
}) {
  const copy = permissionDeniedCopy(surface);
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
    >
      <div>
        <div className="font-semibold text-foreground">{copy.title}</div>
        <div className="text-xs">{copy.body}</div>
      </div>
    </div>
  );
}
