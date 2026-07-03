// Pure schema/validation for the tenant-side monthly-targets upload.
//
// NOTE: intentionally NOT a "use server" module. actions.ts (the server action
// file) may only export async functions, so the header const + the sync
// parse function + the shared types live here and are imported by both
// actions.ts (server) and page.tsx / TargetsClient.tsx (RSC / client).

import { parseCsv } from "@/lib/master-csv";

/** テンプレ / アップロード CSV のヘッダ（client_id 列は含めない）。 */
export const CLIENT_TARGETS_HEADER = [
  "年月",
  "売上目標",
  "CV目標",
  "広告予算",
  "目標ROAS(%)",
  "目標CPA",
] as const;

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])(-01)?$/; // 'YYYY-MM' or 'YYYY-MM-01'

export interface ClientTargetRow {
  /** 'YYYY-MM-01' に正規化済み。 */
  year_month: string;
  revenue_target: number | null;
  cv_target: number | null;
  ad_spend_budget: number | null;
  roas_target_pct: number | null;
  cpa_target: number | null;
}

export interface TargetRowError {
  row: number;
  errors: string[];
}

export interface UploadTargetsResult {
  ok: boolean;
  message: string;
  /** プレビュー / 確定で処理予定・処理した行数。 */
  count?: number;
  rowErrors?: TargetRowError[];
}

/** 1 セルを数値化（カンマ / ¥ 除去、空 → null）。 */
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
 * クライアント向け 6 列テンプレ（client_id 列なし）をパースし検証する。
 * エラーは throw せず行単位で蓄積し、UI が全問題を一度に表示できるようにする。
 *
 * ルール:
 *   - ヘッダは CLIENT_TARGETS_HEADER と完全一致（列順・列名）。
 *   - 年月: 必須, 'YYYY-MM'（or 'YYYY-MM-01'）→ 月初 'YYYY-MM-01' に正規化。
 *   - 売上目標/広告予算/目標ROAS/目標CPA: 数値, カンマ/¥ 除去, 空→NULL, ≥0。
 *   - CV目標: 整数, 空→NULL, 小数不可, ≥0。
 *   - 年月はファイル内で一意。
 *   - 完全空行はスキップ。0 データ行 → 空結果（エラーなし）。
 */
export function parseClientTargetsCsv(text: string): {
  rows: ClientTargetRow[];
  errors: TargetRowError[];
} {
  const raw = parseCsv(text);
  if (raw.length === 0) return { rows: [], errors: [] };

  const header = raw[0].map((c) => c.trim());
  const expected = CLIENT_TARGETS_HEADER as readonly string[];
  if (header.length !== expected.length) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          errors: [
            `ヘッダ列数が不一致（期待 ${expected.length} 列, got ${header.length} 列）。期待: ${expected.join(",")}`,
          ],
        },
      ],
    };
  }
  for (let i = 0; i < expected.length; i++) {
    if (header[i] !== expected[i]) {
      return {
        rows: [],
        errors: [
          {
            row: 1,
            errors: [
              `ヘッダ ${i + 1} 列目が不一致（期待 "${expected[i]}", got "${header[i]}"）。期待: ${expected.join(",")}`,
            ],
          },
        ],
      };
    }
  }

  const rows: ClientTargetRow[] = [];
  const errors: TargetRowError[] = [];
  const seen = new Map<string, number>(); // year_month → 初出行

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const lineNo = i + 1;
    if (r.every((c) => c.trim() === "")) continue; // 空行スキップ

    const rowErrors: string[] = [];

    // 年月
    const ymRaw = (r[0] ?? "").trim();
    let yearMonth = "";
    if (ymRaw === "") rowErrors.push("年月 は必須です");
    else if (!YM_RE.test(ymRaw)) {
      rowErrors.push(`年月 は 'YYYY-MM' 形式（got "${ymRaw}"）`);
    } else {
      yearMonth = `${ymRaw.slice(0, 7)}-01`;
    }

    // 数値列（≥0, 空 → null）
    const numCols: Array<[string, number]> = [
      ["売上目標", 1],
      ["広告予算", 3],
      ["目標ROAS(%)", 4],
      ["目標CPA", 5],
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

    // CV目標: 整数, ≥0, 空 → null
    let cv: number | null = null;
    const cvRes = parseNum(r[2]);
    if (!cvRes.ok) {
      rowErrors.push(`CV目標 は整数（got "${(r[2] ?? "").trim()}"）`);
    } else if (cvRes.value != null) {
      if (!Number.isInteger(cvRes.value)) {
        rowErrors.push(`CV目標 は整数（小数不可、got ${cvRes.value}）`);
      } else if (cvRes.value < 0) {
        rowErrors.push(`CV目標 に負値は不可（got ${cvRes.value}）`);
      } else {
        cv = cvRes.value;
      }
    }

    // 年月の一意性（年月が有効なときのみ）
    if (yearMonth !== "") {
      const prev = seen.get(yearMonth);
      if (prev != null) {
        rowErrors.push(`年月が重複（${ymRaw}）— ${prev} 行目と同一`);
      } else {
        seen.set(yearMonth, lineNo);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: lineNo, errors: rowErrors });
      continue;
    }

    rows.push({
      year_month: yearMonth,
      revenue_target: nums["売上目標"],
      cv_target: cv,
      ad_spend_budget: nums["広告予算"],
      roas_target_pct: nums["目標ROAS(%)"],
      cpa_target: nums["目標CPA"],
    });
  }

  return { rows, errors };
}
