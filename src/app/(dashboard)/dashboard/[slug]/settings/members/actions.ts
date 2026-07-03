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
}

/** Issue a new invitation from the tenant settings page. */
export async function createTenantInvite(
  slug: string,
  email: string,
  role: "editor" | "member"
): Promise<InviteResult> {
  const { orgId, actorEmail } = await assertCanInvite(slug);

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

  return { ok: true, link };
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
