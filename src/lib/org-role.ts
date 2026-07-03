import "server-only";
import { headers } from "next/headers";
import { db } from "@/db/client";
import {
  user as userTable,
  member as memberTable,
  organization as organizationTable,
} from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * Org 内ロールの解決（2026-07-03 追加）。
 *
 * 背景: メンバー管理の招待/削除が「クライアントのログインユーザーなら誰でも」
 * 実行できる Phase 1 実装が残っていた（member.role が DB にあるのに未参照）。
 * セッションに email を埋め（auth-cookie.ts）、ここで member.role に解決する。
 *
 * 返り値:
 *   - "mixednuts-admin" … 運営（ADMIN_EMAILS）。常に全権。
 *   - "owner" | "admin" … クライアント組織の管理者。メンバー管理可。
 *   - "member"          … 閲覧のみ。メンバー管理タブ非表示 + 操作サーバ拒否。
 *
 * 最小権限原則: email 不在（旧セッション / Basic auth / env ベースの
 * レガシーログイン）や member 行不在は "member" に倒す。管理者権限が
 * 必要なユーザーは再ログイン（email 埋め込み）で回復する。
 */
export type OrgRole = "mixednuts-admin" | "owner" | "admin" | "member";

export async function lookupOrgRoleByEmail(
  slug: string,
  email: string | null | undefined
): Promise<"owner" | "admin" | "member"> {
  const normalised = (email ?? "").trim().toLowerCase();
  if (!normalised) return "member";
  try {
    const rows = await db
      .select({ role: memberTable.role })
      .from(userTable)
      .innerJoin(memberTable, eq(memberTable.userId, userTable.id))
      .innerJoin(
        organizationTable,
        eq(organizationTable.id, memberTable.organizationId)
      )
      .where(
        and(
          // user.email の大小をDB側で吸収（Better Auth保存が混在しても一致）。
          eq(sql`lower(${userTable.email})`, normalised),
          eq(organizationTable.slug, slug),
          isNull(memberTable.blockedAt)
        )
      );
    // (userId, organizationId) にユニーク制約が無いため複数行がありうる。
    // 行順に依存せず「最高権限」を採る（member行が先頭でも owner を降格させない。
    // M1: 2026-07-03 Grok/Opus 監査指摘）。owner のみメンバー管理の最上位だが
    // canManageMembers 上は owner/admin 同等のため優先度は owner>admin>member。
    const roles = new Set(rows.map((r) => r.role));
    if (roles.has("owner")) return "owner";
    if (roles.has("admin")) return "admin";
    return "member";
  } catch (err) {
    // DB 障害時も権限を広げない（最小権限に倒す）。
    console.error("[org-role] role lookup failed:", err);
    return "member";
  }
}

/** リクエストヘッダ（middleware が付与）から現在の閲覧者のロールを解決。 */
export async function getViewerOrgRole(slug: string): Promise<OrgRole> {
  const h = await headers();
  const kind = h.get("x-viewer-kind");
  if (kind === "admin") return "mixednuts-admin";
  if (kind !== "client" && kind !== "client-multi") return "member";
  return lookupOrgRoleByEmail(slug, h.get("x-viewer-email"));
}

/** メンバー管理（招待/削除/取消）を実行できるロールか。 */
export function canManageMembers(role: OrgRole): boolean {
  return role === "mixednuts-admin" || role === "owner" || role === "admin";
}
