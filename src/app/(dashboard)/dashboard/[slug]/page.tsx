import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows } from "@/lib/sources/raw";
import {
  getGa4MonthlyChannels,
  getDeviceTotals,
  getTopProducts,
} from "@/lib/sources/ga4";
import { getTopGscQueries } from "@/lib/sources/gsc";
import { resolveFromSearchParams, type DateRange } from "@/lib/range";
import { aggregateByDate, filterByRange } from "@/lib/metrics";
import { analysePacing, lastN } from "@/lib/analysis";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import GoalGauge from "@/components/dashboard/GoalGauge";
import PacingAlert from "@/components/dashboard/PacingAlert";
import DeviceBar from "@/components/dashboard/DeviceBar";
import ProductRanking from "@/components/dashboard/ProductRanking";
import GscQueryTable from "@/components/dashboard/GscQueryTable";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
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
  const client = await assertUserCanAccessClientBySlug(slug);

  const { rows: adRows, fetchedAt, isMock } = await getDailyRows(client);
  const ga4 = await getGa4MonthlyChannels(client);

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

  const blendedCpa = safeDiv(costCur, gaCur.conversions);
  const blendedRoas = safeDiv(gaCur.revenue, costCur);
  const blendedCpaPrev = safeDiv(costPrev, gaPrev.conversions);
  const blendedRoasPrev = safeDiv(gaPrev.revenue, costPrev);

  // Sparkline: last 14 days of (ad-side) daily series within the range.
  const daily = aggregateByDate(adCur);
  const costSpark = lastN(daily, 14).map((d) => d.cost);
  const cvSpark = lastN(daily, 14).map((d) => d.conversions);
  const revSpark = lastN(daily, 14).map((d) => d.conversionValue);

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
  const tgt = client.monthlyTargets;

  // Extra context modules (parallel fetch for speed).
  const [devices, topProducts, topQueries] = await Promise.all([
    getDeviceTotals(client, anchor),
    getTopProducts(client),
    getTopGscQueries(client),
  ]);

  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
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
          <div className="text-xs text-muted-foreground">
            最終取得 {fetchedAtLabel}
            {isMock && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">MOCK</span>}
          </div>
          <PrintButton />
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      {pacing && (
        <PacingAlert result={pacing} actualSpend={costCur} monthlyBudget={tgt.adSpendBudget} />
      )}

      {/* 5 big KPI with sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <BigKpiCard
          label="Revenue"
          value={fmtJpy(gaCur.revenue)}
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(gaCur.revenue, gaPrev.revenue) }] : []}
          sparkline={revSpark}
        />
        <BigKpiCard
          label="CV"
          value={fmtInt(gaCur.conversions)}
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(gaCur.conversions, gaPrev.conversions) }] : []}
          sparkline={cvSpark}
        />
        <BigKpiCard
          label="Sessions"
          value={fmtInt(gaCur.sessions)}
          comparisons={rr.previous ? [{ label: rr.compareLabel, delta: pct(gaCur.sessions, gaPrev.sessions) }] : []}
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
          sparkline={costSpark}
          sparkTone="negative"
        />
        <BigKpiCard
          label="Blended ROAS"
          value={blendedRoas != null ? fmtRatioPct(blendedRoas * 100, 0) : "—"}
          comparisons={
            rr.previous && blendedRoas != null && blendedRoasPrev != null
              ? [{ label: rr.compareLabel, delta: pct(blendedRoas, blendedRoasPrev) }]
              : []
          }
        />
      </div>

      {showGoals && (
        <div className="grid gap-4 sm:grid-cols-3">
          <GoalGauge
            label="Revenue 達成"
            actual={fmtJpy(gaCur.revenue)}
            target={fmtJpy(tgt.revenue)}
            ratio={gaCur.revenue / (tgt.revenue || 1)}
          />
          <GoalGauge
            label="CV 達成"
            actual={fmtInt(gaCur.conversions)}
            target={fmtInt(tgt.conversions)}
            ratio={gaCur.conversions / (tgt.conversions || 1)}
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
          <CardTitle className="text-sm">月次チャネル別（過去12ヶ月・参考）</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelStackedBar data={ga4} defaultMetric="sessions" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 5 チャネル</CardTitle>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">商品別売上 Top 10</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductRanking rows={topProducts} limit={10} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">オーガニック検索クエリ Top 10（GSC）</CardTitle>
          </CardHeader>
          <CardContent>
            <GscQueryTable rows={topQueries} limit={10} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
