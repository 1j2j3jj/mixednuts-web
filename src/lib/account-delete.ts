/**
 * 退会（アカウント削除）のドメインロジック — 純関数部分。
 *
 * /api/auth/delete-account から使う。DB アクセスを含まない判定だけを
 * ここに切り出して unit test 可能にする（vitest は DB を持たないため）。
 *
 * オーナー孤児化ガード:
 *   削除しようとしている本人が org の owner で、かつその org に本人以外の
 *   管理権限者（owner / admin）が一人もいない場合、削除すると org が
 *   管理者不在（孤児）になる。この場合は 409 を返し運営への連絡を促す。
 *   editor は招待権限のみ（メンバー削除・役割変更は運営専用、org-role.ts
 *   のモデルB）なので「管理者」には数えない。
 */

/** 削除対象ユーザー自身のメンバーシップ行。 */
export interface OwnMembership {
  organizationId: string;
  /** organization.slug（表示用、null の org は id で代替）。 */
  orgSlug: string | null;
  role: string;
}

/** 同じ org に属する他ユーザーの行（blocked を除いた active のみ渡すこと）。 */
export interface OtherMemberRow {
  organizationId: string;
  role: string;
}

const ADMIN_ROLES = new Set(["owner", "admin"]);

/**
 * 削除すると管理者不在になる org の表示名リストを返す。
 * 空配列 = ガードに掛からない（削除してよい）。
 */
export function findOrphanedOrgs(
  ownMemberships: OwnMembership[],
  otherActiveMembers: OtherMemberRow[]
): string[] {
  const orphaned: string[] = [];
  for (const m of ownMemberships) {
    if (m.role !== "owner") continue;
    const hasOtherAdmin = otherActiveMembers.some(
      (o) => o.organizationId === m.organizationId && ADMIN_ROLES.has(o.role)
    );
    if (!hasOtherAdmin) orphaned.push(m.orgSlug ?? m.organizationId);
  }
  return orphaned;
}

/**
 * env 許可リスト（CLIENT_EMAILS_* / ADMIN_EMAILS）に載っている email か。
 *
 * role-resolver はログイン時に env と DB membership の**和集合**で権限を
 * 付与するため、env に載っているユーザーは DB の user/member 行を消しても
 * 次回 Google ログインで env 経由でアクセスが復活する（敵対検証 2026-07-04
 * must_fix #2）。該当する場合は削除を 409 で拒み、運営作業（env からの
 * 除去）を促す。マッチした env キー名の配列を返す（空 = 載っていない）。
 */
export function findEnvGrants(
  email: string,
  env: Record<string, string | undefined>
): string[] {
  const target = email.trim().toLowerCase();
  if (!target) return [];
  const hits: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    if (key !== "ADMIN_EMAILS" && !key.startsWith("CLIENT_EMAILS_")) continue;
    const listed = value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (listed.includes(target)) hits.push(key);
  }
  return hits.sort();
}
