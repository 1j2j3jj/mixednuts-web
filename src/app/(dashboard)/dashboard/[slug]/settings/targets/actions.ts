"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organization as organizationTable } from "@/db/schema";
import { getClientBySlug } from "@/config/clients";
import { getBigQuery } from "@/lib/bigquery";
import { writeAuditLog } from "@/lib/audit";
import { lookupOrgRoleByEmail, canInviteMembers } from "@/lib/org-role";
import { parseClientTargetsCsv, type UploadTargetsResult } from "./targets-schema";

/**
 * Server actions for the tenant-side monthly-targets upload page.
 *
 * モデルB(2026-07-03) 準拠のクライアント自己アップロード:
 * - ゲート: 編集者以上のみ（member=閲覧者は forbidden）。members/actions.ts の
 *   assertCanInvite と同じ判定（x-viewer-kind + x-viewer-email→org-role）。
 * - スコープ: 書き込む client_id は slug から導出した client.id に強制する。
 *   入力 CSV に client_id 列は存在せず、他クライアントの行は絶対に触らない
 *   （この client_id 限定の DELETE→INSERT。masters.ts の全 client MERGE は使わない）。
 *
 * テンプレは組織レベル月次（client_id 列なし・6 列）:
 *   年月, 売上目標, CV目標, 広告予算, 目標ROAS(%), 目標CPA
 *
 * 純ロジック（ヘッダ定数・型・CSV パース）は ./targets-schema に切り出している
 * （"use server" モジュールは async 関数以外を export できないため）。
 */

const PROJECT = "ai-agent-mixednuts";
const LOC = "asia-northeast1";
const TABLE = `${PROJECT}.app_analytics.targets_monthly`;

/**
 * 編集者以上ゲート + slug→client 解決。member(閲覧者)/未知の viewer は throw。
 * 戻り値の clientId は BigQuery targets_monthly の client_id（= client.id）。
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
      : (viewerEmail || `${slug}@client.mixednuts-inc.com`);

  return { clientId: client.id, actorEmail };
}

/** BigQuery NUMERIC は文字列で渡す（FLOAT 精度落ち回避）。 */
function numStr(v: number | null): string | null {
  return v == null ? null : String(v);
}

/**
 * クライアント自己アップロード。編集者以上のみ・自社 client_id にスコープ。
 *
 * mode "preview" → パース + 検証のみ（BQ には書かない）。件数 or エラーを返す。
 * mode "commit"  → 検証（エラーあれば拒否）→ この client_id の既存行のみ
 *                  DELETE → DML INSERT（他 client の行は触らない）。
 *
 * DELETE→INSERT で全月置換だが client_id で必ず絞る。INSERT は VALUES/SELECT の
 * DML（streaming buffer を経由しない）ため、DELETE 直後でも "DML over streaming
 * buffer" エラーにならない。
 */
export async function uploadClientTargets(
  slug: string,
  csv: string,
  mode: "preview" | "commit",
): Promise<UploadTargetsResult> {
  try {
    const { clientId, actorEmail } = await assertCanEditTargets(slug);
    const { rows, errors } = parseClientTargetsCsv(csv);

    if (errors.length > 0) {
      return {
        ok: false,
        message: `検証エラー ${errors.length} 件 — 修正して再アップロードしてください`,
        rowErrors: errors,
      };
    }

    if (mode === "preview") {
      const msg =
        rows.length === 0
          ? "データ 0 行 — 確定するとこのクライアントの全目標が削除されます"
          : `OK. ${rows.length} 行を投入予定（このクライアントの既存目標を全置換）`;
      return { ok: true, message: msg, count: rows.length };
    }

    const bq = getBigQuery();

    // 1) この client_id の既存行のみ DELETE（他 client は絶対に触らない）。
    await (
      await bq.createQueryJob({
        query: `DELETE FROM \`${TABLE}\` WHERE client_id = @cid`,
        location: LOC,
        params: { cid: clientId },
        types: { cid: "STRING" },
      })
    )[0].getQueryResults();

    // 2) DML INSERT（VALUES を SELECT UNION ALL で構築）。streaming buffer 非経由。
    if (rows.length > 0) {
      const params: Record<string, string | number | null> = {
        by: actorEmail,
        cid: clientId,
      };
      const types: Record<string, string> = { by: "STRING", cid: "STRING" };

      const selects = rows.map((r, i) => {
        params[`ym${i}`] = r.year_month;
        params[`rev${i}`] = numStr(r.revenue_target);
        params[`cv${i}`] = r.cv_target == null ? null : Math.round(r.cv_target);
        params[`bud${i}`] = numStr(r.ad_spend_budget);
        params[`roas${i}`] = numStr(r.roas_target_pct);
        params[`cpa${i}`] = numStr(r.cpa_target);

        types[`ym${i}`] = "STRING";
        types[`rev${i}`] = "NUMERIC";
        types[`cv${i}`] = "INT64";
        types[`bud${i}`] = "NUMERIC";
        types[`roas${i}`] = "NUMERIC";
        types[`cpa${i}`] = "NUMERIC";

        // client_id は必ずバインド済みの @cid（入力由来ではない）を使う。
        return (
          `SELECT @cid AS client_id, DATE(@ym${i}) AS year_month, ` +
          `@rev${i} AS revenue_target, @cv${i} AS cv_target, ` +
          `@bud${i} AS ad_spend_budget, @roas${i} AS roas_target_pct, ` +
          `@cpa${i} AS cpa_target, CAST(NULL AS STRING) AS notes, ` +
          `CURRENT_TIMESTAMP() AS updated_at, @by AS updated_by`
        );
      });

      const sql = `
        INSERT INTO \`${TABLE}\` (
          client_id, year_month, revenue_target, cv_target,
          ad_spend_budget, roas_target_pct, cpa_target, notes,
          updated_at, updated_by
        )
        ${selects.join("\n        UNION ALL\n        ")}
      `;

      await (
        await bq.createQueryJob({ query: sql, location: LOC, params, types })
      )[0].getQueryResults();
    }

    await writeAuditLog({
      actorEmail,
      targetOrgSlug: slug,
      action: "targets.uploaded",
      metadata: { client_id: clientId, count: rows.length },
    });

    revalidatePath(`/dashboard/${slug}/settings/targets`);
    return {
      ok: true,
      message: `${rows.length} 行を保存しました（このクライアントの目標を更新）`,
      count: rows.length,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
