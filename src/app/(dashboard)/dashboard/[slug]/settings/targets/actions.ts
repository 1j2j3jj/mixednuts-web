"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization as organizationTable } from "@/db/schema";
import { getClientBySlug } from "@/config/clients";
import { getBigQuery } from "@/lib/bigquery";
import { writeAuditLog } from "@/lib/audit";
import { fetchClientTargetsLong } from "@/lib/masters";
import { lookupOrgRoleByEmail, canInviteMembers } from "@/lib/org-role";
import {
  parseClientTargetsCsv,
  type ClientTargetRow,
  type TargetRowError,
  type UploadTargetsResult,
} from "./targets-schema";
import { parseClientTargetsMatrix } from "./targets-matrix";
import {
  buildTargetPreviewMessage,
  buildTargetsMergeQuery,
  classifyTargetChanges,
} from "./targets-write";

/**
 * Server actions for the tenant-side monthly-targets upload page.
 *
 * モデルB(2026-07-03) 準拠のクライアント自己アップロード:
 * - ゲート: 編集者以上のみ（member=閲覧者は forbidden）。members/actions.ts の
 *   assertCanInvite と同じ判定（x-viewer-kind + x-viewer-email→org-role）。
 * - スコープ: 書き込む client_id は slug から導出した client.id に強制する。
 *   入力 CSV に client_id 列は存在せず、他クライアントの行は絶対に触らない
 *   CSV に client_id は存在せず、MERGE source の client_id は認証済み slug から固定する。
 *
 * テンプレは long (tidy) 形式（client_id 列なし・4 列、2026-07-03 統一）:
 *   指標, チャネル, 年月, 値
 * 実 HS シート(tab データテーブル)の long 形式に準拠し、旧・横型 6 列を撤回。
 * kind 列は自己アップロードでは持たせず、常に '目標' として targets_long へ書く。
 *
 * 純ロジック（ヘッダ定数・型・CSV パース）は ./targets-schema に切り出している
 * （"use server" モジュールは async 関数以外を export できないため）。
 */

const LOC = "asia-northeast1";

/**
 * 編集者以上ゲート + slug→client 解決。member(閲覧者)/未知の viewer は throw。
 * 戻り値の clientId は BigQuery targets_long の client_id（= client.id）。
 */
async function assertCanEditTargets(
  slug: string,
): Promise<{ clientId: string; actorEmail: string }> {
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");

  if (
    viewerKind !== "admin" &&
    viewerKind !== "client" &&
    viewerKind !== "client-multi"
  ) {
    throw new Error("forbidden");
  }

  // client viewer は自社 org へのアクセスであること + 編集者以上ロールを確認。
  // member(閲覧者) は canInviteMembers=false で forbidden（2026-07-03 強制）。
  if (viewerKind === "client" || viewerKind === "client-multi") {
    const viewerSlug = h.get("x-viewer-client-slug") ?? "";
    const availableSlugs = (h.get("x-viewer-available-slugs") ?? "")
      .split(",")
      .filter(Boolean);
    const allowed = viewerSlug === slug || availableSlugs.includes(slug);
    if (!allowed) throw new Error("forbidden");
    const orgRole = await lookupOrgRoleByEmail(slug, h.get("x-viewer-email"));
    if (!canInviteMembers(orgRole)) throw new Error("forbidden");
  }

  // slug → client。client_id は入力から取らず、必ずここで導出する。
  const client = getClientBySlug(slug);
  if (!client) throw new Error("org_not_found");

  // org が存在するか（監査整合のため slug→org の存在も確認）。
  const orgs = await db
    .select({ id: organizationTable.id })
    .from(organizationTable)
    .where(eq(organizationTable.slug, slug));
  if (!orgs.length) throw new Error("org_not_found");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const viewerEmail = h.get("x-viewer-email");
  const actorEmail =
    viewerKind === "admin"
      ? (adminEmails[0] ?? "admin@mixednuts-inc.com")
      : viewerEmail || `${slug}@client.mixednuts-inc.com`;

  return { clientId: client.id, actorEmail };
}

/**
 * クライアント自己アップロード。編集者以上のみ・自社 client_id にスコープ。
 *
 * mode "preview" → パース + 検証 + 既存行との差分件数を返す（BQ には書かない）。
 * mode "commit"  → 単一 MERGE で明示削除 + 更新 + 挿入。CSV にないキーは温存する。
 *
 * format "long"（既定）→ 指標,チャネル,年月,値 の long CSV（ファイルアップロード）。
 * format "matrix"      → スプレッドシートから貼り付けたマトリクス（新規 D5）。
 *   パーサが違うだけで、それ以降（既存行取得・差分計算・プレビュー文言組立・
 *   MERGE 実行・監査ログ）は 1 行も分岐しない — 両経路で完全に共有する。
 */
export async function uploadClientTargets(
  slug: string,
  text: string,
  mode: "preview" | "commit",
  format: "long" | "matrix" = "long",
): Promise<UploadTargetsResult> {
  try {
    const { clientId, actorEmail } = await assertCanEditTargets(slug);
    let rows: ClientTargetRow[];
    let errors: TargetRowError[];
    let interpretation: string | undefined;
    if (format === "matrix") {
      const parsed = parseClientTargetsMatrix(text);
      rows = parsed.rows;
      errors = parsed.errors;
      interpretation = parsed.interpretation;
    } else {
      const parsed = parseClientTargetsCsv(text);
      rows = parsed.rows;
      errors = parsed.errors;
      interpretation = undefined;
    }

    if (errors.length > 0) {
      return {
        ok: false,
        message: `検証エラー ${errors.length} 件 — 修正して再アップロードしてください`,
        rowErrors: errors,
      };
    }

    const existingRows = await fetchClientTargetsLong(clientId);
    const preview = classifyTargetChanges(rows, existingRows);

    if (mode === "preview") {
      return {
        ok: true,
        message: buildTargetPreviewMessage(preview),
        count: rows.length,
        preview,
        interpretation,
      };
    }

    const merge = buildTargetsMergeQuery(rows, clientId, actorEmail);
    let rowsUpserted = 0;
    let rowsDeleted = 0;
    if (merge) {
      const bq = getBigQuery();
      const [job] = await bq.createQueryJob({
        query: merge.sql,
        location: LOC,
        params: merge.params,
        types: merge.types,
      });
      await job.getQueryResults();
      rowsUpserted = preview.newCount + preview.updatedCount;
      rowsDeleted = preview.explicitDeleteCount;
      try {
        const [metadata] = await job.getMetadata();
        const dmlStats = metadata.statistics?.query?.dmlStats;
        rowsUpserted =
          Number(dmlStats?.insertedRowCount ?? preview.newCount) +
          Number(dmlStats?.updatedRowCount ?? preview.updatedCount);
        rowsDeleted = Number(
          dmlStats?.deletedRowCount ?? preview.explicitDeleteCount,
        );
      } catch (error) {
        console.warn("[targets] Could not read MERGE DML stats:", error);
      }
    }

    await writeAuditLog({
      actorEmail,
      targetOrgSlug: slug,
      action: "targets.uploaded",
      metadata: {
        client_id: clientId,
        rows_upserted: rowsUpserted,
        rows_deleted: rowsDeleted,
        rows_untouched: preview.untouchedCount,
      },
    });

    revalidatePath(`/dashboard/${slug}/settings/targets`);
    revalidateTag("bq-targets", "default");
    return {
      ok: true,
      message: `保存しました — ${buildTargetPreviewMessage(preview)}`,
      count: rows.length,
      preview,
      interpretation,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
