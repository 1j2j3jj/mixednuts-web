// Matrix (spreadsheet-paste) parser for the tenant-side monthly-targets upload.
//
// 2026-07-25 (D5): CEO のソースデータは「指標×月×チャネル」のマトリクス
// （スプレッドシート）で保持されている。既存の long (tidy) 形式アップロード
// はそのままに、ペーストされたマトリクスを同じ ClientTargetRow[] / TargetRowError[]
// 形状にパースする新規エントリポイントをここに追加する（既存の long-CSV パーサ
// (targets-schema.ts の parseClientTargetsCsv) は一切変更しない）。
//
// 数値検証 (parseNum) と年月正規化 (normaliseYm) と (指標,チャネル,年月) の
// 一意性チェック (checkDuplicateTargetKey) は targets-schema.ts のものをそのまま
// 再利用する（別ルールを実装しない）。
//
// 空セルの安全則（このモジュールの中核）: マトリクス貼り付けは「未入力セルは
// 単に未提供」であり、long 形式の「値が空欄 = 明示削除」ではない。マトリクス
// パーサは value: null の行を絶対に生成しない — 空セルは行ごと省略する。
// 明示削除は long-CSV アップロード経路でのみ可能なまま。

import { parseCsv } from "@/lib/master-csv";
import {
  checkDuplicateTargetKey,
  normaliseYm,
  parseNum,
  TOTAL_CHANNEL,
  type ClientTargetRow,
  type TargetRowError,
} from "./targets-schema";

/**
 * マトリクス貼り付け専用の指標許可リスト。CEO 提示のグラウンドトゥルース
 * （2026-07-24, HS/OGP/OGC = monthly × GA4 channel, 6 指標）に準拠する。
 * long-CSV の RECOMMENDED_METRICS（セッション/受注件数/受注金額/広告費用）とは
 * 別物 — long 側は自由文字許容の UI 案内、こちらは軸検出のための厳格な
 * 完全一致リストであり、意図的に別リストにしている（両者の語彙統一は将来課題）。
 */
export const MATRIX_METRICS = [
  "売上",
  "CV",
  "広告費用",
  "単価",
  "セッション数",
  "ROAS",
] as const;

/**
 * マトリクス貼り付けで「チャネル見出し行」として認識するトークン。
 * HS/OGP/OGC の GA4 チャネル内訳 + 全体集計センチネル。
 */
export const MATRIX_CHANNELS = [
  "organic",
  "direct",
  "mail",
  "referral",
  "広告",
  TOTAL_CHANNEL,
] as const;

const METRIC_SET = new Set<string>(MATRIX_METRICS as readonly string[]);
const CHANNEL_SET = new Set<string>(MATRIX_CHANNELS as readonly string[]);

export interface MatrixParseResult {
  rows: ClientTargetRow[];
  errors: TargetRowError[];
  /**
   * パーサが読み取った構造の要約（確定前プレビューに表示する自己検証用の
   * 一行）。エラーで即 reject した場合は undefined。
   */
  interpretation?: string;
}

interface GridRow {
  /** 貼り付けテキスト内の 1-based 行番号（エラー表示用）。 */
  lineNo: number;
  cells: string[];
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === "");
}

/** 貼り付けテキストを行×セルの 2D グリッドに変換する。タブが含まれていれば
 * タブ区切り（クリップボード貼り付けの標準挙動）、なければ既存の parseCsv
 * を再利用してカンマ区切り（引用符対応）として扱う。 */
function toGridRows(text: string): GridRow[] {
  if (text.includes("\t")) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    return lines.map((line, i) => ({ lineNo: i + 1, cells: line.split("\t") }));
  }
  return parseCsv(text).map((cells, i) => ({ lineNo: i + 1, cells }));
}

/**
 * 行がチャネル見出し候補かどうかを判定する。判定基準は「その物理行に
 * 区切り文字が一切なかった（＝スプレッドシートで単一セルとしてコピーされた
 * 行）」こと（cells.length === 1）であり、「非空セルが1個だけ」ではない。
 *
 * 後者の基準だと、グリッド本体の行（例: ある月の値が全指標分すべて未入力）
 * がチャネル見出しと誤認され、まさにこの機能が解決すべき「未来月がまだ
 * 埋まっていない」ケースを誤って reject してしまう。cells.length で判定する
 * ことで、コーナーセル＋複数列を持つ本体行（非空セルが実質 0〜1 個でも
 * 区切り文字自体は複数ある）と、区切り文字を含まない孤立ラベル行を区別する。
 */
function headingCandidate(cells: string[]): string | null {
  if (cells.length !== 1) return null;
  const t = cells[0].trim();
  return t === "" ? null : t;
}

interface Block {
  channel: string;
  /** ブロック内のグリッド行（見出し行は含まない）。 */
  gridRows: GridRow[];
}

function reject(lineNo: number, message: string): MatrixParseResult {
  return { rows: [], errors: [{ row: lineNo, errors: [message] }] };
}

/**
 * クライアントがスプレッドシートから直接コピー&ペーストしたマトリクス
 * （指標×月、チャネル別ブロックあり/なし）をパースする。
 *
 * 戻り値は parseClientTargetsCsv と同じ { rows, errors } 形状（+ 任意の
 * interpretation）。下流（classifyTargetChanges / buildTargetsMergeQuery /
 * buildTargetPreviewMessage）は一切変更不要。
 */
export function parseClientTargetsMatrix(text: string): MatrixParseResult {
  const nonBlank = toGridRows(text).filter((r) => !isBlankRow(r.cells));
  if (nonBlank.length === 0) return { rows: [], errors: [] };

  // 1) チャネル見出し行を検出する。区切り文字なしの単一セル行がすべて
  //    チャネル許可リストに一致していなければ、その行を名指しして reject する
  //    （チャネルらしき孤立ラベルを黙って握りつぶさない・全体に丸めない）。
  const headingIdx: number[] = [];
  for (let i = 0; i < nonBlank.length; i++) {
    const token = headingCandidate(nonBlank[i].cells);
    if (token === null) continue; // 複数セルを持つ行 = グリッド本体の行
    if (CHANNEL_SET.has(token)) {
      headingIdx.push(i);
    } else {
      return reject(
        nonBlank[i].lineNo,
        `認識できない行です（"${token}"）。チャネル名として認識できませんでした。許可されているチャネル: ${MATRIX_CHANNELS.join(", ")}`,
      );
    }
  }

  const blocks: Block[] = [];
  if (headingIdx.length === 0) {
    // 2(a): チャネル指定なし → 全体を単一チャネル(全体)のグリッドとして扱う。
    blocks.push({ channel: TOTAL_CHANNEL, gridRows: nonBlank });
  } else {
    // 2(b): チャネル別ブロック。先頭が見出し行でなければ、チャネル指定のない
    // データがブロック外に浮いていることになるため reject する。
    if (headingIdx[0] !== 0) {
      return reject(
        nonBlank[0].lineNo,
        "1行目にチャネル指定がありません。チャネル別ブロック形式では、各ブロックの先頭にチャネル名（1セルのみ）の行が必要です。",
      );
    }
    for (let b = 0; b < headingIdx.length; b++) {
      const startHeading = headingIdx[b];
      const nextHeading = headingIdx[b + 1] ?? nonBlank.length;
      const channel = headingCandidate(nonBlank[startHeading].cells)!;
      const gridRows = nonBlank.slice(startHeading + 1, nextHeading);
      if (gridRows.length === 0) {
        return reject(
          nonBlank[startHeading].lineNo,
          `チャネル "${channel}" の見出しの後にデータ行がありません。`,
        );
      }
      blocks.push({ channel, gridRows });
    }
  }

  const rows: ClientTargetRow[] = [];
  const errors: TargetRowError[] = [];
  const seen = new Map<string, number>();
  let orientationSummary: { months: "行" | "列" } | null = null;

  for (const block of blocks) {
    const result = parseBlock(block);
    if (result.type === "error") {
      return reject(result.lineNo, result.message);
    }
    if (orientationSummary === null)
      orientationSummary = { months: result.monthsAxis };
    for (const cell of result.cells) {
      // エラーセル（数値化失敗・負値）はそのまま報告する。空セル(value===null,
      // error なし)は安全則により行を生成せず黙ってスキップする — 未提供の
      // セルを重複チェックに巻き込まない（書かれないキーを重複扱いしない）。
      if (cell.error) {
        errors.push({ row: cell.lineNo, errors: [cell.error] });
        continue;
      }
      if (cell.value === null) continue; // 空セル = 未提供。行を生成しない（安全則）。
      const dupError = checkDuplicateTargetKey(
        seen,
        cell.metric,
        cell.channel,
        cell.yearMonth,
        cell.yearMonthLabel,
        cell.lineNo,
      );
      if (dupError) {
        errors.push({ row: cell.lineNo, errors: [dupError] });
        continue;
      }
      rows.push({
        metric: cell.metric,
        channel: cell.channel,
        year_month: cell.yearMonth,
        value: cell.value,
      });
    }
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const channelList = blocks.map((b) => b.channel).join(", ");
  const monthsAxis = orientationSummary?.months ?? "列";
  const metricAxis = monthsAxis === "列" ? "行" : "列";
  const interpretation =
    `検出: 年月=${monthsAxis} / 指標=${metricAxis} / ` +
    `チャネル=${channelList}（${blocks.length}ブロック） / ${rows.length}件`;

  return { rows, errors: [], interpretation };
}

interface ParsedCell {
  metric: string;
  channel: string;
  yearMonth: string;
  yearMonthLabel: string;
  lineNo: number;
  value: number | null;
  error?: string;
}

type BlockParseResult =
  | { type: "error"; lineNo: number; message: string }
  | { type: "ok"; monthsAxis: "行" | "列"; cells: ParsedCell[] };

/**
 * 1 ブロック（1 チャネル分）のグリッドをパースする。
 * 1行目（の先頭セルを除く）と1列目（の先頭セルを除く）のどちらが年月として
 * 完全一致するかを検出し、その垂直軸が指標許可リストと完全一致することを
 * 検証してから、各セルを数値化する。
 */
function parseBlock(block: Block): BlockParseResult {
  const { gridRows, channel } = block;
  if (gridRows.length < 2 || gridRows[0].cells.length < 2) {
    return {
      type: "error",
      lineNo: gridRows[0]?.lineNo ?? 1,
      message:
        "年月の並びを検出できませんでした（1行目または1列目に YYYY-MM 形式で揃えてください）",
    };
  }

  const headerRow = gridRows[0].cells.slice(1).map((c) => c.trim());
  const headerCol = gridRows.slice(1).map((r) => (r.cells[0] ?? "").trim());

  const headerRowAllYm =
    headerRow.length > 0 && headerRow.every((c) => normaliseYm(c) !== "");
  const headerColAllYm =
    headerCol.length > 0 && headerCol.every((c) => normaliseYm(c) !== "");

  if (headerRowAllYm === headerColAllYm) {
    // どちらも年月として揃わない、または両方揃ってしまい判別できない。
    return {
      type: "error",
      lineNo: gridRows[0].lineNo,
      message:
        "年月の並びを検出できませんでした（1行目または1列目に YYYY-MM 形式で揃えてください）",
    };
  }

  const monthsAxis: "行" | "列" = headerRowAllYm ? "列" : "行";

  // 指標軸（年月軸の垂直方向）のラベルが指標許可リストと完全一致すること。
  const metricLabels = headerRowAllYm ? headerCol : headerRow;
  for (const label of metricLabels) {
    if (!METRIC_SET.has(label)) {
      return {
        type: "error",
        lineNo: gridRows[0].lineNo,
        message: `指標名を認識できませんでした（"${label}"）。許可されている指標: ${MATRIX_METRICS.join(", ")}`,
      };
    }
  }

  const cells: ParsedCell[] = [];

  if (headerRowAllYm) {
    // 年月が列方向（1行目）、指標が行方向（1列目）。
    const months = gridRows[0].cells.slice(1).map((c) => c.trim());
    for (let i = 1; i < gridRows.length; i++) {
      const row = gridRows[i];
      const metric = (row.cells[0] ?? "").trim();
      for (let j = 0; j < months.length; j++) {
        const rawCell = row.cells[j + 1];
        const yearMonth = normaliseYm(months[j]);
        cells.push(
          buildCell(metric, channel, yearMonth, months[j], row.lineNo, rawCell),
        );
      }
    }
  } else {
    // 年月が行方向（1列目）、指標が列方向（1行目）。
    const metrics = gridRows[0].cells.slice(1).map((c) => c.trim());
    for (let i = 1; i < gridRows.length; i++) {
      const row = gridRows[i];
      const ymRaw = (row.cells[0] ?? "").trim();
      const yearMonth = normaliseYm(ymRaw);
      for (let j = 0; j < metrics.length; j++) {
        const rawCell = row.cells[j + 1];
        cells.push(
          buildCell(metrics[j], channel, yearMonth, ymRaw, row.lineNo, rawCell),
        );
      }
    }
  }

  return { type: "ok", monthsAxis, cells };
}

function buildCell(
  metric: string,
  channel: string,
  yearMonth: string,
  yearMonthLabel: string,
  lineNo: number,
  rawCell: string | undefined,
): ParsedCell {
  const res = parseNum(rawCell);
  if (!res.ok) {
    return {
      metric,
      channel,
      yearMonth,
      yearMonthLabel,
      lineNo,
      value: null,
      error: `値は数値である必要があります（${metric} / ${channel} / ${yearMonthLabel}, got "${(rawCell ?? "").trim()}"）`,
    };
  }
  if (res.value != null && res.value < 0) {
    return {
      metric,
      channel,
      yearMonth,
      yearMonthLabel,
      lineNo,
      value: null,
      error: `値に負値は不可です（${metric} / ${channel} / ${yearMonthLabel}, got ${res.value}）`,
    };
  }
  return {
    metric,
    channel,
    yearMonth,
    yearMonthLabel,
    lineNo,
    value: res.value,
  };
}
