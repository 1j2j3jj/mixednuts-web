import type { ClientTargetRow } from "./targets-schema";

export interface ExistingClientTargetRow {
  metric: string;
  channel: string;
  year_month: string;
  value: number | null;
  /** '目標' 以外（将来の '実績' 等）は差分計算・MERGE の対象外。 */
  kind?: string | null;
}

/**
 * 目標行だけを対象にする述語。`sources/target.ts` の読み取り条件
 * `kind = '目標' OR kind IS NULL` と一致させる。プレビューの件数と
 * buildTargetsMergeQuery の ON 句が同じ集合を見ることを保証するために共有する。
 */
function isTargetKind(row: { kind?: string | null }): boolean {
  return row.kind == null || row.kind === "目標";
}

export interface TargetPreviewStats {
  uploadCount: number;
  newCount: number;
  updatedCount: number;
  sameValueCount: number;
  preservedCount: number;
  explicitDeleteCount: number;
  deleteNoopCount: number;
  untouchedCount: number;
  existingCount: number;
}

export interface TargetsMergeQuery {
  sql: string;
  params: Record<string, string | boolean | null>;
  types: Record<string, string>;
}

const TABLE = "ai-agent-mixednuts.app_analytics.targets_long";

function targetKey(row: {
  metric: string;
  channel: string;
  year_month: string;
}): string {
  return `${row.metric}\u0000${row.channel}\u0000${row.year_month}`;
}

export function classifyTargetChanges(
  rows: ClientTargetRow[],
  allExistingRows: ExistingClientTargetRow[],
): TargetPreviewStats {
  // MERGE の ON 句と同じ集合だけを見る（'実績' 等が同居しても目標行のみ差分対象）。
  // ここを絞らないと「更新 1件」と予告して実際は実績行を書き換える、という
  // プレビューと実行の不一致が起きる。
  const existingRows = allExistingRows.filter(isTargetKind);
  const existingByKey = new Map(
    existingRows.map((row) => [targetKey(row), row]),
  );
  const uploadKeys = new Set<string>();
  let newCount = 0;
  let updatedCount = 0;
  let sameValueCount = 0;
  let explicitDeleteCount = 0;
  let deleteNoopCount = 0;

  for (const row of rows) {
    const key = targetKey(row);
    uploadKeys.add(key);
    const existing = existingByKey.get(key);
    if (row.value == null) {
      if (existing) explicitDeleteCount += 1;
      else deleteNoopCount += 1;
    } else if (!existing) {
      newCount += 1;
    } else if (existing.value === row.value) {
      sameValueCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  const preservedCount = existingRows.filter(
    (row) => !uploadKeys.has(targetKey(row)),
  ).length;
  const untouchedCount =
    existingRows.length - updatedCount - explicitDeleteCount;

  return {
    uploadCount: rows.length,
    newCount,
    updatedCount,
    sameValueCount,
    preservedCount,
    explicitDeleteCount,
    deleteNoopCount,
    untouchedCount,
    existingCount: existingRows.length,
  };
}

export function buildTargetPreviewMessage(stats: TargetPreviewStats): string {
  const noOpDelete =
    stats.deleteNoopCount > 0
      ? ` / 削除対象なし ${stats.deleteNoopCount}件`
      : "";
  return (
    `新規 ${stats.newCount}件 / 更新 ${stats.updatedCount}件 / ` +
    `変更なし ${stats.untouchedCount}件（未指定で温存 ${stats.preservedCount}件・同値 ${stats.sameValueCount}件） / ` +
    `明示削除 ${stats.explicitDeleteCount}件${noOpDelete}`
  );
}

/**
 * 差分 MERGE を1文で組む。CSV に無いキーは温存する（旧 DELETE→INSERT の全置換を廃止）。
 *
 * kind スコープ: ON 句に `kind='目標' OR kind IS NULL` を含める。読み取り側
 * (`sources/target.ts`) が同じ述語で目標行だけを読む設計のため、書き込みも同じ
 * 範囲に閉じないと、将来この表に '実績' 行が同居した瞬間に目標アップロードが
 * 実績行を UPDATE（kind を '目標' に書き換え）または DELETE してしまう。
 * 述語は読み取り側と1文字単位で一致させること。
 */
export function buildTargetsMergeQuery(
  rows: ClientTargetRow[],
  clientId: string,
  actorEmail: string,
): TargetsMergeQuery | null {
  if (rows.length === 0) return null;

  const params: Record<string, string | boolean | null> = {
    by: actorEmail,
    cid: clientId,
  };
  const types: Record<string, string> = { by: "STRING", cid: "STRING" };
  const selects = rows.map((row, index) => {
    params[`m${index}`] = row.metric;
    params[`ch${index}`] = row.channel;
    params[`ym${index}`] = row.year_month;
    params[`v${index}`] = row.value == null ? null : String(row.value);
    params[`del${index}`] = row.value == null;

    types[`m${index}`] = "STRING";
    types[`ch${index}`] = "STRING";
    types[`ym${index}`] = "STRING";
    types[`v${index}`] = "NUMERIC";
    types[`del${index}`] = "BOOL";

    return (
      `SELECT @cid AS client_id, @m${index} AS metric, @ch${index} AS channel, ` +
      `DATE(@ym${index}) AS year_month, @v${index} AS value, ` +
      `@del${index} AS is_delete`
    );
  });

  const sql = `
    MERGE \`${TABLE}\` T
    USING (
      ${selects.join("\n      UNION ALL\n      ")}
    ) S
    ON T.client_id = S.client_id
      AND T.metric = S.metric
      AND T.channel = S.channel
      AND T.year_month = S.year_month
      AND (T.kind = '目標' OR T.kind IS NULL)
    WHEN MATCHED AND S.is_delete THEN DELETE
    WHEN MATCHED AND NOT S.is_delete AND T.value IS DISTINCT FROM S.value THEN
      UPDATE SET
        value = S.value,
        kind = '目標',
        updated_at = CURRENT_TIMESTAMP(),
        updated_by = @by
    WHEN NOT MATCHED AND NOT S.is_delete THEN
      INSERT (
        client_id, metric, channel, year_month, value, kind,
        updated_at, updated_by
      ) VALUES (
        S.client_id, S.metric, S.channel, S.year_month, S.value, '目標',
        CURRENT_TIMESTAMP(), @by
      )
  `;

  return { sql, params, types };
}
