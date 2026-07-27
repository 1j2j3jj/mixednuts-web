import "server-only";
import { getBigQuery } from "@/lib/bigquery";
import { unstable_cache } from "next/cache";
import type { ClientId } from "@/config/clients";

/**
 * app_analytics.sync_status — daily_sync_all.py が毎回書く実行ログの読み取り側。
 *
 * 用途は1つだけ: 「広告行が末尾に無い」のが**配信停止**なのか**同期失敗**なのかを
 * 判定する証拠にする（`@/lib/data-tail` 参照）。Google Ads は指標ゼロの日を行として
 * 返さないため、データだけでは両者を区別できない。
 *
 * このテーブルは DDL 側に「本番・CEO承認後に手動実行」と書かれており、**存在しない
 * 可能性がある**。存在しない/権限が無い/クエリが失敗した場合は `null` を返し、
 * 呼び出し側は「不明」として安全側（基準日を進めない）に倒す。ここで false を
 * 返してはいけない — 「同期が失敗した」と断定することになる。
 */

export interface AdSyncStatus {
  /** true=成功 / false=失敗 / null=判定不能（テーブル無し・クエリ失敗等）。 */
  ok: boolean | null;
  /** その判定の根拠になった実行の完了時刻（UTC）。 */
  completedAt: Date | null;
  /** 根拠にした run_id（デバッグ用）。 */
  runId: string | null;
}

const UNKNOWN: AdSyncStatus = { ok: null, completedAt: null, runId: null };

const _cached = unstable_cache(
  async (clientId: string): Promise<AdSyncStatus> => {
    try {
      const bq = getBigQuery();
      // 直近1件のみ。step 名は daily_sync_all.py の SOURCES 定義に合わせる
      // （google_hs / google_ogc / google_msec / …）。
      const [job] = await bq.createQueryJob({
        query: `
          SELECT status, rc, run_id, completed_at
          FROM \`ai-agent-mixednuts.app_analytics.sync_status\`
          WHERE step = @step
          ORDER BY inserted_at DESC
          LIMIT 1
        `,
        location: "asia-northeast1",
        params: { step: `google_${clientId}` },
        types: { step: "STRING" },
      });
      const [rows] = await job.getQueryResults();
      if (!rows || rows.length === 0) return UNKNOWN;
      const r = rows[0] as {
        status?: unknown;
        rc?: unknown;
        run_id?: unknown;
        completed_at?: unknown;
      };
      // status='ok' かつ rc=0 の両方を要求する。status だけを見ると、将来
      // ステップが "ok" を書きつつ非ゼロ rc を残すような変更が入ったときに
      // 静かに誤判定する。
      const statusOk = String(r.status ?? "") === "ok";
      const rcOk = r.rc == null || Number(r.rc) === 0;
      const completedRaw = r.completed_at as { value?: string } | string | null;
      const completedStr =
        typeof completedRaw === "string"
          ? completedRaw
          : (completedRaw?.value ?? null);
      return {
        ok: statusOk && rcOk,
        completedAt: completedStr ? new Date(completedStr) : null,
        runId: r.run_id ? String(r.run_id) : null,
      };
    } catch (err) {
      // テーブル未作成が最も多い想定。判定不能として返す（false にしない）。
      console.warn(
        `[sync-status] lookup failed for ${clientId}: ${err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120)}`,
      );
      return UNKNOWN;
    }
  },
  ["bq-sync-status"],
  { revalidate: 300, tags: ["bq-sync-status"] },
);

export function getAdSyncStatus(clientId: ClientId): Promise<AdSyncStatus> {
  return _cached(clientId);
}
