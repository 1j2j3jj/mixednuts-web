import { NextRequest, NextResponse } from "next/server";
import { getBigQuery, BQ_LOCATION, isBigQueryConfigured } from "@/lib/bigquery";
import { RPT_SUPPORTED, type RptClientId } from "@/lib/sources/bq-rpt";
import { daysBehindJst, isStaleForAlert, jstTodayIso } from "@/lib/freshness";

/**
 * Data-freshness check (Batch2 監査P0).
 *
 * daily_sync_all.py (mixednutsinc, GitHub Actions) refreshes the
 * {client}_marts BQ datasets every morning. When it fails, nothing used to
 * notice — the dashboards kept serving old rows as "latest". This cron
 * SELECTs MAX(date) from each provisioned client's rpt_daily view
 * (read-only, one UNION ALL job) and flags clients whose latest row is
 * older than today-2 (JST) — see src/lib/freshness.ts for the threshold
 * rationale (one day laxer than the dashboard banner to avoid false alarms
 * when the cron fires before a late sync lands).
 *
 * Slack: when SLACK_WEBHOOK_URL is set AND something is stale/errored, a
 * short summary is POSTed. Unset ⇒ silently skipped (no-op) so the route
 * is safe to deploy before the webhook is provisioned. Healthy days post
 * nothing (alert semantics, not a daily report).
 *
 * Auth: same pattern as membership-cleanup — Vercel Cron sends
 * `x-vercel-cron-signature`; manual/debug runs use Bearer ${CRON_SECRET}.
 *
 * Schedule: vercel.json crons — daily 00:00 UTC (09:00 JST).
 */
export const dynamic = "force-dynamic";

function isAuthorised(req: NextRequest): boolean {
  // CRON_SECRET の Bearer 一致のみを認可根拠にする（fail-closed）。
  // Vercel Cron は CRON_SECRET 設定時に Authorization: Bearer を自動付与する。
  // 旧実装の x-vercel-cron-signature「存在」チェックは外部から同名ヘッダを
  // 付けるだけで通るスプーフ穴だったため撤去（2026-07-03 敵対検証で検出）。
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

interface FreshnessResult {
  clientId: RptClientId;
  /** MAX(date) in the client's rpt_daily view (yyyy-mm-dd), null = empty. */
  maxDate: string | null;
  /** Whole days behind JST today; null when maxDate is null/malformed. */
  daysBehind: number | null;
  stale: boolean;
}

async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return; // not provisioned — silent no-op by design
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error(`[cron/freshness-check] slack webhook HTTP ${res.status}`);
    }
  } catch (err) {
    // Never let the notifier break the check itself.
    console.error(
      `[cron/freshness-check] slack webhook failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isBigQueryConfigured()) {
    // Deploy-safe: without SA credentials there is nothing to check.
    return NextResponse.json({ ok: true, skipped: "bigquery not configured" });
  }

  const project = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  // Compile-time allow-list (RPT_SUPPORTED keys) — safe to interpolate into
  // SQL; no user input reaches this query.
  const clients = Object.keys(RPT_SUPPORTED) as RptClientId[];
  const sql = clients
    .map(
      (c) =>
        `SELECT '${c}' AS client_id, CAST(MAX(date) AS STRING) AS max_date ` +
        `FROM \`${project}.${c}_marts.rpt_daily\``,
    )
    .join("\nUNION ALL\n");

  const now = new Date();
  let rows: Array<{ client_id: string; max_date: string | null }>;
  try {
    const bq = getBigQuery();
    const [job] = await bq.createQueryJob({ query: sql, location: BQ_LOCATION });
    const [res] = await job.getQueryResults();
    rows = res as unknown as Array<{ client_id: string; max_date: string | null }>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[cron/freshness-check] BQ query failed: ${msg}`);
    await postSlack(`:warning: freshness-check: BQ query failed — ${msg.slice(0, 300)}`);
    return NextResponse.json({ ok: false, error: `bq query failed: ${msg}` }, { status: 500 });
  }

  const maxByClient = new Map(rows.map((r) => [r.client_id, r.max_date ?? null]));
  const results: FreshnessResult[] = clients.map((clientId) => {
    const maxDate = maxByClient.get(clientId) ?? null;
    return {
      clientId,
      maxDate,
      daysBehind: maxDate != null ? daysBehindJst(maxDate, now) : null,
      stale: isStaleForAlert(maxDate, now),
    };
  });

  const staleOnes = results.filter((r) => r.stale);
  if (staleOnes.length > 0) {
    const lines = staleOnes.map(
      (r) =>
        `• ${r.clientId}: 最終データ日 ${r.maxDate ?? "なし"}` +
        (r.daysBehind != null ? `（${r.daysBehind}日前）` : ""),
    );
    await postSlack(
      `:rotating_light: データ鮮度アラート（JST ${jstTodayIso(now)}）— ` +
        `daily sync の遅延/失敗の可能性\n${lines.join("\n")}`,
    );
  }
  console.info(
    `[cron/freshness-check] checked=${results.length} stale=${staleOnes.length} ` +
      results.map((r) => `${r.clientId}:${r.maxDate ?? "-"}`).join(" "),
  );

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    jstToday: jstTodayIso(now),
    staleCount: staleOnes.length,
    results,
  });
}
