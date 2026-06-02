import "server-only";
import {
  TARGET_COLUMNS,
  EXTERNAL_CV_COLUMNS,
  CAMPAIGN_MASTER_COLUMNS,
  type TargetRow,
  type ExternalCvRow,
  type CampaignMasterRow,
} from "@/lib/masters";
import { CLIENT_IDS } from "@/config/clients";

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

/** One source line that failed validation. `row` is the 1-based CSV line. */
export interface CsvRowError {
  row: number;
  errors: string[];
}

export interface TargetsParseResult {
  rows: TargetRow[];
  errors: CsvRowError[];
}

const KNOWN_CLIENT_IDS = new Set<string>(CLIENT_IDS as readonly string[]);
const YM_RE = /^\d{4}-(0[1-9]|1[0-2])(-01)?$/; // 'YYYY-MM' or 'YYYY-MM-01'

/** Parse a single numeric cell, stripping commas and ¥. Returns parse status. */
function parseNum(
  raw: string | undefined,
): { ok: true; value: number | null } | { ok: false } {
  const t = (raw ?? "").trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t.replace(/[,¥]/g, ""));
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, value: n };
}

/**
 * Structured targets CSV parse. Validates strictly and accumulates per-row
 * errors instead of throwing, so the UI can show every problem at once.
 *
 * Rules (see design spec):
 *   - Header must be the 8 columns in exact order/name.
 *   - client_id required, must be a known ClientId (short name, not slug).
 *   - year_month required, 'YYYY-MM' (or 'YYYY-MM-01'); normalised to month-start.
 *   - revenue/ad_spend/roas/cpa: NUMERIC, comma/¥ stripped, blank → NULL, ≥0.
 *   - cv_target: INTEGER, blank → NULL, no decimals, ≥0.
 *   - notes: free string, blank allowed.
 *   - (client_id, year_month) must be unique within the file.
 *   - fully-empty lines are skipped; 0 data rows → empty result (no error).
 */
export function parseTargetsCsvResult(text: string): TargetsParseResult {
  const raw = parseCsv(text);
  if (raw.length === 0) return { rows: [], errors: [] };

  const header = raw[0].map((c) => c.trim());
  const expected = TARGET_COLUMNS as readonly string[];
  const headerErr = validateHeaderExact(header, expected);
  if (headerErr) {
    return { rows: [], errors: [{ row: 1, errors: [headerErr] }] };
  }

  const rows: TargetRow[] = [];
  const errors: CsvRowError[] = [];
  const seen = new Map<string, number>(); // composite key → first line seen

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const lineNo = i + 1;
    if (r.every((c) => c.trim() === "")) continue; // skip blank lines

    const rowErrors: string[] = [];

    // client_id
    const clientId = (r[0] ?? "").trim();
    if (clientId === "") rowErrors.push("client_id は必須です");
    else if (!KNOWN_CLIENT_IDS.has(clientId)) {
      rowErrors.push(
        `未知の client_id "${clientId}"（許可: ${[...KNOWN_CLIENT_IDS].join(", ")}）`,
      );
    }

    // year_month
    const ymRaw = (r[1] ?? "").trim();
    let yearMonth = "";
    if (ymRaw === "") rowErrors.push("year_month は必須です");
    else if (!YM_RE.test(ymRaw)) {
      rowErrors.push(`year_month は 'YYYY-MM' 形式（got "${ymRaw}"）`);
    } else {
      yearMonth = `${ymRaw.slice(0, 7)}-01`;
    }

    // numeric columns (≥0, blank → null)
    const numCols: Array<[string, number]> = [
      ["revenue_target", 2],
      ["ad_spend_budget", 4],
      ["roas_target_pct", 5],
      ["cpa_target", 6],
    ];
    const nums: Record<string, number | null> = {};
    for (const [label, col] of numCols) {
      const res = parseNum(r[col]);
      if (!res.ok) {
        rowErrors.push(`${label} は数値（got "${(r[col] ?? "").trim()}"）`);
        nums[label] = null;
      } else if (res.value != null && res.value < 0) {
        rowErrors.push(`${label} に負値は不可（got ${res.value}）`);
        nums[label] = null;
      } else {
        nums[label] = res.value;
      }
    }

    // cv_target: integer, ≥0, blank → null
    let cv: number | null = null;
    const cvRes = parseNum(r[3]);
    if (!cvRes.ok) {
      rowErrors.push(`cv_target は整数（got "${(r[3] ?? "").trim()}"）`);
    } else if (cvRes.value != null) {
      if (!Number.isInteger(cvRes.value)) {
        rowErrors.push(`cv_target は整数（小数不可、got ${cvRes.value}）`);
      } else if (cvRes.value < 0) {
        rowErrors.push(`cv_target に負値は不可（got ${cvRes.value}）`);
      } else {
        cv = cvRes.value;
      }
    }

    const notes = emptyToNull(r[7]);

    // composite key uniqueness (only when both key parts are valid)
    if (clientId !== "" && yearMonth !== "") {
      const key = `${clientId}|${yearMonth}`;
      const prev = seen.get(key);
      if (prev != null) {
        rowErrors.push(
          `(client_id, year_month) が重複（${clientId}, ${ymRaw}）— ${prev} 行目と同一`,
        );
      } else {
        seen.set(key, lineNo);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: lineNo, errors: rowErrors });
      continue;
    }

    rows.push({
      client_id: clientId,
      year_month: yearMonth,
      revenue_target: nums.revenue_target,
      cv_target: cv,
      ad_spend_budget: nums.ad_spend_budget,
      roas_target_pct: nums.roas_target_pct,
      cpa_target: nums.cpa_target,
      notes,
    });
  }

  return { rows, errors };
}

/**
 * Backward-compatible throwing wrapper. Throws on the first error so existing
 * callers keep working; prefer parseTargetsCsvResult for the UI flow.
 */
export function parseTargetsCsv(text: string): TargetRow[] {
  const { rows, errors } = parseTargetsCsvResult(text);
  if (errors.length > 0) {
    const e = errors[0];
    throw new Error(`line ${e.row}: ${e.errors.join("; ")}`);
  }
  return rows;
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

/**
 * Strict header check: exact column names in exact order. Returns an error
 * message string when mismatched, or null when valid. Extra trailing columns
 * (e.g. updated_at/updated_by) are rejected so the schema can't drift silently.
 */
function validateHeaderExact(
  actual: string[],
  expected: readonly string[],
): string | null {
  if (actual.length !== expected.length) {
    return (
      `ヘッダ列数が不一致（期待 ${expected.length} 列, got ${actual.length} 列）。` +
      `期待: ${expected.join(",")} / got: ${actual.join(",")}`
    );
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      return (
        `ヘッダ ${i + 1} 列目が不一致（期待 "${expected[i]}", got "${actual[i]}"）。` +
        `期待: ${expected.join(",")}`
      );
    }
  }
  return null;
}

function validateHeader(actual: string[], expected: readonly string[], label: string) {
  const missing = expected.filter((c) => !actual.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `${label} CSV is missing columns: ${missing.join(", ")}. ` +
      `Expected: ${expected.join(", ")}. Got: ${actual.join(", ")}`,
    );
  }
}
