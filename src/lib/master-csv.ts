import "server-only";
import {
  TARGET_COLUMNS,
  EXTERNAL_CV_COLUMNS,
  CAMPAIGN_MASTER_COLUMNS,
  type TargetRow,
  type ExternalCvRow,
  type CampaignMasterRow,
} from "@/lib/masters";

/**
 * Minimal CSV parser/serializer for master uploads.
 * - Quotes fields containing commas, quotes, or newlines
 * - Doubles internal quotes per RFC 4180
 * - Empty cells → null (caller decides validity)
 *
 * No external dependency: keeps the master surface small.
 */

function escapeCsvField(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv<T extends object>(
  columns: ReadonlyArray<keyof T>,
  rows: T[],
): string {
  const header = columns.map((c) => escapeCsvField(String(c))).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => escapeCsvField((r as Record<string, unknown>)[c as string]))
        .join(","),
    )
    .join("\n");
  return rows.length === 0 ? header + "\n" : `${header}\n${body}\n`;
}

/** Tiny CSV reader. Handles quoted fields with embedded commas, quotes, and newlines. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { cur.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { cur.push(field); out.push(cur); cur = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    out.push(cur);
  }
  // Drop trailing fully-empty rows
  while (out.length > 0 && out[out.length - 1].every((c) => c === "")) {
    out.pop();
  }
  return out;
}

function emptyToNull(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function num(v: string | undefined, label: string, lineNo: number): number | null {
  const t = v?.trim() ?? "";
  if (t === "") return null;
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n)) {
    throw new Error(`line ${lineNo}: ${label} must be a number, got "${v}"`);
  }
  return n;
}

function intRequired(v: string | undefined, label: string, lineNo: number): number {
  const n = num(v, label, lineNo);
  if (n == null) throw new Error(`line ${lineNo}: ${label} is required`);
  return Math.round(n);
}

function strRequired(v: string | undefined, label: string, lineNo: number): string {
  const t = v?.trim() ?? "";
  if (t === "") throw new Error(`line ${lineNo}: ${label} is required`);
  return t;
}

function dateRequired(v: string | undefined, label: string, lineNo: number): string {
  const t = v?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    throw new Error(`line ${lineNo}: ${label} must be yyyy-mm-dd, got "${v}"`);
  }
  return t;
}

function dateOptional(v: string | undefined, label: string, lineNo: number): string | null {
  const t = v?.trim() ?? "";
  if (t === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    throw new Error(`line ${lineNo}: ${label} must be yyyy-mm-dd or empty, got "${v}"`);
  }
  return t;
}

// ============================================================
// targets
// ============================================================

export function parseTargetsCsv(text: string): TargetRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((c) => c.trim());
  const expected = TARGET_COLUMNS as readonly string[];
  validateHeader(header, expected, "targets");
  const idx = (col: string) => header.indexOf(col);
  return rows.slice(1).map((r, i) => {
    const lineNo = i + 2;
    return {
      client_id: strRequired(r[idx("client_id")], "client_id", lineNo),
      year_month: dateRequired(r[idx("year_month")], "year_month", lineNo),
      revenue_target: num(r[idx("revenue_target")], "revenue_target", lineNo),
      cv_target: num(r[idx("cv_target")], "cv_target", lineNo)?.valueOf() ?? null,
      ad_spend_budget: num(r[idx("ad_spend_budget")], "ad_spend_budget", lineNo),
      roas_target_pct: num(r[idx("roas_target_pct")], "roas_target_pct", lineNo),
      cpa_target: num(r[idx("cpa_target")], "cpa_target", lineNo),
      notes: emptyToNull(r[idx("notes")]),
    };
  });
}

// ============================================================
// external_cv
// ============================================================

export function parseExternalCvCsv(text: string): ExternalCvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((c) => c.trim());
  validateHeader(header, EXTERNAL_CV_COLUMNS as readonly string[], "external_cv");
  const idx = (col: string) => header.indexOf(col);
  return rows.slice(1).map((r, i) => {
    const lineNo = i + 2;
    return {
      date: dateRequired(r[idx("date")], "date", lineNo),
      cv_source: strRequired(r[idx("cv_source")], "cv_source", lineNo),
      media: emptyToNull(r[idx("media")]),
      campaign_id: emptyToNull(r[idx("campaign_id")]),
      conversions: intRequired(r[idx("conversions")], "conversions", lineNo),
      conversions_value: num(r[idx("conversions_value")], "conversions_value", lineNo),
      notes: emptyToNull(r[idx("notes")]),
    };
  });
}

// ============================================================
// campaign_master
// ============================================================

export function parseCampaignMasterCsv(text: string): CampaignMasterRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((c) => c.trim());
  validateHeader(header, CAMPAIGN_MASTER_COLUMNS as readonly string[], "campaign_master");
  const idx = (col: string) => header.indexOf(col);
  return rows.slice(1).map((r, i) => {
    const lineNo = i + 2;
    return {
      media: strRequired(r[idx("media")], "media", lineNo),
      platform_campaign_id: emptyToNull(r[idx("platform_campaign_id")]),
      platform_adgroup_id: emptyToNull(r[idx("platform_adgroup_id")]),
      platform_ad_id: emptyToNull(r[idx("platform_ad_id")]),
      utm_source: emptyToNull(r[idx("utm_source")]),
      utm_medium: emptyToNull(r[idx("utm_medium")]),
      utm_campaign: emptyToNull(r[idx("utm_campaign")]),
      utm_content: emptyToNull(r[idx("utm_content")]),
      utm_term: emptyToNull(r[idx("utm_term")]),
      campaign_type: emptyToNull(r[idx("campaign_type")]),
      active_from: dateOptional(r[idx("active_from")], "active_from", lineNo),
      active_to: dateOptional(r[idx("active_to")], "active_to", lineNo),
      notes: emptyToNull(r[idx("notes")]),
    };
  });
}

// ============================================================

function validateHeader(actual: string[], expected: readonly string[], label: string) {
  const missing = expected.filter((c) => !actual.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `${label} CSV is missing columns: ${missing.join(", ")}. ` +
      `Expected: ${expected.join(", ")}. Got: ${actual.join(", ")}`,
    );
  }
}
