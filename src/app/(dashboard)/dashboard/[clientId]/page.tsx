import { notFound } from "next/navigation";
import { getClient } from "@/config/clients";
import { getDailyRows } from "@/lib/sources/raw";
import { sumRows, aggregateByDate, aggregateByCampaign, filterByRange, pctDelta } from "@/lib/metrics";
import KpiCard from "@/components/dashboard/KpiCard";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import CampaignTable from "@/components/dashboard/CampaignTable";
import RefreshButton from "@/components/dashboard/RefreshButton";
import { fmtInt, fmtJpy, fmtRatioPct } from "@/lib/utils";

/**
 * Per-client dashboard. URL: /dashboard/[clientId].
 *
 * Phase 1 scope:
 *   - KPI cards (cost / CV / CV value / ROAS) with PoP delta (vs prior
 *     equal-length window).
 *   - Daily trend line chart (cost left-axis, CV right-axis).
 *   - Campaign-level table sorted by cost.
 *
 * Out of scope for Phase 1 (comes later):
 *   - Date range picker (currently fixed: last 14 days).
 *   - Search-term table (needs Google Ads API, Phase 2).
 *   - Master-based Brand/General join (needs CEO's master sheet).
 *
 * Clerk gating: when Clerk is configured, `assertUserCanAccessClient`
 * returns 404 for unauthorised viewers. In dev mode (no Clerk env) the
 * route is still accessible so we can iterate on the UI.
 */

// Dynamic: we're reading headers (via Clerk) and don't want ISR here.
export const dynamic = "force-dynamic";

const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  let client = getClient(clientId);
  if (!client) notFound();

  if (clerkConfigured) {
    const { assertUserCanAccessClient } = await import("@/lib/access");
    client = await assertUserCanAccessClient(clientId);
  }

  if (!client.active || !client.dataSource) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">{client.label}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          このクライアントのダッシュボードは準備中です。
        </p>
      </div>
    );
  }

  const { rows, fetchedAt, isMock, warnings } = await getDailyRows(client);

  // Date window: last 14 days ending today. Prior window: the 14 days
  // before that. Window is computed from the max date in the data to
  // avoid empty "last 14 days" when the sheet hasn't been updated yet.
  const allDates = rows.map((r) => r.date).filter(Boolean).sort();
  const maxDate = allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const maxD = new Date(`${maxDate}T00:00:00Z`);
  const isoDayBefore = (d: Date, n: number) => {
    const c = new Date(d);
    c.setUTCDate(c.getUTCDate() - n);
    return c.toISOString().slice(0, 10);
  };
  const curStart = isoDayBefore(maxD, 13);
  const prevEnd = isoDayBefore(maxD, 14);
  const prevStart = isoDayBefore(maxD, 27);

  const current = filterByRange(rows, curStart, maxDate);
  const previous = filterByRange(rows, prevStart, prevEnd);

  const curSum = sumRows(current);
  const prevSum = sumRows(previous);
  const series = aggregateByDate(current);
  const campaigns = aggregateByCampaign(current);

  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{client.subtitle}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.label}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            期間: {curStart} 〜 {maxDate}（直近14日 / 前期間比）
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            最終取得 {fetchedAtLabel}
            {isMock && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">MOCK</span>
            )}
          </div>
          <RefreshButton clientId={client.id} />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="費用"
          value={fmtJpy(curSum.cost)}
          delta={pctDelta(curSum.cost, prevSum.cost)}
          lowerIsBetter
        />
        <KpiCard
          label="CV"
          value={fmtInt(curSum.conversions)}
          delta={pctDelta(curSum.conversions, prevSum.conversions)}
        />
        <KpiCard
          label="CV値"
          value={fmtJpy(curSum.conversionValue)}
          delta={pctDelta(curSum.conversionValue, prevSum.conversionValue)}
        />
        <KpiCard
          label="ROAS"
          value={fmtRatioPct(curSum.roasPct, 0)}
          delta={
            prevSum.roasPct != null && curSum.roasPct != null
              ? pctDelta(curSum.roasPct, prevSum.roasPct)
              : null
          }
        />
      </div>

      {/* Daily trend */}
      <section className="rounded-md border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">日次推移</h2>
        <DailyTrendChart data={series} />
      </section>

      {/* Campaign table */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">キャンペーン別</h2>
        <CampaignTable rows={campaigns} />
      </section>
    </div>
  );
}
