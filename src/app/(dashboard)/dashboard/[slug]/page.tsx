import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows } from "@/lib/sources/raw";
import { getGa4MonthlyChannels, ga4Totals, filterByMonth, latestYearMonth, momYearMonth, yoyYearMonth } from "@/lib/sources/ga4";
import { sumRows } from "@/lib/metrics";
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
 * 5 big KPI across advertising + organic (Blended CPA / ROAS count organic
 * conversions in the denominator). Top 5 channels for the latest month.
 * Twelve-month channel stacked bar. Month-to-date goal gauges.
 *
 * All data in Phase 1 sample is mocked (GA4) except the ad spend side which
 * reads the Sheets-backed mock already driving the Ads screen.
 */
export const dynamic = "force-dynamic";

export default async function Overview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await assertUserCanAccessClientBySlug(slug);

  const ga4 = getGa4MonthlyChannels(client);
  const latest = latestYearMonth(ga4);
  const mom = momYearMonth(latest);
  const yoy = yoyYearMonth(latest);

  const curMonth = filterByMonth(ga4, latest);
  const prevMonth = filterByMonth(ga4, mom);
  const yoyMonth = filterByMonth(ga4, yoy);

  const cur = ga4Totals(curMonth);
  const prev = ga4Totals(prevMonth);
  const ya = ga4Totals(yoyMonth);

  // Ad spend total for Blended CPA / ROAS (reuses mock Sheet rows).
  const { rows: adRows, fetchedAt, isMock } = await getDailyRows(client);
  const curMonthAd = adRows.filter((r) => r.date.startsWith(latest));
  const adTotals = sumRows(curMonthAd);

  const blendedCpa = safeDiv(adTotals.cost, cur.conversions);
  const blendedRoas = safeDiv(cur.revenue, adTotals.cost);
  const prevMonthAdCost = adRows.filter((r) => r.date.startsWith(mom)).reduce((s, r) => s + r.cost, 0);
  const prevBlendedCpa = safeDiv(prevMonthAdCost, prev.conversions);
  const prevBlendedRoas = safeDiv(prev.revenue, prevMonthAdCost);

  const pct = (a: number, b: number): number | null => (b === 0 ? null : (a - b) / b);

  // Top 5 channels (by Revenue) in the latest month.
  const topChannels = [...curMonth].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const tgt = client.monthlyTargets;
  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Overview</div>
          <h1 className="text-2xl font-semibold tracking-tight">{latest} 月次サマリ</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            vs {mom}（前月）/ vs {yoy}（前年同月）/ vs 目標
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

      {/* 5 big KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <BigKpiCard
          label="Revenue"
          value={fmtJpy(cur.revenue)}
          comparisons={[
            { label: "vs 前月", delta: pct(cur.revenue, prev.revenue) },
            { label: "vs 前年", delta: pct(cur.revenue, ya.revenue) },
            { label: "vs 目標", delta: pct(cur.revenue, tgt.revenue) },
          ]}
        />
        <BigKpiCard
          label="CV"
          value={fmtInt(cur.conversions)}
          comparisons={[
            { label: "vs 前月", delta: pct(cur.conversions, prev.conversions) },
            { label: "vs 前年", delta: pct(cur.conversions, ya.conversions) },
            { label: "vs 目標", delta: pct(cur.conversions, tgt.conversions) },
          ]}
        />
        <BigKpiCard
          label="Sessions"
          value={fmtInt(cur.sessions)}
          comparisons={[
            { label: "vs 前月", delta: pct(cur.sessions, prev.sessions) },
            { label: "vs 前年", delta: pct(cur.sessions, ya.sessions) },
          ]}
        />
        <BigKpiCard
          label="Blended CPA"
          value={blendedCpa != null ? fmtJpy(blendedCpa) : "—"}
          lowerIsBetter
          comparisons={[
            { label: "vs 前月", delta: blendedCpa != null && prevBlendedCpa != null ? pct(blendedCpa, prevBlendedCpa) : null },
            { label: "vs 目標", delta: blendedCpa != null ? pct(blendedCpa, tgt.cpa) : null },
          ]}
        />
        <BigKpiCard
          label="Blended ROAS"
          value={blendedRoas != null ? fmtRatioPct(blendedRoas * 100, 0) : "—"}
          comparisons={[
            {
              label: "vs 前月",
              delta: blendedRoas != null && prevBlendedRoas != null ? pct(blendedRoas, prevBlendedRoas) : null,
            },
            { label: "vs 目標", delta: blendedRoas != null ? pct(blendedRoas * 100, tgt.roasPct) : null },
          ]}
        />
      </div>

      {/* Goal gauges */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GoalGauge
          label="Revenue 達成"
          actual={fmtJpy(cur.revenue)}
          target={fmtJpy(tgt.revenue)}
          ratio={cur.revenue / (tgt.revenue || 1)}
        />
        <GoalGauge
          label="CV 達成"
          actual={fmtInt(cur.conversions)}
          target={fmtInt(tgt.conversions)}
          ratio={cur.conversions / (tgt.conversions || 1)}
        />
        <GoalGauge
          label="広告予算消化"
          actual={fmtJpy(adTotals.cost)}
          target={fmtJpy(tgt.adSpendBudget)}
          ratio={adTotals.cost / (tgt.adSpendBudget || 1)}
          hint={adTotals.cost > tgt.adSpendBudget ? "予算超過" : undefined}
        />
      </div>

      {/* Channel stacked bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">月次チャネル別 Sessions（過去12ヶ月）</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelStackedBar data={ga4} metric="sessions" />
        </CardContent>
      </Card>

      {/* Top 5 channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top 5 チャネル · {latest}</CardTitle>
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
