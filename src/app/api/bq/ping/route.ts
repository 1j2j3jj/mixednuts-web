import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  getBigQuery,
  isBigQueryConfigured,
  BQ_DEFAULT_DATASET,
  BQ_LOCATION,
} from "@/lib/bigquery";

/**
 * BigQuery connectivity check. Admin-only.
 *
 * GET /api/bq/ping
 *   200 → { ok: true, projectId, dataset, ts, rows: [...] }
 *   401 → not admin
 *   503 → SA not configured
 *   500 → query failed
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") {
    return NextResponse.json({ ok: false, error: "admin only" }, { status: 401 });
  }

  if (!isBigQueryConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 not set. SA credentials required.",
      },
      { status: 503 },
    );
  }

  try {
    const bq = getBigQuery();
    const [job] = await bq.createQueryJob({
      query: "SELECT 1 AS ok, CURRENT_TIMESTAMP() AS ts",
      location: BQ_LOCATION,
    });
    const [rows] = await job.getQueryResults();
    return NextResponse.json({
      ok: true,
      projectId: process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts",
      dataset: BQ_DEFAULT_DATASET,
      location: BQ_LOCATION,
      rows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: "query failed", detail: msg },
      { status: 500 },
    );
  }
}
