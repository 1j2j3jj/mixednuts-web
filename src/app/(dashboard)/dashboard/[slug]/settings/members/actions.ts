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
import {
  generateInviteToken,
  hashInviteToken,
  buildInviteUrl,
} from "@/lib/invite-token";
import {
  assertInviteRateLimit,
  InviteRateLimitError,
  getClientIp,
} from "@/lib/invite-rate-limit";
import {
  phaseFColumnsAvailable,
  invitationTokenHashField,
  invitationEmailStatusFields,
  insertInvitationRow,
  markInvitationRevoked,
  recordInvitationEmailResult,
} from "@/db/phase-f-columns";

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

async function assertCanInvite(slug: string): Promise<{
  orgId: string;
  actorEmail: string;
  impersonatedOrgSlug: string | null;
  /** Best-effort caller IP (see getClientIp) — for the per-IP burst limiter, not for authorization. */
  ip: string | null;
}> {
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
    const allowed = viewerSlug === slug || availableSlugs.includes(slug);
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

  // 監査ログの実行者メール。admin/client 問わず x-viewer-email（実ユーザー）を
  // 優先する。admin は以前 ADMIN_EMAILS[0] 固定だったため、複数管理者がいる
  // 環境で「誰が実行したか」が監査ログから分からなかった（F-4 監査指摘・
  // 2026-07-25 修正）。email 不在の旧セッションのみフォールバック。
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const viewerEmail = h.get("x-viewer-email");
  const actorEmail =
    viewerKind === "admin"
      ? viewerEmail || adminEmails[0] || "admin@mixednuts-inc.com"
      : viewerEmail || `${slug}@client.mixednuts-inc.com`;

  // F-4: whether this admin write is happening during an active
  // impersonation session — forwarded into the audit_log row so an
  // action can be told apart from a direct (non-impersonating) admin
  // action against the same org. See src/lib/admin-actor.ts for the
  // shared version of this pattern used by admin-only routes.
  const impersonatedOrgSlug = h.get("x-impersonated-slug");

  return {
    orgId: orgs[0].id,
    actorEmail,
    impersonatedOrgSlug: impersonatedOrgSlug || null,
    ip: getClientIp(h),
  };
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
  /**
   * F-3 (2026-07-25): once an invite has a hashed token, the raw secret
   * cannot be reconstructed from its hash — so `link` is only present for
   * legacy pre-hardening rows (id-only lookup, tokenHash null). For a
   * hashed row this is null; use resendTenantInvite to issue a fresh,
   * usable link (which also invalidates the old one).
   */
  link: string | null;
  /** Honest email-send status — see email.ts SendInvitationEmailResult. Null = never attempted (e.g. legacy row predating this column, or RESEND_API_KEY unset at send time). */
  emailStatus:
    "accepted" | "failed" | "not_configured" | "delivered" | "bounced" | null;
  emailAttemptCount: number;
  emailLastAttemptAt: Date | null;
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

  // Phase F (F-3/F-2) columns may not exist yet — see
  // src/db/phase-f-columns.ts. tokenHash/emailStatus/emailAttemptCount/
  // emailLastAttemptAt are projected as real columns once migration 0003
  // has run, or as literal NULL/0 (never referencing the column) until
  // then — never a bare `.select()`, which would reference every
  // configured column regardless of what's actually needed here.
  const columnsAvailable = await phaseFColumnsAvailable();

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
      .select({
        id: invitationTable.id,
        email: invitationTable.email,
        role: invitationTable.role,
        expiresAt: invitationTable.expiresAt,
        tokenHash: invitationTokenHashField(columnsAvailable),
        ...invitationEmailStatusFields(columnsAvailable),
      })
      .from(invitationTable)
      .where(
        and(
          eq(invitationTable.organizationId, orgId),
          eq(invitationTable.status, "pending"),
        ),
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
      // F-3: a hashed row's raw token can't be reconstructed — only
      // legacy (pre-hardening) rows still expose a working id-only link.
      link: r.tokenHash
        ? null
        : `${baseURL}/api/auth/accept-invitation?id=${r.id}`,
      emailStatus:
        (r.emailStatus as PendingInvite["emailStatus"] | null) ?? null,
      emailAttemptCount: r.emailAttemptCount ?? 0,
      emailLastAttemptAt: r.emailLastAttemptAt ?? null,
    })),
    maxMembers: orgRows[0]?.maxMembers ?? null,
    maxAdmins: orgRows[0]?.maxAdmins ?? null,
  };
}

export interface InviteResult {
  ok: boolean;
  link?: string;
  error?: string;
  /** 招待メールが送信されたか（UI 表示用。キー未設定時は false）。sent=true は Resend の受理のみを意味し、配信保証ではない。 */
  emailSent?: boolean;
  /** 送信の正直な状態。UI 文言は必ずこちらの語彙を使うこと（emailSent 単独から「配信済み」を含意させない）。 */
  emailStatus?: "accepted" | "failed" | "not_configured";
}

/** Issue a new invitation from the tenant settings page. */
export async function createTenantInvite(
  slug: string,
  email: string,
  role: "editor" | "member",
): Promise<InviteResult> {
  const { orgId, actorEmail, impersonatedOrgSlug, ip } =
    await assertCanInvite(slug);

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

  // F-3: server-side rate limit (a UI-side cooldown is not a control —
  // this is enforced before any invitation row is written).
  try {
    await assertInviteRateLimit({ actorEmail, orgId, ip });
  } catch (e) {
    if (e instanceof InviteRateLimitError)
      return { ok: false, error: e.message };
    throw e;
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
    (m) => m.role === "editor" || m.role === "admin" || m.role === "owner",
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

  // F-3: if this email already has a pending invitation for this org,
  // revoke it before issuing a new one — a re-invite (which is also how
  // "resend" is achieved, see resendTenantInvite below) must invalidate
  // the previous token, not leave two live links redeemable at once.
  const priorPending = await db
    .select({ id: invitationTable.id })
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.organizationId, orgId),
        eq(invitationTable.email, normalizedEmail),
        eq(invitationTable.status, "pending"),
      ),
    );
  for (const prior of priorPending) {
    await markInvitationRevoked(db, prior.id);
  }

  // F-3: id stays a non-secret primary key; the actual bearer secret is a
  // separately generated token, hashed before storage, and only ever
  // emitted here into the URL / email body.
  const id = crypto.randomUUID();
  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  await insertInvitationRow(db, {
    id,
    organizationId: orgId,
    email: normalizedEmail,
    role,
    status: "pending",
    expiresAt,
    inviterId,
    tokenHash,
  });

  const link = buildInviteUrl(baseURL, id, rawToken);

  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: slug,
    action: "invitation.created",
    metadata: { email: normalizedEmail, role, source: "tenant_settings" },
    impersonatedOrgSlug,
  });

  // F-3: never log the raw token/link — only the non-secret id.
  console.info(
    `[tenant-invite] slug=${slug} email=${normalizedEmail} role=${role} id=${id}`,
  );

  // 招待メール送信（失敗しても招待結果は ok のまま・リンクは常に返す）。
  const emailResult = await sendInvitationEmail({
    to: normalizedEmail,
    clientLabel: getClientBySlug(slug)?.label ?? slug,
    roleLabel: roleLabelOf(role),
    acceptUrl: link,
  });

  // F-2: persist what we actually know about the send attempt — never
  // only in-memory / client-side state (see MembersClient.tsx history).
  // No-ops pre-migration (nowhere to persist it yet) — see
  // src/db/phase-f-columns.ts.
  await recordInvitationEmailResult(id, {
    emailStatus: emailResult.status,
    emailProviderMessageId: emailResult.providerMessageId ?? null,
    emailLastError: emailResult.reason ?? null,
  });

  return {
    ok: true,
    link,
    emailSent: emailResult.sent,
    emailStatus: emailResult.status,
  };
}

/** 1 件分の一括招待結果。 */
export interface BulkInviteItem {
  email: string;
  ok: boolean;
  link?: string;
  /** ok=false / skipped の理由。 */
  error?: string;
  /** 既にメンバーで作成をスキップした（保留中招待は F-3 以降スキップでなく置き換え＝再送になる）。 */
  skipped?: boolean;
  /** 招待メールが送信されたか（UI 表示用。キー未設定時は false）。sent=true は Resend の受理のみ、配信保証ではない。 */
  emailSent?: boolean;
  /** 送信の正直な状態。UI 文言は必ずこちらの語彙を使うこと。 */
  emailStatus?: "accepted" | "failed" | "not_configured";
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
 * クォータはバッチ合計で判定（超過分は作らず理由を返す）。既存メンバーは skip。保留中の
 * 招待は F-3（2026-07-25）以降 skip でなく置き換え（旧トークンを失効させ新規発行 = 再送）。
 */
export async function createTenantInvites(
  slug: string,
  emailsRaw: string,
  role: "editor" | "member",
): Promise<BulkInviteResult> {
  const { orgId, actorEmail, impersonatedOrgSlug, ip } =
    await assertCanInvite(slug);
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

  // F-3: server-side rate limit — one bulk batch counts as one call.
  try {
    await assertInviteRateLimit({ actorEmail, orgId, ip });
  } catch (e) {
    if (e instanceof InviteRateLimitError)
      return { ok: false, items: [], error: e.message };
    throw e;
  }

  // Raw tokens exist only transiently in this request (never persisted —
  // see invite-token.ts). Collected here so the post-transaction email
  // send + email-status persistence loop below can build each item's link.
  const rawTokenByEmail = new Map<string, { id: string; token: string }>();

  // 🔴 クォータ判定→insert は org 行ロックのトランザクション内で行う。
  // 別の一括招待が並走すると count→insert 分離で maxMembers/maxAdmins を
  // 突破しうる（TOCTOU、監査指摘）。org 行を FOR UPDATE でロックし、同一 org の
  // 招待作成を直列化する（読み・上限判定・insert を同一トランザクションに閉じる）。
  const { items, createdEmails } = await db.transaction(async (tx) => {
    // org 行ロック（同一 org の並走招待を直列化）。
    await tx.execute(
      sql`SELECT id FROM "organization" WHERE id = ${orgId} FOR UPDATE`,
    );

    const [orgRows, memberRows, pendingRows] = await Promise.all([
      tx
        .select({
          maxMembers: organizationTable.maxMembers,
          maxAdmins: organizationTable.maxAdmins,
        })
        .from(organizationTable)
        .where(eq(organizationTable.id, orgId)),
      tx
        .select({ role: memberTable.role, email: userTable.email })
        .from(memberTable)
        .leftJoin(userTable, eq(userTable.id, memberTable.userId))
        .where(eq(memberTable.organizationId, orgId)),
      tx
        .select({ id: invitationTable.id, email: invitationTable.email })
        .from(invitationTable)
        .where(
          and(
            eq(invitationTable.organizationId, orgId),
            eq(invitationTable.status, "pending"),
          ),
        ),
    ]);
    const maxMembers = orgRows[0]?.maxMembers ?? null;
    const maxAdmins = orgRows[0]?.maxAdmins ?? null;
    const existingMemberEmails = new Set(
      memberRows.map((m) => (m.email ?? "").toLowerCase()).filter(Boolean),
    );
    // F-3 (2026-07-25): previously this was a Set used only to SKIP an
    // email with an existing pending invite. Now a Map id-by-email, so a
    // re-invite for an already-pending email can CANCEL the prior
    // invitation (invalidating its token) before creating a fresh one —
    // consistent with the single-invite path above and the explicit F-3
    // requirement that a re-send invalidate the previous token.
    const pendingInviteIdByEmail = new Map(
      pendingRows.map((p) => [p.email.toLowerCase(), p.id]),
    );
    let currentTotal = memberRows.length + pendingRows.length;
    let currentEditors = memberRows.filter(
      (m) => m.role === "editor" || m.role === "admin" || m.role === "owner",
    ).length;

    // inviter を 1 回だけ解決（トランザクション内）。
    const inviterRows = await tx
      .select()
      .from(userTable)
      .where(eq(userTable.email, actorEmail));
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
      // DEFERRED, reasoned (2026-07-25 post-audit review, F-3 email
      // enumeration follow-up): this distinct "既にメンバー" message is a
      // narrower case of the same shape F-3 hardened on the PUBLIC
      // accept-invitation route (token/id mismatch -> same generic error
      // as an unknown id), but is NOT changed here. The caller of this
      // action must already be an authenticated editor/admin of THIS
      // specific org (assertCanInvite, above) — unlike the public route,
      // there is no unauthenticated attacker surface. The check is also
      // strictly scoped to this org's own membership (existingMemberEmails
      // is built from memberRows filtered to this orgId), so it cannot
      // leak whether an email belongs to a DIFFERENT org the caller has no
      // access to. And the fact itself — whether a given email is already
      // a member of an org this caller already administers — is already
      // directly visible to that same caller via listTenantMembers's
      // member list on this same settings page. Unifying the message
      // would remove real workflow value (an editor pasting 10 emails
      // needs to know WHICH ones need a different follow-up) without
      // closing any information-disclosure gap this caller doesn't
      // already have through an intended, direct channel. Revisit only if
      // this action's authorization model changes (e.g. if a lower-trust
      // role ever gains bulk-invite access).
      if (existingMemberEmails.has(email)) {
        items.push({ email, ok: false, skipped: true, error: "既にメンバー" });
        continue;
      }
      // F-3: a re-invite for an email that already has a pending
      // invitation replaces it (revokes the old token, issues a fresh
      // one) rather than skipping — consistent with the single-invite
      // path and the explicit requirement that a re-send invalidate the
      // previous token. A replacement doesn't consume a NEW quota slot
      // (currentTotal already counts the row being replaced), so the
      // quota check below is skipped for that case; only genuinely new
      // rows count against and increment currentTotal.
      const priorPendingId = pendingInviteIdByEmail.get(email);
      const isReplacement = priorPendingId !== undefined;
      if (!isReplacement) {
        if (maxMembers !== null && currentTotal >= maxMembers) {
          items.push({
            email,
            ok: false,
            error: `メンバー上限（${maxMembers}名）超過`,
          });
          continue;
        }
      }
      if (
        role === "editor" &&
        maxAdmins !== null &&
        currentEditors >= maxAdmins
      ) {
        items.push({
          email,
          ok: false,
          error: `編集者上限（${maxAdmins}名）超過`,
        });
        continue;
      }

      // Quota checks passed — now safe to revoke the prior invite (no
      // path left where we cancel it and then bail without replacing).
      if (isReplacement && priorPendingId) {
        await markInvitationRevoked(tx, priorPendingId);
      }

      const id = crypto.randomUUID();
      const rawToken = generateInviteToken();
      const tokenHash = await hashInviteToken(rawToken);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await insertInvitationRow(tx, {
        id,
        organizationId: orgId,
        email,
        role,
        status: "pending",
        expiresAt,
        inviterId,
        tokenHash,
      });
      // 同一バッチ内の重複作成防止（既にパース段でdedupe済みだが二重ガード）。
      pendingInviteIdByEmail.set(email, id);
      if (!isReplacement) {
        currentTotal += 1;
        if (role === "editor") currentEditors += 1;
      }
      createdEmails.push(email);
      rawTokenByEmail.set(email, { id, token: rawToken });
      items.push({
        email,
        ok: true,
        link: buildInviteUrl(baseURL, id, rawToken),
      });
    }
    return { items, createdEmails };
  });

  if (createdEmails.length > 0) {
    await writeAuditLog({
      actorEmail,
      targetOrgId: orgId,
      targetOrgSlug: slug,
      action: "invitation.created",
      metadata: {
        emails: createdEmails,
        role,
        count: createdEmails.length,
        source: "tenant_settings_bulk",
      },
      impersonatedOrgSlug,
    });
  }

  // 招待メール送信は FOR UPDATE トランザクションの外で行う（メール I/O で
  // org 行ロックを保持し続けないため）。作成に成功した item だけ送信し、
  // 送信可否を emailSent に反映する（失敗しても招待結果は変えない）。
  // F-2: also persist the honest send status onto each invitation row —
  // not just the in-memory `item` returned to this one request.
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
      item.emailStatus = emailResult.status;
      const created = rawTokenByEmail.get(item.email);
      if (created) {
        await recordInvitationEmailResult(created.id, {
          emailStatus: emailResult.status,
          emailProviderMessageId: emailResult.providerMessageId ?? null,
          emailLastError: emailResult.reason ?? null,
        });
      }
    }
  }

  return { ok: items.some((i) => i.ok), items };
}

/** Revoke a pending invitation. */
export async function revokeTenantInvite(
  slug: string,
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { orgId, actorEmail, impersonatedOrgSlug } =
    await assertCanInvite(slug);

  // Verify the invite belongs to this org. Explicit projection of base
  // columns only (id/email) — a bare `.select()` would reference every
  // Phase F column too and 42703 pre-migration; see phase-f-columns.ts.
  const inv = await db
    .select({ id: invitationTable.id, email: invitationTable.email })
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.id, invitationId),
        eq(invitationTable.organizationId, orgId),
      ),
    );
  if (!inv.length) return { ok: false, error: "招待が見つかりません" };

  await markInvitationRevoked(db, invitationId);

  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: slug,
    action: "invitation.revoked",
    metadata: { invitationId, email: inv[0].email },
    impersonatedOrgSlug,
  });

  return { ok: true };
}

/**
 * Re-send an invitation email (F-3, 2026-07-25). Explicitly revokes the
 * existing invitation and issues a brand-new one (new id, new token, new
 * 14-day expiry) rather than re-sending the old link — this IS the
 * required behaviour, not a shortcut: F-3 requires that a re-send
 * invalidate the previous token, and since only a hash of the token is
 * ever stored (never the raw secret), the old raw link cannot be
 * reconstructed to resend verbatim even if we wanted to.
 */
export async function resendTenantInvite(
  slug: string,
  invitationId: string,
): Promise<InviteResult> {
  const { orgId, actorEmail, impersonatedOrgSlug, ip } =
    await assertCanInvite(slug);

  // Explicit projection of only the base columns actually used below
  // (status/email/role/inviterId) — a bare `.select()` would reference
  // every Phase F column too and 42703 pre-migration; see
  // phase-f-columns.ts.
  const rows = await db
    .select({
      status: invitationTable.status,
      email: invitationTable.email,
      role: invitationTable.role,
      inviterId: invitationTable.inviterId,
    })
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.id, invitationId),
        eq(invitationTable.organizationId, orgId),
      ),
    );
  if (!rows.length) return { ok: false, error: "招待が見つかりません" };
  const inv = rows[0];
  if (inv.status !== "pending") {
    return { ok: false, error: "この招待は既に処理済み、または取消済みです" };
  }

  try {
    await assertInviteRateLimit({ actorEmail, orgId, ip });
  } catch (e) {
    if (e instanceof InviteRateLimitError)
      return { ok: false, error: e.message };
    throw e;
  }

  await markInvitationRevoked(db, invitationId);
  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: slug,
    action: "invitation.revoked",
    metadata: { invitationId, email: inv.email, reason: "resend" },
    impersonatedOrgSlug,
  });

  const role: "editor" | "member" = inv.role === "editor" ? "editor" : "member";
  const id = crypto.randomUUID();
  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await insertInvitationRow(db, {
    id,
    organizationId: orgId,
    email: inv.email,
    role,
    status: "pending",
    expiresAt,
    inviterId: inv.inviterId,
    tokenHash,
  });
  const link = buildInviteUrl(baseURL, id, rawToken);
  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: slug,
    action: "invitation.created",
    metadata: { email: inv.email, role, source: "tenant_settings_resend" },
    impersonatedOrgSlug,
  });

  const emailResult = await sendInvitationEmail({
    to: inv.email,
    clientLabel: getClientBySlug(slug)?.label ?? slug,
    roleLabel: roleLabelOf(role),
    acceptUrl: link,
  });
  await recordInvitationEmailResult(id, {
    emailStatus: emailResult.status,
    emailProviderMessageId: emailResult.providerMessageId ?? null,
    emailLastError: emailResult.reason ?? null,
  });

  return {
    ok: true,
    link,
    emailSent: emailResult.sent,
    emailStatus: emailResult.status,
  };
}
