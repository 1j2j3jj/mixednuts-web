"use server";

import { headers } from "next/headers";
import { db } from "@/db/client";
import {
  invitation as invitationTable,
  member as memberTable,
  organization as organizationTable,
  user as userTable,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getClientBySlug } from "@/config/clients";
import { writeAuditLog } from "@/lib/audit";
import { lookupOrgRoleByEmail, canInviteMembers } from "@/lib/org-role";
import { sendInvitationEmail } from "@/lib/email";

/** role 値 → 招待メール用の権限表示名。 */
function roleLabelOf(role: "editor" | "member"): string {
  return role === "editor" ? "編集者" : "閲覧者";
}

/**
 * Server actions for the tenant-side member management page.
 * モデルB(2026-07-03): assertCanInvite=招待/招待取消は編集者以上(canInviteMembers)。削除・役割変更は
 * クライアント側に存在せず運営(admin パネル)専用。lookupOrgRoleByEmail で判定。
 *
 * Authorization:
 *   - viewer kind "admin" → full access (impersonating or direct)
 *   - viewer kind "client" / "client-multi" → org Owner/Admin only
 *     (email 不在の旧セッション / Basic auth は member 扱いで forbidden)
 *
 * Quota enforcement:
 *   - createTenantInvite checks organization.maxMembers and maxAdmins
 *     before inserting the invitation row.
 */

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

async function assertCanInvite(slug: string): Promise<{ orgId: string; actorEmail: string }> {
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");

  if (
    viewerKind !== "admin" &&
    viewerKind !== "client" &&
    viewerKind !== "client-multi"
  ) {
    throw new Error("forbidden");
  }

  // For client viewers, confirm they're accessing their own org AND hold an
  // org-admin role (owner/admin). member ロールは閲覧のみ（2026-07-03 強制）。
  if (viewerKind === "client" || viewerKind === "client-multi") {
    const viewerSlug = h.get("x-viewer-client-slug") ?? "";
    const availableSlugs = (h.get("x-viewer-available-slugs") ?? "")
      .split(",")
      .filter(Boolean);
    const allowed =
      viewerSlug === slug || availableSlugs.includes(slug);
    if (!allowed) throw new Error("forbidden");
    const orgRole = await lookupOrgRoleByEmail(slug, h.get("x-viewer-email"));
    // モデルB: 招待・招待取消は編集者以上。削除・役割変更は運営専用（本ファイルに無い）。
    if (!canInviteMembers(orgRole)) throw new Error("forbidden");
  }

  const orgs = await db
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.slug, slug));
  if (!orgs.length) throw new Error("org_not_found");

  // 監査ログの実行者メール。client viewer は x-viewer-email（実ユーザー）を
  // 優先し、無い場合のみ疑似メールにフォールバック（2026-07-03 監査精度改善）。
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const viewerEmail = h.get("x-viewer-email");
  const actorEmail =
    viewerKind === "admin"
      ? (adminEmails[0] ?? "admin@mixednuts-inc.com")
      : (viewerEmail || `${slug}@client.mixednuts-inc.com`);

  return { orgId: orgs[0].id, actorEmail };
}

export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: Date;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string | null;
  expiresAt: Date;
  link: string;
}

export interface MembersData {
  members: TenantMember[];
  pendingInvites: PendingInvite[];
  /** null = no limit */
  maxMembers: number | null;
  maxAdmins: number | null;
}

/** List current members + pending invites for an org slug. */
export async function listTenantMembers(slug: string): Promise<MembersData> {
  const { orgId } = await assertCanInvite(slug);

  const [memberRows, orgRows, inviteRows] = await Promise.all([
    db
      .select({
        id: memberTable.id,
        userId: memberTable.userId,
        email: userTable.email,
        name: userTable.name,
        role: memberTable.role,
        joinedAt: memberTable.createdAt,
      })
      .from(memberTable)
      .leftJoin(userTable, eq(memberTable.userId, userTable.id))
      .where(eq(memberTable.organizationId, orgId)),
    db
      .select({
        maxMembers: organizationTable.maxMembers,
        maxAdmins: organizationTable.maxAdmins,
      })
      .from(organizationTable)
      .where(eq(organizationTable.id, orgId)),
    db
      .select()
      .from(invitationTable)
      .where(
        and(
          eq(invitationTable.organizationId, orgId),
          eq(invitationTable.status, "pending")
        )
      ),
  ]);

  return {
    members: memberRows.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email ?? "",
      name: r.name ?? "",
      role: r.role,
      joinedAt: r.joinedAt,
    })),
    pendingInvites: inviteRows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      expiresAt: r.expiresAt,
      link: `${baseURL}/api/auth/accept-invitation?id=${r.id}`,
    })),
    maxMembers: orgRows[0]?.maxMembers ?? null,
    maxAdmins: orgRows[0]?.maxAdmins ?? null,
  };
}

export interface InviteResult {
  ok: boolean;
  link?: string;
  error?: string;
  /** 招待メールが送信されたか（UI 表示用。キー未設定時は false）。 */
  emailSent?: boolean;
}

/** Issue a new invitation from the tenant settings page. */
export async function createTenantInvite(
  slug: string,
  email: string,
  role: "editor" | "member"
): Promise<InviteResult> {
  const { orgId, actorEmail } = await assertCanInvite(slug);

  // 🔴 role はランタイム検証必須。型は消えるため、editor が Server Action へ
  // role='owner'/'admin' を直送すると権限昇格＋上限回避になる（監査P2）。
  // クライアント側の招待は editor / member のみ許可。
  if (role !== "editor" && role !== "member") {
    return { ok: false, error: "無効なロールです" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, error: "有効なメールアドレスを入力してください" };
  }

  // Quota check
  const [orgRows, memberRows] = await Promise.all([
    db
      .select({
        maxMembers: organizationTable.maxMembers,
        maxAdmins: organizationTable.maxAdmins,
      })
      .from(organizationTable)
      .where(eq(organizationTable.id, orgId)),
    db
      .select({ role: memberTable.role })
      .from(memberTable)
      .where(eq(memberTable.organizationId, orgId)),
  ]);

  const maxMembers = orgRows[0]?.maxMembers ?? null;
  const maxAdmins = orgRows[0]?.maxAdmins ?? null;
  const currentTotal = memberRows.length;
  const currentEditors = memberRows.filter(
    (m) => m.role === "editor" || m.role === "admin" || m.role === "owner"
  ).length;

  if (maxMembers !== null && currentTotal >= maxMembers) {
    return {
      ok: false,
      error: `メンバー上限（${maxMembers}名）に達しています。運営にお問い合わせください。`,
    };
  }
  if (role === "editor" && maxAdmins !== null && currentEditors >= maxAdmins) {
    return {
      ok: false,
      error: `編集者上限（${maxAdmins}名）に達しています。運営にお問い合わせください。`,
    };
  }

  // Find inviter user
  const inviterRows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, actorEmail));
  let inviterId: string;
  if (inviterRows.length) {
    inviterId = inviterRows[0].id;
  } else {
    inviterId = crypto.randomUUID();
    await db.insert(userTable).values({
      id: inviterId,
      name: "Admin",
      email: actorEmail,
      emailVerified: true,
      role: "admin",
    });
  }

  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  await db.insert(invitationTable).values({
    id,
    organizationId: orgId,
    email: normalizedEmail,
    role,
    status: "pending",
    expiresAt,
    inviterId,
  });

  const link = `${baseURL}/api/auth/accept-invitation?id=${id}`;

  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: slug,
    action: "invitation.created",
    metadata: { email: normalizedEmail, role, source: "tenant_settings" },
  });

  console.info(
    `[tenant-invite] slug=${slug} email=${normalizedEmail} role=${role}\n[tenant-invite] link=${link}`
  );

  // 招待メール送信（失敗しても招待結果は ok のまま・リンクは常に返す）。
  const emailResult = await sendInvitationEmail({
    to: normalizedEmail,
    clientLabel: getClientBySlug(slug)?.label ?? slug,
    roleLabel: roleLabelOf(role),
    acceptUrl: link,
  });

  return { ok: true, link, emailSent: emailResult.sent };
}

/** 1 件分の一括招待結果。 */
export interface BulkInviteItem {
  email: string;
  ok: boolean;
  link?: string;
  /** ok=false / skipped の理由。 */
  error?: string;
  /** 既にメンバー or 保留中招待があり作成をスキップした。 */
  skipped?: boolean;
  /** 招待メールが送信されたか（UI 表示用。キー未設定時は false）。 */
  emailSent?: boolean;
}

export interface BulkInviteResult {
  ok: boolean;
  items: BulkInviteItem[];
  error?: string;
}

/**
 * 一括招待（貼り付けた複数メールを 1 ロールでまとめて発行）。
 * 区切りは 改行 / カンマ / セミコロン / 空白。バッチ全体で 1 ロール。
 * ガード: assertCanInvite（編集者以上）+ role ランタイム検証 + 自社org スコープ。
 * クォータはバッチ合計で判定（超過分は作らず理由を返す）。既存メンバー / 保留招待は skip。
 */
export async function createTenantInvites(
  slug: string,
  emailsRaw: string,
  role: "editor" | "member",
): Promise<BulkInviteResult> {
  const { orgId, actorEmail } = await assertCanInvite(slug);
  if (role !== "editor" && role !== "member") {
    return { ok: false, items: [], error: "無効なロールです" };
  }

  // パース: 区切り分割 → 正規化 → 重複除去 → 形式チェック。
  const seen = new Set<string>();
  const parsed: { email: string; valid: boolean }[] = [];
  for (const raw of emailsRaw.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    parsed.push({ email: e, valid: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) });
  }
  if (parsed.length === 0) {
    return { ok: false, items: [], error: "メールアドレスを入力してください" };
  }

  // 🔴 クォータ判定→insert は org 行ロックのトランザクション内で行う。
  // 別の一括招待が並走すると count→insert 分離で maxMembers/maxAdmins を
  // 突破しうる（TOCTOU、監査指摘）。org 行を FOR UPDATE でロックし、同一 org の
  // 招待作成を直列化する（読み・上限判定・insert を同一トランザクションに閉じる）。
  const { items, createdEmails } = await db.transaction(async (tx) => {
    // org 行ロック（同一 org の並走招待を直列化）。
    await tx.execute(sql`SELECT id FROM "organization" WHERE id = ${orgId} FOR UPDATE`);

    const [orgRows, memberRows, pendingRows] = await Promise.all([
      tx
        .select({ maxMembers: organizationTable.maxMembers, maxAdmins: organizationTable.maxAdmins })
        .from(organizationTable)
        .where(eq(organizationTable.id, orgId)),
      tx
        .select({ role: memberTable.role, email: userTable.email })
        .from(memberTable)
        .leftJoin(userTable, eq(userTable.id, memberTable.userId))
        .where(eq(memberTable.organizationId, orgId)),
      tx
        .select({ email: invitationTable.email })
        .from(invitationTable)
        .where(and(eq(invitationTable.organizationId, orgId), eq(invitationTable.status, "pending"))),
    ]);
    const maxMembers = orgRows[0]?.maxMembers ?? null;
    const maxAdmins = orgRows[0]?.maxAdmins ?? null;
    const existingMemberEmails = new Set(
      memberRows.map((m) => (m.email ?? "").toLowerCase()).filter(Boolean),
    );
    const pendingEmails = new Set(pendingRows.map((p) => p.email.toLowerCase()));
    let currentTotal = memberRows.length + pendingRows.length;
    let currentEditors = memberRows.filter(
      (m) => m.role === "editor" || m.role === "admin" || m.role === "owner",
    ).length;

    // inviter を 1 回だけ解決（トランザクション内）。
    const inviterRows = await tx.select().from(userTable).where(eq(userTable.email, actorEmail));
    let inviterId: string;
    if (inviterRows.length) {
      inviterId = inviterRows[0].id;
    } else {
      inviterId = crypto.randomUUID();
      await tx.insert(userTable).values({
        id: inviterId,
        name: "Admin",
        email: actorEmail,
        emailVerified: true,
        role: "admin",
      });
    }

    const items: BulkInviteItem[] = [];
    const createdEmails: string[] = [];
    for (const { email, valid } of parsed) {
      if (!valid) {
        items.push({ email, ok: false, error: "形式が不正" });
        continue;
      }
      if (existingMemberEmails.has(email)) {
        items.push({ email, ok: false, skipped: true, error: "既にメンバー" });
        continue;
      }
      if (pendingEmails.has(email)) {
        items.push({ email, ok: false, skipped: true, error: "招待済み（保留中）" });
        continue;
      }
      if (maxMembers !== null && currentTotal >= maxMembers) {
        items.push({ email, ok: false, error: `メンバー上限（${maxMembers}名）超過` });
        continue;
      }
      if (role === "editor" && maxAdmins !== null && currentEditors >= maxAdmins) {
        items.push({ email, ok: false, error: `編集者上限（${maxAdmins}名）超過` });
        continue;
      }

      const id = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await tx.insert(invitationTable).values({
        id,
        organizationId: orgId,
        email,
        role,
        status: "pending",
        expiresAt,
        inviterId,
      });
      // 同一バッチ内の重複作成防止（既にパース段でdedupe済みだが二重ガード）。
      pendingEmails.add(email);
      currentTotal += 1;
      if (role === "editor") currentEditors += 1;
      createdEmails.push(email);
      items.push({ email, ok: true, link: `${baseURL}/api/auth/accept-invitation?id=${id}` });
    }
    return { items, createdEmails };
  });

  if (createdEmails.length > 0) {
    await writeAuditLog({
      actorEmail,
      targetOrgId: orgId,
      targetOrgSlug: slug,
      action: "invitation.created",
      metadata: { emails: createdEmails, role, count: createdEmails.length, source: "tenant_settings_bulk" },
    });
  }

  // 招待メール送信は FOR UPDATE トランザクションの外で行う（メール I/O で
  // org 行ロックを保持し続けないため）。作成に成功した item だけ送信し、
  // 送信可否を emailSent に反映する（失敗しても招待結果は変えない）。
  if (createdEmails.length > 0) {
    const clientLabel = getClientBySlug(slug)?.label ?? slug;
    const roleLabel = roleLabelOf(role);
    for (const item of items) {
      if (!item.ok || !item.link) continue;
      const emailResult = await sendInvitationEmail({
        to: item.email,
        clientLabel,
        roleLabel,
        acceptUrl: item.link,
      });
      item.emailSent = emailResult.sent;
    }
  }

  return { ok: items.some((i) => i.ok), items };
}

/** Revoke a pending invitation. */
export async function revokeTenantInvite(
  slug: string,
  invitationId: string
): Promise<{ ok: boolean; error?: string }> {
  const { orgId, actorEmail } = await assertCanInvite(slug);

  // Verify the invite belongs to this org.
  const inv = await db
    .select()
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.id, invitationId),
        eq(invitationTable.organizationId, orgId)
      )
    );
  if (!inv.length) return { ok: false, error: "招待が見つかりません" };

  await db
    .update(invitationTable)
    .set({ status: "cancelled" })
    .where(eq(invitationTable.id, invitationId));

  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: slug,
    action: "invitation.revoked",
    metadata: { invitationId, email: inv[0].email },
  });

  return { ok: true };
}
