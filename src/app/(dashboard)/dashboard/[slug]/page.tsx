import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows } from "@/lib/sources/raw";
import { getGa4MonthlyChannels } from "@/lib/sources/ga4";
import { resolveFromSearchParams, type DateRange } from "@/lib/range";
import { filterByRange } from "@/lib/metrics";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import GoalGauge from "@/components/dashboard/GoalGauge";
import RefreshButton from "@/components/dashboard/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtInt, fmtJpy, fmtPct, fmtRatioPct, safeDiv } from "@/lib/utils";

/**
 * Screen 1 — Overview.
 *
 * Range-aware: aggregates ad spend (daily raw) within the selected range,
 * and sums GA4 months overlapping the range. The 12-month stacked bar is
 * intentionally range-independent — context, not measurement.
 */
export const dynamic = "force-dynamic";

/** Sum GA4 monthly rows whose yearMonth overlaps the [start, end] range. */
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
  const ga4 = getGa4MonthlyChannels(client);

  // Anchor: the latest date for which we have ad data (keeps "last 28 days"
  // honest when the sheet hasn't been updated yet). Fallback to the GA4 anchor.
  const adDates = adRows.map((r) => r.date).filter(Boolean).sort();
  const anchor =
    adDates[adDates.length - 1] ??
    `${ga4[ga4.length - 1]?.yearMonth ?? new Date().toISOString().slice(0, 7)}-01`;

  const rr = resolveFromSearchParams(sp, { preset: "last28", compare: "prev" }, anchor);

  // Current window.
  const adCur = filterByRange(adRows, rr.current.start, rr.current.end);
  const gaCurRows = filterGa4ByRange(ga4, rr.current);
  const gaCur = sumGa4(gaCurRows);
  const costCur = adCur.reduce((s, r) => s + r.cost, 0);

  // Comparison window.
  const adPrev = rr.previous ? filterByRange(adRows, rr.previous.start, rr.previous.end) : [];
  const gaPrevRows = rr.previous ? filterGa4ByRange(ga4, rr.previous) : [];
  const gaPrev = sumGa4(gaPrevRows);
  const costPrev = adPrev.reduce((s, r) => s + r.cost, 0);

  const blendedCpa = safeDiv(costCur, gaCur.conversions);
  const blendedRoas = safeDiv(gaCur.revenue, costCur);
  const blendedCpaPrev = safeDiv(costPrev, gaPrev.conversions);
  const blendedRoasPrev = safeDiv(gaPrev.revenue, costPrev);

  // Top 5 channels in the selected window (by revenue).
  const byChannel = new Map<string, { channel: string; sessions: number; conversions: number; revenue: number }>();
  for (const r of gaCurRows) {
    const cur = byChannel.get(r.channel) ?? { channel: r.channel, sessions: 0, conversions: 0, revenue: 0 };
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    cur.revenue += r.revenue;
    byChannel.set(r.channel, cur);
  }
  const topChannels = Array.from(byChannel.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Goals: only meaningful when the preset is a single month ("当月" or "先月").
  const showGoals = rr.preset === "thisMonth" || rr.preset === "lastMonth";
  const tgt = client.monthlyTargets;

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
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <BigKpiCard
          label="Revenue"
          value={fmtJpy(gaCur.revenue)}
          comparisons={
            rr.previous
              ? [{ label: rr.compareLabel, delta: pct(gaCur.revenue, gaPrev.revenue) }]
              : []
          }
        />
        <BigKpiCard
          label="CV"
          value={fmtInt(gaCur.conversions)}
          comparisons={
            rr.previous ? [{ label: rr.compareLabel, delta: pct(gaCur.conversions, gaPrev.conversions) }] : []
          }
        />
        <BigKpiCard
          label="Sessions"
          value={fmtInt(gaCur.sessions)}
          comparisons={
            rr.previous ? [{ label: rr.compareLabel, delta: pct(gaCur.sessions, gaPrev.sessions) }] : []
          }
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
          <CardTitle className="text-sm">月次チャネル別 Sessions（過去12ヶ月・参考）</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelStackedBar data={ga4} metric="sessions" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 5 チャネル · {rr.presetLabel}</CardTitle>
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
    </div>
  );
}
