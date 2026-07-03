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
import { parseCsv } from "@/lib/master-csv";

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
 */

const PROJECT = "ai-agent-mixednuts";
const LOC = "asia-northeast1";
const TABLE = `${PROJECT}.app_analytics.targets_monthly`;

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
