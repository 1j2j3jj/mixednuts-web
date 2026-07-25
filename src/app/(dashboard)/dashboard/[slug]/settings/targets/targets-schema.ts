// Pure schema/validation for the tenant-side monthly-targets upload.
//
// NOTE: intentionally NOT a "use server" module. actions.ts (the server action
// file) may only export async functions, so the header const + the sync
// parse function + the shared types live here and are imported by both
// actions.ts (server) and page.tsx / TargetsClient.tsx (RSC / client).
//
// 2026-07-03: long (tidy) 形式に統一。CEO 提示の実 HS 目標シート
// (tab「データテーブル」, 列=指標,チャネル,目標,年月,値)に準拠し、旧・横型
// (年月/売上/CV/予算/ROAS/CPA) を撤回。アップロードテンプレは kind 列を持たず
// 4 列 (指標,チャネル,年月,値)。kind は常に '目標' 扱いで書き込む。

import { parseCsv } from "@/lib/master-csv";

/**
 * テンプレ / アップロード CSV のヘッダ（client_id 列・kind 列は含めない）。
 * 実シートの「目標/実績」kind 列は自己アップロードでは持たせず、常に目標として扱う。
 */
export const CLIENT_TARGETS_HEADER = [
  "指標",
  "チャネル",
  "年月",
  "値",
] as const;

/**
 * 指標の推奨 enum。CEO シート準拠の 4 指標。UI 案内・テンプレ用であって、
 * これ以外の自由文字（将来の指標追加）も parse は許容する（下の parse 参照）。
 */
export const RECOMMENDED_METRICS = [
  "セッション",
  "受注件数",
  "受注金額",
  "広告費用",
] as const;

/** 全体集計行を表すチャネル値。個別チャネル(organic 等)と区別する。 */
export const TOTAL_CHANNEL = "全体";

// 'YYYY-MM' / 'YYYY-MM-01' / 'YYYY/MM/DD' のいずれか（→ 月初 'YYYY-MM-01' に正規化）。
const YM_DASH_RE = /^(\d{4})-(0[1-9]|1[0-2])(-01)?$/;
const YM_SLASH_RE = /^(\d{4})\/(0[1-9]|1[0-2])\/(\d{1,2})$/;

export interface ClientTargetRow {
  metric: string;
  channel: string;
  /** 'YYYY-MM-01' に正規化済み。 */
  year_month: string;
  /** null は、このキーを明示削除するマーカー。 */
  value: number | null;
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
  preview?: import("./targets-write").TargetPreviewStats;
  rowErrors?: TargetRowError[];
  /**
   * マトリクス貼り付け経路のみ: パーサが読み取った軸・チャネル構成の要約
   * （例:「検出: 年月=列 / 指標=行 / チャネル=organic, direct（2ブロック）/ 24件」）。
   * 軸/チャネルブロックは推測で決まるため、確定前にユーザーが目視確認できる
   * ようにする（サイレントな軸誤読で数値だけ違う結果になる事故を防ぐ）。
   */
  interpretation?: string;
}

/**
 * 1 セルを数値化（カンマ / ¥ 除去、空 → null）。
 * targets-matrix.ts（マトリクス貼り付けパーサ）とセル単位の数値検証ルールを
 * 共有するためエクスポートする（数値ルールの再実装を避ける）。
 */
export function parseNum(
  raw: string | undefined,
): { ok: true; value: number | null } | { ok: false } {
  const t = (raw ?? "").trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t.replace(/[,¥]/g, ""));
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, value: n };
}

/**
 * 年月ラベルを 'YYYY-MM-01' に正規化。認識できなければ "" を返す。
 * targets-matrix.ts の軸検出（1行目/1列目が年月かどうかの判定）でも同じ
 * ルールを使う必要があるためエクスポートする。
 */
export function normaliseYm(raw: string): string {
  const s = raw.trim();
  const md = s.match(YM_DASH_RE);
  if (md) return `${md[1]}-${md[2]}-01`;
  const ms = s.match(YM_SLASH_RE);
  if (ms) return `${ms[1]}-${ms[2]}-01`;
  return "";
}

/**
 * (指標, チャネル, 年月) の一意性チェック用の共有ヘルパー。
 * long-CSV パーサとマトリクス貼り付けパーサの両方が同じ重複判定ロジックを
 * 使う（コピペでなく共有）。重複していなければ `seen` に登録して null を返す。
 * 重複していればエラーメッセージを返す（seen は変更しない）。
 */
export function checkDuplicateTargetKey(
  seen: Map<string, number>,
  metric: string,
  channel: string,
  yearMonth: string,
  yearMonthLabel: string,
  lineNo: number,
): string | null {
  const key = `${metric}\u0000${channel}\u0000${yearMonth}`;
  const prev = seen.get(key);
  if (prev != null) {
    return `(指標,チャネル,年月) が重複（${metric}/${channel}/${yearMonthLabel}）— ${prev} 行目と同一`;
  }
  seen.set(key, lineNo);
  return null;
}

/**
 * クライアント向け long テンプレ（指標,チャネル,年月,値）をパースし検証する。
 * エラーは throw せず行単位で蓄積し、UI が全問題を一度に表示できるようにする。
 *
 * ルール:
 *   - ヘッダは CLIENT_TARGETS_HEADER と完全一致（列順・列名）。
 *   - 指標: 必須（推奨 enum 以外の自由文字も許容）。
 *   - チャネル: 必須。全体集計は '全体'。
 *   - 年月: 必須。'YYYY-MM' / 'YYYY-MM-01' / 'YYYY/MM/DD' → 月初 'YYYY-MM-01'。
 *   - 値: 数値, カンマ/¥ 除去, ≥0。空セルはそのキーの明示削除。
 *   - 行一意キー = (指標, チャネル, 年月)。重複はエラー。
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
  const seen = new Map<string, number>(); // (指標|チャネル|年月) → 初出行

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const lineNo = i + 1;
    if (r.every((c) => c.trim() === "")) continue; // 空行スキップ

    const rowErrors: string[] = [];

    // 指標（必須・自由文字許容）
    const metric = (r[0] ?? "").trim();
    if (metric === "") rowErrors.push("指標 は必須です");

    // チャネル（必須）
    const channel = (r[1] ?? "").trim();
    if (channel === "") rowErrors.push("チャネル は必須です");

    // 年月（必須 → 月初 DATE に正規化）
    const ymRaw = (r[2] ?? "").trim();
    let yearMonth = "";
    if (ymRaw === "") rowErrors.push("年月 は必須です");
    else {
      yearMonth = normaliseYm(ymRaw);
      if (yearMonth === "") {
        rowErrors.push(
          `年月 は 'YYYY-MM' または 'YYYY/MM/DD' 形式（got "${ymRaw}"）`,
        );
      }
    }

    // 値（数値・≥0、空欄は明示削除マーカー）
    let value: number | null = null;
    const res = parseNum(r[3]);
    if (!res.ok) {
      rowErrors.push(`値 は数値（got "${(r[3] ?? "").trim()}"）`);
    } else if (res.value != null && res.value < 0) {
      rowErrors.push(`値 に負値は不可（got ${res.value}）`);
    } else {
      value = res.value;
    }

    // 行一意性（指標・チャネル・年月がすべて有効なときのみ）
    if (metric !== "" && channel !== "" && yearMonth !== "") {
      const dupError = checkDuplicateTargetKey(
        seen,
        metric,
        channel,
        yearMonth,
        ymRaw,
        lineNo,
      );
      if (dupError) rowErrors.push(dupError);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: lineNo, errors: rowErrors });
      continue;
    }

    rows.push({ metric, channel, year_month: yearMonth, value });
  }

  return { rows, errors };
}
