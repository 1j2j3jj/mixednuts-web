import "server-only";
import { getBigQuery } from "@/lib/bigquery";
import type { ClientId } from "@/config/clients";

/**
 * Master data access (targets / external_cv / campaign_master).
 *
 * Tables:
 *   - app_analytics.targets_monthly        (cross-client KPI goals)
 *   - {client}_marts.external_cv_daily     (only hs/dozo/ogc/ogp)
 *   - {client}_marts.campaign_master       (all 6 clients)
 *
 * Strategy: full replace (TRUNCATE + INSERT) per upload. Keeps the surface
 * area small and predictable. Audit log captures the change history.
 */

const PROJECT = "ai-agent-mixednuts";
const LOC = "asia-northeast1";

export const CLIENTS_WITH_EXTERNAL_CV: ClientId[] = ["hs", "dozo", "ogc", "ogp"];

/** Master kinds. Keep in sync with the page routes. */
export type MasterKind = "targets" | "external_cv" | "campaign_master";

// ============================================================
// targets_monthly
// ============================================================

export interface TargetRow {
  client_id: string;
  year_month: string; // ISO date (yyyy-mm-01)
  revenue_target: number | null;
  cv_target: number | null;
  ad_spend_budget: number | null;
  roas_target_pct: number | null;
  cpa_target: number | null;
  notes: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

export const TARGET_COLUMNS: ReadonlyArray<keyof TargetRow> = [
  "client_id",
  "year_month",
  "revenue_target",
  "cv_target",
  "ad_spend_budget",
  "roas_target_pct",
  "cpa_target",
  "notes",
];

export async function fetchTargets(clientId?: string): Promise<TargetRow[]> {
  const bq = getBigQuery();
  const sql = clientId
    ? `SELECT * FROM \`${PROJECT}.app_analytics.targets_monthly\`
       WHERE client_id = @cid ORDER BY year_month DESC`
    : `SELECT * FROM \`${PROJECT}.app_analytics.targets_monthly\`
       ORDER BY client_id, year_month DESC`;
  const [job] = await bq.createQueryJob({
    query: sql,
    location: LOC,
    params: clientId ? { cid: clientId } : undefined,
  });
  const [rows] = await job.getQueryResults();
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    client_id: r.client_id as string,
    year_month: dateValue(r.year_month),
    revenue_target: numOrNull(r.revenue_target),
    cv_target: numOrNull(r.cv_target),
    ad_spend_budget: numOrNull(r.ad_spend_budget),
    roas_target_pct: numOrNull(r.roas_target_pct),
    cpa_target: numOrNull(r.cpa_target),
    notes: (r.notes as string | null) ?? null,
    updated_at: dateValue(r.updated_at),
    updated_by: (r.updated_by as string | null) ?? null,
  }));
}

// ============================================================
// targets_long (tidy 形式・2026-07-03 統一)
// ============================================================

/** long 形式の 1 目標行 = (指標, チャネル, 年月, 値)。kind は '目標' 既定。 */
export interface TargetLongRow {
  client_id: string;
  metric: string;
  channel: string;
  year_month: string; // ISO date (yyyy-mm-01)
  value: number | null;
  kind: string;
}

/**
 * Read app_analytics.targets_long for a single client (self-upload の現状表示用)。
 * metric / channel / year_month 昇順。kind は '目標' 既定だが値でフィルタしない
 * (将来 '実績' が同居した場合の互換のため呼び出し側が絞る)。
 */
export async function fetchClientTargetsLong(
  clientId: string,
): Promise<TargetLongRow[]> {
  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: `SELECT client_id, metric, channel, year_month, value, kind
            FROM \`${PROJECT}.app_analytics.targets_long\`
            WHERE client_id = @cid
            ORDER BY metric, channel, year_month`,
    location: LOC,
    params: { cid: clientId },
    types: { cid: "STRING" },
  });
  const [rows] = await job.getQueryResults();
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    client_id: r.client_id as string,
    metric: (r.metric as string) ?? "",
    channel: (r.channel as string) ?? "",
    year_month: dateValue(r.year_month),
    value: numOrNull(r.value),
    kind: (r.kind as string | null) ?? "目標",
  }));
}

/**
 * Idempotent upsert into targets_monthly keyed on (client_id, year_month).
 *
 * Single atomic MERGE — no DELETE+streaming-insert split (that combination
 * triggers "DML over streaming buffer" errors). Re-running the same CSV only
 * UPDATEs the matched rows; existing keys not present in the upload (other
 * clients / other months) are preserved (unlike replaceTargets which truncates).
 *
 * Type integrity: year_month is passed as 'YYYY-MM-01' and CAST to DATE in SQL.
 * Numeric columns are CAST to NUMERIC, cv_target to INT64. NULLs pass through.
 * updated_at is set to CURRENT_TIMESTAMP() explicitly (MERGE does not apply the
 * column DEFAULT). updated_by is bound to @by.
 *
 * For the expected volume (1 client × a few months = tens of rows at most) the
 * USING clause is generated as `SELECT ... UNION ALL ...` with per-row named,
 * typed params, avoiding the awkward UNNEST(@rows STRUCT[]) binding in v8.
 */
export async function upsertTargets(
  rows: TargetRow[],
  uploadedBy: string,
): Promise<{ affected: number }> {
  if (rows.length === 0) return { affected: 0 };
  const bq = getBigQuery();
  const table = `${PROJECT}.app_analytics.targets_monthly`;

  const params: Record<string, string | number | null> = { by: uploadedBy };
  const types: Record<string, string> = { by: "STRING" };

  const selects = rows.map((r, i) => {
    params[`cid${i}`] = r.client_id;
    params[`ym${i}`] = normaliseYmDate(r.year_month);
    params[`rev${i}`] = numStr(r.revenue_target);
    params[`cv${i}`] = r.cv_target == null ? null : Math.round(r.cv_target);
    params[`bud${i}`] = numStr(r.ad_spend_budget);
    params[`roas${i}`] = numStr(r.roas_target_pct);
    params[`cpa${i}`] = numStr(r.cpa_target);
    params[`notes${i}`] = r.notes;

    types[`cid${i}`] = "STRING";
    types[`ym${i}`] = "STRING";
    types[`rev${i}`] = "NUMERIC";
    types[`cv${i}`] = "INT64";
    types[`bud${i}`] = "NUMERIC";
    types[`roas${i}`] = "NUMERIC";
    types[`cpa${i}`] = "NUMERIC";
    types[`notes${i}`] = "STRING";

    return (
      `SELECT @cid${i} AS client_id, DATE(@ym${i}) AS year_month, ` +
      `@rev${i} AS revenue_target, @cv${i} AS cv_target, ` +
      `@bud${i} AS ad_spend_budget, @roas${i} AS roas_target_pct, ` +
      `@cpa${i} AS cpa_target, @notes${i} AS notes`
    );
  });

  const using = selects.join("\n        UNION ALL\n        ");

  const sql = `
    MERGE \`${table}\` T
    USING (
        ${using}
    ) S
    ON T.client_id = S.client_id AND T.year_month = S.year_month
    WHEN MATCHED THEN UPDATE SET
      revenue_target = S.revenue_target,
      cv_target = S.cv_target,
      ad_spend_budget = S.ad_spend_budget,
      roas_target_pct = S.roas_target_pct,
      cpa_target = S.cpa_target,
      notes = S.notes,
      updated_at = CURRENT_TIMESTAMP(),
      updated_by = @by
    WHEN NOT MATCHED THEN INSERT (
      client_id, year_month, revenue_target, cv_target,
      ad_spend_budget, roas_target_pct, cpa_target, notes,
      updated_at, updated_by
    ) VALUES (
      S.client_id, S.year_month, S.revenue_target, S.cv_target,
      S.ad_spend_budget, S.roas_target_pct, S.cpa_target, S.notes,
      CURRENT_TIMESTAMP(), @by
    )
  `;

  const [job] = await bq.createQueryJob({
    query: sql,
    location: LOC,
    params,
    types,
  });
  await job.getQueryResults();

  // MERGE doesn't return per-statement row counts via getQueryResults; the
  // number of source rows equals the number of (client_id, year_month) keys
  // touched (CSV duplicates are rejected upstream), so it's a faithful count.
  return { affected: rows.length };
}

export async function replaceTargets(
  rows: TargetRow[],
  uploadedBy: string,
): Promise<{ inserted: number }> {
  const bq = getBigQuery();
  const table = `${PROJECT}.app_analytics.targets_monthly`;

  // TRUNCATE
  await (await bq.createQueryJob({
    query: `TRUNCATE TABLE \`${table}\``,
    location: LOC,
  }))[0].getQueryResults();

  if (rows.length === 0) return { inserted: 0 };

  const nowIso = new Date().toISOString();
  const enriched = rows.map((r) => ({
    client_id: r.client_id,
    year_month: r.year_month, // yyyy-mm-dd
    revenue_target: r.revenue_target,
    cv_target: r.cv_target,
    ad_spend_budget: r.ad_spend_budget,
    roas_target_pct: r.roas_target_pct,
    cpa_target: r.cpa_target,
    notes: r.notes,
    updated_at: nowIso,
    updated_by: uploadedBy,
  }));

  await bq
    .dataset("app_analytics")
    .table("targets_monthly")
    .insert(enriched, { ignoreUnknownValues: false });

  return { inserted: rows.length };
}

// ============================================================
// external_cv_daily (per-client)
// ============================================================

export interface ExternalCvRow {
  date: string;
  cv_source: string;
  media: string | null;
  campaign_id: string | null;
  conversions: number;
  conversions_value: number | null;
  notes: string | null;
}

export const EXTERNAL_CV_COLUMNS: ReadonlyArray<keyof ExternalCvRow> = [
  "date",
  "cv_source",
  "media",
  "campaign_id",
  "conversions",
  "conversions_value",
  "notes",
];

export async function fetchExternalCv(clientId: ClientId): Promise<ExternalCvRow[]> {
  if (!CLIENTS_WITH_EXTERNAL_CV.includes(clientId)) return [];
  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: `SELECT * FROM \`${PROJECT}.${clientId}_marts.external_cv_daily\`
            ORDER BY date DESC, cv_source`,
    location: LOC,
  });
  const [rows] = await job.getQueryResults();
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    date: dateValue(r.date),
    cv_source: r.cv_source as string,
    media: (r.media as string | null) ?? null,
    campaign_id: (r.campaign_id as string | null) ?? null,
    conversions: Number(r.conversions ?? 0),
    conversions_value: numOrNull(r.conversions_value),
    notes: (r.notes as string | null) ?? null,
  }));
}

export async function replaceExternalCv(
  clientId: ClientId,
  rows: ExternalCvRow[],
  uploadedBy: string,
): Promise<{ inserted: number }> {
  if (!CLIENTS_WITH_EXTERNAL_CV.includes(clientId)) {
    throw new Error(`Client ${clientId} does not support external_cv`);
  }
  const bq = getBigQuery();
  const table = `${PROJECT}.${clientId}_marts.external_cv_daily`;

  await (await bq.createQueryJob({
    query: `TRUNCATE TABLE \`${table}\``,
    location: LOC,
  }))[0].getQueryResults();

  if (rows.length === 0) return { inserted: 0 };

  const nowIso = new Date().toISOString();
  const enriched = rows.map((r) => ({
    ...r,
    updated_at: nowIso,
    uploaded_by: uploadedBy,
  }));

  await bq
    .dataset(`${clientId}_marts`)
    .table("external_cv_daily")
    .insert(enriched, { ignoreUnknownValues: false });

  return { inserted: rows.length };
}

// ============================================================
// campaign_master (per-client)
// ============================================================

export interface CampaignMasterRow {
  media: string;
  platform_campaign_id: string | null;
  platform_adgroup_id: string | null;
  platform_ad_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_type: string | null;
  active_from: string | null;
  active_to: string | null;
  notes: string | null;
}

export const CAMPAIGN_MASTER_COLUMNS: ReadonlyArray<keyof CampaignMasterRow> = [
  "media",
  "platform_campaign_id",
  "platform_adgroup_id",
  "platform_ad_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_type",
  "active_from",
  "active_to",
  "notes",
];

export async function fetchCampaignMaster(clientId: ClientId): Promise<CampaignMasterRow[]> {
  const bq = getBigQuery();
  const [job] = await bq.createQueryJob({
    query: `SELECT * FROM \`${PROJECT}.${clientId}_marts.campaign_master\`
            ORDER BY media, platform_campaign_id, platform_adgroup_id, platform_ad_id`,
    location: LOC,
  });
  const [rows] = await job.getQueryResults();
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    media: r.media as string,
    platform_campaign_id: (r.platform_campaign_id as string | null) ?? null,
    platform_adgroup_id: (r.platform_adgroup_id as string | null) ?? null,
    platform_ad_id: (r.platform_ad_id as string | null) ?? null,
    utm_source: (r.utm_source as string | null) ?? null,
    utm_medium: (r.utm_medium as string | null) ?? null,
    utm_campaign: (r.utm_campaign as string | null) ?? null,
    utm_content: (r.utm_content as string | null) ?? null,
    utm_term: (r.utm_term as string | null) ?? null,
    campaign_type: (r.campaign_type as string | null) ?? null,
    active_from: dateValue(r.active_from),
    active_to: dateValue(r.active_to),
    notes: (r.notes as string | null) ?? null,
  }));
}

export async function replaceCampaignMaster(
  clientId: ClientId,
  rows: CampaignMasterRow[],
  uploadedBy: string,
): Promise<{ inserted: number }> {
  const bq = getBigQuery();
  const table = `${PROJECT}.${clientId}_marts.campaign_master`;

  await (await bq.createQueryJob({
    query: `TRUNCATE TABLE \`${table}\``,
    location: LOC,
  }))[0].getQueryResults();

  if (rows.length === 0) return { inserted: 0 };

  const nowIso = new Date().toISOString();
  const enriched = rows.map((r) => ({
    ...r,
    updated_at: nowIso,
    uploaded_by: uploadedBy,
  }));

  await bq
    .dataset(`${clientId}_marts`)
    .table("campaign_master")
    .insert(enriched, { ignoreUnknownValues: false });

  return { inserted: rows.length };
}

// ============================================================
// helpers
// ============================================================

/** Normalise 'YYYY-MM' or 'YYYY-MM-DD' to the month-start 'YYYY-MM-01'. */
function normaliseYmDate(v: string): string {
  const m = v.trim().match(/^(\d{4})-(0[1-9]|1[0-2])/);
  if (!m) return v.trim();
  return `${m[1]}-${m[2]}-01`;
}

/**
 * BigQuery NUMERIC params are safest passed as strings (avoids FLOAT precision
 * loss). null stays null. The value is already a finite number or null here.
 */
function numStr(v: number | null): string | null {
  return v == null ? null : String(v);
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "value" in (v as object)) {
    return String((v as { value: string }).value);
  }
  return String(v);
}
