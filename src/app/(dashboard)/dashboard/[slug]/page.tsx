import { assertUserCanAccessClientBySlug } from "@/lib/access";
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
import { getTargetsForMonth, getChannelTargetsForMonth, GA4_TO_PLAN_CHANNEL, UNMAPPED_PLAN_CHANNEL } from "@/lib/sources/target";
import { resolveFromSearchParams, type DateRange } from "@/lib/range";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { analysePacing, lastN } from "@/lib/analysis";
import { readSource } from "@/lib/source";
import SourceToggle from "@/components/dashboard/SourceToggle";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import ChannelTrendChart from "@/components/dashboard/ChannelTrendChart";
import ChannelTargetTable, { type ChannelTargetRow } from "@/components/dashboard/ChannelTargetTable";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import GoalGauge from "@/components/dashboard/GoalGauge";
import PacingAlert from "@/components/dashboard/PacingAlert";
import DeviceBar from "@/components/dashboard/DeviceBar";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import MockBanner from "@/components/dashboard/MockBanner";
import StaleDataBanner from "@/components/dashboard/StaleDataBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

function filterChannelDaysByRange(rows: ChannelDay[], r: DateRange): ChannelDay[] {
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
function filterGa4MonthlyByRange<T extends { yearMonth: string }>(rows: T[], r: DateRange): T[] {
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
  let sessions = 0, conversions = 0, revenue = 0;
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
  ga4Monthly: Array<{ yearMonth: string; channel: ChannelGroup; sessions: number; conversions: number; revenue: number }>,
  r: DateRange
): Array<{ channel: ChannelGroup; sessions: number; conversions: number; revenue: number }> {
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

  const { rows: adRows, fetchedAt, isMock } = await getDailyRows(client);
  const [ga4Result, ga4DailyResult, eccube] = await Promise.all([
    getGa4MonthlyChannels(client),
    getGa4DailyChannels(client),
    getEccubeDaily(client),
  ]);
  const ga4 = ga4Result.rows;
  const ga4Daily = ga4DailyResult.rows;
  const hasEccube = eccube.rows.length > 0;

  const adDates = adRows.map((r) => r.date).filter(Boolean).sort();
  const anchor =
    adDates[adDates.length - 1] ??
    `${ga4[ga4.length - 1]?.yearMonth ?? new Date().toISOString().slice(0, 7)}-01`;

  const rr = resolveFromSearchParams(sp, { preset: "thisMonth", compare: "prev" }, anchor);

  const adCur = filterByRange(adRows, rr.current.start, rr.current.end);
  const gaCurRows = resolveGa4ChannelRows(ga4Daily, ga4, rr.current);
  const gaCur = sumGa4(gaCurRows);
  const costCur = adCur.reduce((s, r) => s + r.cost, 0);

  const adPrev = rr.previous ? filterByRange(adRows, rr.previous.start, rr.previous.end) : [];
  const gaPrevRows = rr.previous ? resolveGa4ChannelRows(ga4Daily, ga4, rr.previous) : [];
  const gaPrev = sumGa4(gaPrevRows);
  const costPrev = adPrev.reduce((s, r) => s + r.cost, 0);

  // ECCUBE aggregates within the current/previous window.
  const eccubeCur = sumEccubeRange(eccube.rows, rr.current.start, rr.current.end);
  const eccubePrev = rr.previous
    ? sumEccubeRange(eccube.rows, rr.previous.start, rr.previous.end)
    : { conversions: 0, revenue: 0, avgOrderValue: null };

  // Ad-side totals for CV/Revenue — needed for the 媒体 source path.
  const adTotals = sumRows(adCur);
  const adTotalsPrev = sumRows(adPrev);

  // Select the effective CV/Revenue per source. Cost always comes from ad
  // rows — it's not a revenue-side metric. Blended CPA/ROAS are computed
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
  const byChannel = new Map<string, { channel: ChannelGroup; sessions: number; conversions: number; revenue: number }>();
  for (const r of gaCurRows) {
    const cur = byChannel.get(r.channel) ?? { channel: r.channel, sessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    byChannel.set(r.channel, cur);
  }
  const topChannelsAll = Array.from(byChannel.values());
  const topChannels = topChannelsAll.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Budget pacing — only when the preset is "当月".
  const showPacing = rr.preset === "thisMonth";
  const pacing = showPacing
    ? analysePacing(costCur, client.monthlyTargets.adSpendBudget, new Date(`${anchor}T00:00:00Z`))
    : null;

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
  // Prefer the sheet-based monthly target for the selected month; static
  // config is the fallback. Only one month is fetched — goals/channel-target
  // table are only rendered for single-month presets anyway. Channel-level
  // targets are only populated for clients whose 計画 sheet carries a
  // per-channel breakdown for the selected month (today: HS) —
  // getChannelTargetsForMonth returns [] otherwise and the Overview falls
  // back to the plain Top-5-by-GA4-channel table.
  const [devicesResult, tgt, channelTargets] = await Promise.all([
    getDeviceTotals(client, anchor),
    getTargetsForMonth(client, targetYm),
    getChannelTargetsForMonth(client, targetYm),
  ]);
  const devices = devicesResult.rows;

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
    const byPlanChannel = new Map<string, { revenue: number; conversions: number }>();
    for (const c of topChannelsAll) {
      const planChannel = GA4_TO_PLAN_CHANNEL[c.channel] ?? UNMAPPED_PLAN_CHANNEL;
      const acc = byPlanChannel.get(planChannel) ?? { revenue: 0, conversions: 0 };
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
      const actual = byPlanChannel.get(channel) ?? { revenue: 0, conversions: 0 };
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

  const monthProgressNote = (() => {
    if (channelTargetRows.length === 0) return undefined;
    if (rr.preset === "lastMonth") return `${rr.presetLabel}（確定月）`;
    const d = new Date(`${anchor}T00:00:00Z`);
    const dayOfMonth = d.getUTCDate();
    const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const pct = Math.round((dayOfMonth / daysInMonth) * 100);
    return `当月進捗: 経過${dayOfMonth}日/${daysInMonth}日（${pct}%）`;
  })();

  // Build a site-wide daily GA4 map so Big KPI sparklines reflect the actual
  // headline source. Previously sessions/ROAS sparks were faked (monthly
  // total / days → always flat, and ad-side conversionValue / cost instead
  // of GA4 revenue / cost → number mismatch with the KPI above it).
  const ga4DailyMap = new Map<string, { sessions: number; conversions: number; revenue: number }>();
  for (const r of ga4Daily) {
    const cur = ga4DailyMap.get(r.date) ?? { sessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    ga4DailyMap.set(r.date, cur);
  }
  // Media + ECCUBE daily maps for source-aware sparklines.
  const mediaDailyMap = new Map<string, { conversions: number; revenue: number }>();
  for (const d of daily) {
    mediaDailyMap.set(d.date, { conversions: d.conversions, revenue: d.conversionValue });
  }
  const eccubeDailyMap = new Map<string, { conversions: number; revenue: number }>();
  for (const r of eccube.rows) {
    eccubeDailyMap.set(r.date, { conversions: r.conversions, revenue: r.revenue });
  }
  function cvAt(date: string, src: "ga4" | "media" | "eccube"): number {
    return src === "ga4"
      ? ga4DailyMap.get(date)?.conversions ?? 0
      : src === "media"
      ? mediaDailyMap.get(date)?.conversions ?? 0
      : eccubeDailyMap.get(date)?.conversions ?? 0;
  }
  function revAt(date: string, src: "ga4" | "media" | "eccube"): number {
    return src === "ga4"
      ? ga4DailyMap.get(date)?.revenue ?? 0
      : src === "media"
      ? mediaDailyMap.get(date)?.revenue ?? 0
      : eccubeDailyMap.get(date)?.revenue ?? 0;
  }

  // Sessions is always GA4 — no per-source equivalent (media has clicks but
  // that's not sessions; ECCUBE has no traffic dim).
  const sessionsSpark = daily14.map((d) => ga4DailyMap.get(d.date)?.sessions ?? 0);
  const cvSpark = daily14.map((d) => cvAt(d.date, source));
  const revSpark = daily14.map((d) => revAt(d.date, source));
  const roasSpark = daily14.map((d) => {
    const rev = revAt(d.date, source);
    return d.cost > 0 ? (rev / d.cost) * 100 : 0;
  });
  // CPA sparkline: blended CPA = ad spend / effective-source CV per day.
  const cpaSpark = daily14.map((d) => {
    const conv = cvAt(d.date, source);
    return conv > 0 ? d.cost / conv : 0;
  });

  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Any upstream source running on mock fallback should surface the banner —
  // previously only the ad-sheet isMock was wired in, so a client with a
  // working ad sheet but a missing/failing GA4 property (or ECCUBE sheet)
  // silently showed mock GA4/ECCUBE numbers with no disclosure.
  const anyMock =
    isMock || ga4Result.isMock || ga4DailyResult.isMock || devicesResult.isMock || eccube.isMock;

  // Data-freshness banner (Batch2 監査P0): the ad rows' MAX(date) is already
  // in hand (adDates, sorted asc — also feeds `anchor` above), so no extra
  // query. Suppressed on mock data (MockBanner already covers that mode —
  // mock dates would make the freshness judgment meaningless anyway).
  const adMaxDate = anyMock ? null : adDates[adDates.length - 1] ?? null;

  return (
    <div className="space-y-6">
      <MockBanner isMock={anyMock} />
      <StaleDataBanner maxDate={adMaxDate} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Overview</div>
          <h1 className="text-2xl font-semibold tracking-tight">{rr.presetLabel}</h1>
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
          <SourceToggle sources={hasEccube ? ["ga4", "media", "eccube"] : ["ga4", "media"]} />
          <div className="text-xs text-muted-foreground">最終取得 {fetchedAtLabel}</div>
          <PrintButton />
          <RefreshButton clientId={client.id} />
        </div>
      </div>
      {source === "eccube" && hasEccube && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          表示値: ECCUBE 購入実績（shop DB 直接）。データ開始日:
          <span className="ml-1 font-mono">{eccube.rows[0].date}</span>
          {rr.current.start < eccube.rows[0].date && (
            <span className="ml-2">
              · この期間の一部は ECCUBE データ未取得のため売上・CV が過小表示されている可能性あり。
            </span>
          )}
        </div>
      )}

      {pacing && (
        <PacingAlert result={pacing} actualSpend={costCur} monthlyBudget={tgt.adSpendBudget} />
      )}

      {/* 5 big KPI with sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <BigKpiCard
          label={source === "ga4" ? "Revenue (GA4)" : source === "media" ? "Revenue (媒体)" : "Revenue (ECCUBE)"}
          value={fmtJpy(effectiveRev)}
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(effectiveRev, effectiveRevPrev) }] : []}
          sparkline={revSpark}
          sparkDates={sparkDates}
          sparkFormat="jpy"
        />
        <BigKpiCard
          label={source === "ga4" ? "CV (GA4)" : source === "media" ? "CV (媒体)" : "CV (ECCUBE)"}
          value={fmtInt(effectiveCv)}
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(effectiveCv, effectiveCvPrev) }] : []}
          sparkline={cvSpark}
          sparkDates={sparkDates}
          sparkFormat="int"
        />
        <BigKpiCard
          label="Sessions"
          value={fmtInt(gaCur.sessions)}
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(gaCur.sessions, gaPrev.sessions) }] : []}
          sparkline={sessionsSpark}
          sparkDates={sparkDates}
          sparkFormat="int"
        />
        <BigKpiCard
          label="Blended CPA"
          value={blendedCpa != null ? fmtJpy(blendedCpa) : "—"}
          lowerIsBetter
          comparisons={
            rr.previous && blendedCpa != null && blendedCpaPrev != null
              ? [{ label: rr.compareLabel, delta: pct(blendedCpa, blendedCpaPrev) }]
              : []
          }
          sparkline={cpaSpark}
          sparkDates={sparkDates}
          sparkFormat="jpy"
        />
        <BigKpiCard
          label="Blended ROAS"
          value={blendedRoas != null ? fmtRatioPct(blendedRoas * 100, 0) : "—"}
          comparisons={
            rr.previous && blendedRoas != null && blendedRoasPrev != null
              ? [{ label: rr.compareLabel, delta: pct(blendedRoas, blendedRoasPrev) }]
              : []
          }
          sparkline={roasSpark}
          sparkDates={sparkDates}
          sparkFormat="pct"
        />
      </div>

      {showGoals && (
        <div className="grid gap-4 sm:grid-cols-3">
          <GoalGauge
            label="Revenue 達成"
            actual={fmtJpy(effectiveRev)}
            target={fmtJpy(tgt.revenue)}
            ratio={effectiveRev / (tgt.revenue || 1)}
          />
          <GoalGauge
            label="CV 達成"
            actual={fmtInt(effectiveCv)}
            target={fmtInt(tgt.conversions)}
            ratio={effectiveCv / (tgt.conversions || 1)}
          />
          <GoalGauge
            label="広告予算消化"
            actual={fmtJpy(costCur)}
            target={fmtJpy(tgt.adSpendBudget)}
            ratio={costCur / (tgt.adSpendBudget || 1)}
            hint={costCur > tgt.adSpendBudget ? "予算超過" : undefined}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">月次チャネル別（GA4 · 過去12ヶ月・参考）</CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            チャネル別内訳は GA4 のみ。売上・CV は GA4 `purchaseRevenue` /
            `ecommercePurchases`（上の表示値トグルには非連動）
          </div>
        </CardHeader>
        <CardContent>
          <ChannelStackedBar data={ga4Last12Months} defaultMetric="sessions" secondaryDefs={ga4SecondaryEventDefs(client)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">日別/週別チャネル別（GA4 · 過去90日）</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelTrendChart
            data={ga4Daily}
            defaultMetric="sessions"
            defaultGranularity="day"
            secondaryDefs={ga4SecondaryEventDefs(client)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">新規 vs リピート Users（GA4 · 過去6ヶ月・参考）</CardTitle>
        </CardHeader>
        <CardContent>
          <NewVsRepeatChart data={newVsRepeat} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 意図的にデータ駆動: チャネル別目標(matrix形式シート)が取れるクライアントは自動で
            目標対比カードへ切替。HS固定ゲートにしない（他クライアントのシートが matrix 化されたら
            自動有効化する設計、2026-07-02 Codex監査で協議の上維持）。非対応クライアントは Top5 表示。 */}
        {channelTargetRows.length > 0 ? (
          <Card>
            <CardHeader>
              {/* 期間ラベルを動的化 — 固定「（当月）」だと 先月 選択時に実績と表示が矛盾する
                  （channelTargetRows は showGoals=thisMonth/lastMonth の時のみ populate、上参照）。 */}
              <CardTitle className="text-sm">チャネル別 目標vs実績（{rr.presetLabel}）</CardTitle>
              <div className="mt-1 text-xs text-muted-foreground">
                実績は GA4 チャネル別（{rr.presetLabel}）を計画シートのチャネル区分（organic/direct/mail/referral/広告）へ集約。目標欄が「—」の行は計画シートに対応する区分がないチャネル（実績のみ表示）
              </div>
            </CardHeader>
            <CardContent>
              <ChannelTargetTable rows={channelTargetRows} progressNote={monthProgressNote} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 5 チャネル（GA4）</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>チャネル</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">CV</TableHead>
                    <TableHead className="text-right">CVR</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topChannels.map((c) => {
                    const cvr = safeDiv(c.conversions, c.sessions);
                    return (
                      <TableRow key={c.channel}>
                        <TableCell className="font-medium">{c.channel}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtInt(c.sessions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtInt(c.conversions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtPct(cvr, 2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtJpy(c.revenue)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">デバイス別</CardTitle>
          </CardHeader>
          <CardContent>
            <DeviceBar rows={devices} />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
