/**
 * POST /api/events
 *
 * Dashboard usage event tracker. Writes to BigQuery
 * `ai-agent-mixednuts.app_analytics.user_events`. Used for churn risk
 * analysis (e.g. "client X opened the dashboard 3 times in the last 30 days").
 *
 * Auth: open endpoint (cookie-based session is read if present, but
 *       unauthenticated events are still recorded with user_id=NULL).
 *       Middleware exempts /api/events to allow tracking on the marketing
 *       site too.
 *
 * PII policy:
 *   - email / phone / name / address keys are stripped from query_params
 *   - IP is hashed with IP_HASH_SALT (SHA256), raw IP never stored
 *   - 730-day partition expiration on the BQ table
 */
import "server-only";
import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { getBigQuery } from "@/lib/bigquery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventPayload {
  event_type: string;
  path?: string;
  client_viewed?: string;
  query_params?: Record<string, unknown>;
  duration_ms?: number;
}

const ALLOWED_EVENTS = new Set([
  "page_view",
  "login",
  "logout",
  "filter_change",
  "export_csv",
  "error",
]);

const PII_KEYS = ["email", "phone", "name", "address", "tel", "fax"];

function sanitizeQueryParams(
  params?: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!params) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    const lk = k.toLowerCase();
    if (PII_KEYS.some((p) => lk.includes(p))) continue;
    cleaned[k] = v;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export async function POST(req: Request) {
  let body: EventPayload;
  try {
    body = (await req.json()) as EventPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.event_type || !ALLOWED_EVENTS.has(body.event_type)) {
    return NextResponse.json(
      { error: "invalid event_type", allowed: Array.from(ALLOWED_EVENTS) },
      { status: 400 },
    );
  }

  const h = await headers();

  // Optional session lookup — events still tracked when unauthenticated.
  let userId: string | null = null;
  let orgId: string | null = null;
  let sessionId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: h });
    if (session) {
      userId = session.user?.id ?? null;
      orgId =
        (session.session as { activeOrganizationId?: string } | undefined)
          ?.activeOrganizationId ?? null;
      sessionId = session.session?.id ?? null;
    }
  } catch {
    // ignore — anonymous event
  }

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const salt = process.env.IP_HASH_SALT ?? "mixednuts-default-salt";
  const ipHash = ip
    ? createHash("sha256").update(ip + salt).digest("hex")
    : null;

  const sanitizedParams = sanitizeQueryParams(body.query_params);
  const row = {
    event_id: ulid(),
    ts: new Date().toISOString(),
    user_id: userId,
    org_id: orgId,
    session_id: sessionId,
    event_type: body.event_type,
    path: body.path ?? null,
    client_viewed: body.client_viewed ?? null,
    referrer: h.get("referer") ?? null,
    user_agent: h.get("user-agent") ?? null,
    ip_hash: ipHash,
    // BQ streaming inserts expect JSON columns as strings, not JS objects.
    query_params: sanitizedParams ? JSON.stringify(sanitizedParams) : null,
    duration_ms: body.duration_ms ?? null,
  };

  try {
    const bq = getBigQuery();
    await bq
      .dataset("app_analytics")
      .table("user_events")
      .insert([row], { ignoreUnknownValues: false });
    return NextResponse.json({ ok: true, event_id: row.event_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fail closed but visible — do not 500 on tracker failures (degrades UX).
    // Log via response so calling code can opt-in to surface.
    return NextResponse.json(
      { ok: false, error: "insert failed", detail: msg },
      { status: 502 },
    );
  }
}
