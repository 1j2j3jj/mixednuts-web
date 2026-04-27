import "server-only";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * BigQuery client. Reuses the same Service Account credentials as ga4.ts
 * (`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` or `GOOGLE_SERVICE_ACCOUNT_JSON`).
 *
 * Project / dataset come from env:
 *   GCP_PROJECT_ID    — defaults to ai-agent-mixednuts
 *   BQ_DEFAULT_DATASET — defaults to app_analytics
 */

function loadSa(): Record<string, unknown> | null {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const json = b64 ? Buffer.from(b64, "base64").toString("utf8") : raw;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

let cached: BigQuery | null = null;

export function getBigQuery(): BigQuery {
  if (cached) return cached;
  const creds = loadSa();
  const projectId = process.env.GCP_PROJECT_ID ?? "ai-agent-mixednuts";
  cached = creds
    ? new BigQuery({
        projectId,
        credentials: creds as { client_email: string; private_key: string },
      })
    : new BigQuery({ projectId });
  return cached;
}

export const BQ_DEFAULT_DATASET =
  process.env.BQ_DEFAULT_DATASET ?? "app_analytics";

export const BQ_LOCATION = "asia-northeast1";

/** True if the SA credentials are configured. */
export function isBigQueryConfigured(): boolean {
  return loadSa() !== null;
}
