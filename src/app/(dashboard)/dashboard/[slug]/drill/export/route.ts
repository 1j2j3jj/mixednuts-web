import { NextRequest, NextResponse } from "next/server";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getDailyRows } from "@/lib/sources/raw";
import { getGa4PaidCampaigns, getGa4GoogleAdgroups } from "@/lib/sources/ga4";
import { resolveFromSearchParams } from "@/lib/range";
import { toCsv } from "@/lib/csv";
import {
  resolveDrillScope,
  buildJoin,
  aggregateDrillRows,
  buildDrillCsvRows,
  buildDrillCsvHeaders,
  fetchDrillGa4Current,
} from "@/lib/dashboard/drill-shared";

/**
 * CSV export for the drill tab (G-3 payload fix, 2026-07-26).
 *
 * Recomputes the exact same aggregated `table` the drill page renders —
 * via the identical shared functions in @/lib/dashboard/drill-shared.ts,
 * fed by the same searchParams the page resolved from — and streams it as
 * CSV. This exists so the full (entity × time-bucket) row set never has to
 * be serialized into the page's RSC hydration payload just to feed the
 * export button (that duplication was the dominant contributor to drill's
 * multi-MB HTML at deep filters — see
 * _reports/2026-07-24_dashboard-phaseA-defect-ledger.md G-3 and the
 * measurement pass in this phase's brief).
 *
 * GET /dashboard/{slug}/drill/export?<same query params as the drill page>
 *   200 → text/csv (BOM-prefixed, formula-injection-guarded via
 *         lib/csv-guard.ts — same guard toCsv() always uses)
 *   404 → slug not accessible to the current viewer
 *
 * Route lives under /dashboard/{slug}/... (not /api/...) specifically so
 * src/middleware.ts's per-slug tenant scoping (which only applies to
 * /dashboard/{slug}/* — see middleware.ts steps 8-9) authorizes it exactly
 * like the page itself, rather than being caught by the middleware's
 * generic "non-dashboard path → bounce to own dashboard" fallback that
 * would otherwise 302 an /api/* route for client-scoped viewers.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Mirrors drill/page.tsx's maxDuration — same BQ/GA4/Sheets fetch shape
// (current-period only here, so normally faster than the page's fetch).
export const maxDuration = 60;

function isNotFoundDigest(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let client;
  try {
    client = await assertUserCanAccessClientBySlug(slug);
  } catch (err) {
    if (isNotFoundDigest(err)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }

  // Reconstruct the same sp shape the page's searchParams prop carries.
  const sp: Record<string, string | undefined> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    sp[key] = value;
  });

  const { rows } = await getDailyRows(client, sp);
  const allDates = rows
    .map((r) => r.date)
    .filter(Boolean)
    .sort();
  const anchor =
    allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const rr = resolveFromSearchParams(
    sp,
    { preset: "thisMonth", compare: "none" },
    anchor,
  );

  const scope = resolveDrillScope(rows, rr, sp);
  const { ga4Campaigns, ga4Adgroups } = await fetchDrillGa4Current(
    client,
    rr,
    scope.needAdgroupData,
    { getGa4PaidCampaigns, getGa4GoogleAdgroups },
  );
  const join = buildJoin(ga4Campaigns, ga4Adgroups, scope.granularity);
  const table = aggregateDrillRows(
    scope.filtered,
    scope.granularity,
    scope.level,
    join,
  );

  const csvRows = buildDrillCsvRows(table);
  const csvHeaders = buildDrillCsvHeaders(scope.level);
  const csv = toCsv(csvRows, csvHeaders);
  const filename = `drill-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  // BOM for Excel's JA auto-detection — same prefix CsvExportButton's
  // client-side path adds via Blob(["﻿", csv], ...).
  const body = `﻿${csv}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
