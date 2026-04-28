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
