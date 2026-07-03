import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  user as userTable,
  member as memberTable,
  invitation as invitationTable,
  session as sessionTable,
  account as accountTable,
  organization as organizationTable,
} from "@/db/schema";
import { verifySession, COOKIE_NAME } from "@/lib/auth-cookie";
import { writeAuditLog } from "@/lib/audit";
import { findOrphanedOrgs, findEnvGrants } from "@/lib/account-delete";

/**
 * POST /api/auth/delete-account — 退会（本人によるアカウント削除）。
 *
 * 認可:
 *   - ログイン済み本人のみ。/api/auth/* は middleware の exempt path のため
 *     x-viewer-* ヘッダは付与されない（middleware.ts isExemptPath）。よって
 *     この route が mn_session cookie を直接 verifySession して本人を特定する。
 *   - kind "admin"（運営、impersonation 中を含む）は 403 — 運営アカウントは
 *     env ベースで DB user と 1:1 でなく、impersonation で他人を消せてしまう
 *     事故を防ぐ。impersonation cookie は admin セッションにしか載らないため
 *     kind 判定だけで両方を遮断できる（middleware.ts passThrough 参照）。
 *   - email 不在の旧セッション（2026-07-03 以前発行 / Basic auth 由来）は
 *     本人特定不能のため 401 → 再ログインを促す。
 *
 * 処理（1 トランザクション）:
 *   member（全 org 分）→ invitation（自分宛 pending）→ session / account →
 *   user の順にカスケード削除。session / account は FK onDelete: cascade も
 *   あるが、明示 DELETE で意図を固定する（schema.ts:59-61, 75-77）。
 *
 * 防御ガード:
 *   本人が owner で、その org に他の active な owner / admin がいない場合は
 *   409 — org が管理者不在（孤児化）になるため、運営への連絡を促す。
 *
 * 削除後: mn_session cookie を失効。クライアント側で /login へ遷移する。
 */
export async function POST(req: NextRequest) {
  const sess = await verifySession(req.cookies.get(COOKIE_NAME)?.value);
  if (!sess) {
    return NextResponse.json(
      { ok: false, error: "ログインが必要です" },
      { status: 401 }
    );
  }
  if (sess.kind === "admin") {
    // 運営 / impersonation 中は退会 API を使えない。
    return NextResponse.json(
      { ok: false, error: "運営アカウント（代理閲覧中を含む）は削除できません" },
      { status: 403 }
    );
  }
  const email = (sess.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "セッションからユーザーを特定できません。再ログイン後にお試しください",
      },
      { status: 401 }
    );
  }

  // 本人の user 行（email は大小混在保存の可能性があるため DB 側で lower）。
  const users = await db
    .select({ id: userTable.id, email: userTable.email })
    .from(userTable)
    .where(eq(sql`lower(${userTable.email})`, email));
  if (users.length === 0) {
    // env ベース（CLIENT_EMAILS_*）のみのユーザーは DB に行がない。
    // 削除対象が存在しないため運営連絡を促す（env の削除は運営作業）。
    return NextResponse.json(
      {
        ok: false,
        error:
          "削除対象のアカウントが見つかりません。運営にお問い合わせください",
      },
      { status: 404 }
    );
  }
  const userId = users[0].id;

  // env 許可リスト照合（must_fix #2）: role-resolver は env と DB の和集合で
  // 権限付与するため、env に載っている email は DB 行を消しても次回ログインで
  // アクセスが復活する。「削除でアクセス不能になる」を守れないので 409。
  const envGrants = findEnvGrants(email, process.env);
  if (envGrants.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "このメールアドレスは運営側のアクセス設定にも登録されているため、" +
          "退会手続きだけではアクセスを無効化できません。運営" +
          "（info@mixednuts-inc.com）にお問い合わせください",
      },
      { status: 409 }
    );
  }

  // オーナー孤児化ガード + カスケード削除を 1 トランザクション内で実行
  //（ガードを tx 外に置くと同 org の owner 2 名が同時退会した際に両方通過し
  //  管理者不在 org が生まれる TOCTOU があるため、tx 内で判定する）。
  class OrphanGuardError extends Error {
    constructor(public orgs: string[]) {
      super("orphan-guard");
    }
  }
  let ownMemberships: { organizationId: string; orgSlug: string | null; role: string }[] = [];
  try {
    await db.transaction(async (tx) => {
      ownMemberships = await tx
        .select({
          organizationId: memberTable.organizationId,
          orgSlug: organizationTable.slug,
          role: memberTable.role,
        })
        .from(memberTable)
        .innerJoin(
          organizationTable,
          eq(organizationTable.id, memberTable.organizationId)
        )
        .where(eq(memberTable.userId, userId));

      const orgIds = [...new Set(ownMemberships.map((m) => m.organizationId))];
      const otherActiveMembers =
        orgIds.length > 0
          ? await tx
              .select({
                organizationId: memberTable.organizationId,
                role: memberTable.role,
              })
              .from(memberTable)
              .where(
                and(
                  inArray(memberTable.organizationId, orgIds),
                  ne(memberTable.userId, userId),
                  // blocked（休眠ブロック済み）メンバーは管理者として数えない。
                  isNull(memberTable.blockedAt)
                )
              )
          : [];

      const orphaned = findOrphanedOrgs(ownMemberships, otherActiveMembers);
      if (orphaned.length > 0) throw new OrphanGuardError(orphaned);

      // カスケード削除（member → invitation → session / account → user）。
      await tx.delete(memberTable).where(eq(memberTable.userId, userId));
      await tx
        .delete(invitationTable)
        .where(
          and(
            eq(sql`lower(${invitationTable.email})`, email),
            eq(invitationTable.status, "pending")
          )
        );
      await tx.delete(sessionTable).where(eq(sessionTable.userId, userId));
      await tx.delete(accountTable).where(eq(accountTable.userId, userId));
      await tx.delete(userTable).where(eq(userTable.id, userId));
    });
  } catch (err) {
    if (err instanceof OrphanGuardError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `あなたは ${err.orgs.join(", ")} の唯一の管理者のため削除できません。` +
            "組織の管理者交代について運営にお問い合わせください",
        },
        { status: 409 }
      );
    }
    throw err;
  }

  await writeAuditLog({
    actorId: userId,
    actorEmail: email,
    action: "account.deleted",
    metadata: {
      source: "self_service",
      orgSlugs: ownMemberships.map((m) => m.orgSlug ?? m.organizationId),
    },
  });

  // cookie 失効（logout/route.ts と同一属性）。遷移はクライアント側で /login へ。
  const res = NextResponse.json({ ok: true, redirect: "/login" });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
