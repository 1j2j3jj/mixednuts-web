import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows } from "@/lib/sources/raw";
import {
  getGa4MonthlyChannels,
  getGa4DailyChannels,
  getDeviceTotals,
} from "@/lib/sources/ga4";
import { getEccubeDaily, sumEccubeRange } from "@/lib/sources/eccube";
import { getTargetsForMonth } from "@/lib/sources/target";
import { resolveFromSearchParams, type DateRange } from "@/lib/range";
import { aggregateByDate, filterByRange, sumRows } from "@/lib/metrics";
import { analysePacing, lastN } from "@/lib/analysis";
import { readSource } from "@/lib/source";
import SourceToggle from "@/components/dashboard/SourceToggle";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import ChannelTrendChart from "@/components/dashboard/ChannelTrendChart";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import GoalGauge from "@/components/dashboard/GoalGauge";
import PacingAlert from "@/components/dashboard/PacingAlert";
import DeviceBar from "@/components/dashboard/DeviceBar";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import MockBanner from "@/components/dashboard/MockBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

export const dynamic = "force-dynamic";

function filterGa4ByRange<T extends { yearMonth: string }>(rows: T[], r: DateRange): T[] {
  return rows.filter((x) => {
    const monthStart = `${x.yearMonth}-01`;
    const [y, m] = x.yearMonth.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return monthStart <= r.end && monthEnd >= r.start;
  });
}

function sumGa4(rows: Array<{ sessions: number; conversions: number; revenue: number; newUsers: number; returningUsers: number }>) {
  let sessions = 0, conversions = 0, revenue = 0, newUsers = 0, returningUsers = 0;
  for (const r of rows) {
    sessions += r.sessions;
    conversions += r.conversions;
    revenue += r.revenue;
    newUsers += r.newUsers;
    returningUsers += r.returningUsers;
  }
  return { sessions, conversions, revenue, newUsers, returningUsers };
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
  const ga4 = await getGa4MonthlyChannels(client);
  const eccube = await getEccubeDaily(client);
  const hasEccube = eccube.rows.length > 0;

  const adDates = adRows.map((r) => r.date).filter(Boolean).sort();
  const anchor =
    adDates[adDates.length - 1] ??
    `${ga4[ga4.length - 1]?.yearMonth ?? new Date().toISOString().slice(0, 7)}-01`;

  const rr = resolveFromSearchParams(sp, { preset: "last28", compare: "prev" }, anchor);

  const adCur = filterByRange(adRows, rr.current.start, rr.current.end);
  const gaCurRows = filterGa4ByRange(ga4, rr.current);
  const gaCur = sumGa4(gaCurRows);
  const costCur = adCur.reduce((s, r) => s + r.cost, 0);

  const adPrev = rr.previous ? filterByRange(adRows, rr.previous.start, rr.previous.end) : [];
  const gaPrevRows = rr.previous ? filterGa4ByRange(ga4, rr.previous) : [];
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

  // Top 5 channels.
  const byChannel = new Map<string, { channel: string; sessions: number; conversions: number; revenue: number }>();
  for (const r of gaCurRows) {
    const cur = byChannel.get(r.channel) ?? { channel: r.channel, sessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    byChannel.set(r.channel, cur);
  }
  const topChannels = Array.from(byChannel.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Budget pacing — only when the preset is "当月".
  const showPacing = rr.preset === "thisMonth";
  const pacing = showPacing
    ? analysePacing(costCur, client.monthlyTargets.adSpendBudget, new Date(`${anchor}T00:00:00Z`))
    : null;

  const showGoals = rr.preset === "thisMonth" || rr.preset === "lastMonth";
  // Prefer the sheet-based monthly target for the anchor month; static config
  // is the fallback. Only one month is fetched — goals are only rendered for
  // single-month presets anyway.
  const tgt = await getTargetsForMonth(client, anchor.slice(0, 7));

  // Extra context modules (parallel fetch for speed). Products & GSC queries
  // now live on the /insights tab — dropped from here to declutter Overview.
  const [devices, ga4Daily] = await Promise.all([
    getDeviceTotals(client, anchor),
    getGa4DailyChannels(client),
  ]);

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

  return (
    <div className="space-y-6">
      <MockBanner isMock={isMock} />
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
          <ChannelStackedBar data={ga4} defaultMetric="sessions" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">日別/週別チャネル別（GA4 · 過去90日）</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelTrendChart data={ga4Daily} defaultMetric="sessions" defaultGranularity="day" />
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
