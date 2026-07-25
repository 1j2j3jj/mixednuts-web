"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import {
  invitation,
  member,
  organization,
  user as userTable,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";
import { writeAuditLog } from "@/lib/audit";
import { resolveAdminActor } from "@/lib/admin-actor";
import {
  generateInviteToken,
  hashInviteToken,
  buildInviteUrl,
  buildCombinedInviteUrl,
} from "@/lib/invite-token";
import {
  assertInviteRateLimit,
  InviteRateLimitError,
} from "@/lib/invite-rate-limit";
import {
  phaseFColumnsAvailable,
  invitationTokenHashField,
  insertInvitationRow,
  markInvitationRevoked,
} from "@/db/phase-f-columns";

/**
 * Server actions for the Better Auth Organization invitation flow.
 *
 * Model: each client (HS / Chakin / DOZO …) gets one Better Auth
 * organization. The slug we use in URLs (`/dashboard/<slug>`) is also
 * the org slug, so the bridge layer can map a BA member back to their
 * mn_session shape via a single lookup.
 *
 * Roles inside an org:
 *   - owner   — Nozomi / internal (auto-assigned for organisations the
 *               admin creates)
 *   - admin   — internal client lead who can re-invite
 *   - member  — read-only dashboard viewer (default for invites)
 *
 * Email sending is stubbed — the invitation row stores a UUID; admins
 * copy/paste the magic link from the table below until Resend is wired.
 */

async function assertAdmin(): Promise<void> {
  const h = await headers();
  const kind = h.get("x-viewer-kind");
  if (kind !== "admin") throw new Error("forbidden");
}

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

// ----- Organisations --------------------------------------------------------

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  clientId: ClientId | null;
  memberCount: number;
  pendingInviteCount: number;
}

/** List every BA organisation with member + pending invite counts. */
export async function listOrganisations(): Promise<OrgSummary[]> {
  await assertAdmin();
  const orgs = await db.select().from(organization);
  const out: OrgSummary[] = [];
  for (const o of orgs) {
    const members = await db
      .select()
      .from(member)
      .where(eq(member.organizationId, o.id));
    // Explicit projection of only `.status` (the sole field used below) —
    // a bare `.select()` would reference every Phase F column too and
    // 42703 pre-migration; see phase-f-columns.ts.
    const invites = await db
      .select({ status: invitation.status })
      .from(invitation)
      .where(eq(invitation.organizationId, o.id));
    const pending = invites.filter((i) => i.status === "pending").length;
    const slugStr = o.slug ?? "";
    const matched =
      (CLIENT_IDS.find((id) => CLIENTS[id].slug === slugStr) as
        ClientId | undefined) ?? null;
    out.push({
      id: o.id,
      name: o.name,
      slug: slugStr,
      clientId: matched,
      memberCount: members.length,
      pendingInviteCount: pending,
    });
  }
  return out;
}

/**
 * Ensure a BA organisation exists for the given clientId. Idempotent —
 * looks up by slug first, creates only on miss.
 */
export async function ensureOrgForClient(
  clientId: ClientId,
): Promise<OrgSummary> {
  await assertAdmin();
  const cfg = CLIENTS[clientId];
  if (!cfg) throw new Error(`unknown clientId: ${clientId}`);

  const existing = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, cfg.slug));
  if (existing.length) {
    const o = existing[0];
    return {
      id: o.id,
      name: o.name,
      slug: o.slug ?? "",
      clientId,
      memberCount: 0,
      pendingInviteCount: 0,
    };
  }

  // Generate id ourselves so we can return it without round-tripping.
  const id = crypto.randomUUID();
  await db.insert(organization).values({
    id,
    name: cfg.label,
    slug: cfg.slug,
    metadata: JSON.stringify({ clientId }),
  });
  return {
    id,
    name: cfg.label,
    slug: cfg.slug,
    clientId,
    memberCount: 0,
    pendingInviteCount: 0,
  };
}

// ----- Invitations ----------------------------------------------------------

export interface InviteRow {
  id: string;
  organizationId: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  inviterEmail: string | null;
  /**
   * F-3 (2026-07-25): a hashed invite's raw token cannot be reconstructed
   * from its stored hash — so this is only present for legacy
   * (pre-hardening, tokenHash === null) rows. Use reissueInviteLink to
   * get a fresh, usable link for a hashed row (this also revokes the old
   * one, per F-3's re-send-invalidates-previous-token requirement).
   */
  link: string | null;
}

/** All pending invitations across orgs. */
export async function listPendingInvites(): Promise<InviteRow[]> {
  await assertAdmin();
  // tokenHash may not exist yet — see src/db/phase-f-columns.ts. Projected
  // as the real column once migration 0003 has run, or as a literal NULL
  // (never referencing the column) until then.
  const columnsAvailable = await phaseFColumnsAvailable();
  const rows = await db
    .select({
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviterEmail: userTable.email,
      tokenHash: invitationTokenHashField(columnsAvailable),
    })
    .from(invitation)
    .leftJoin(userTable, eq(invitation.inviterId, userTable.id))
    .where(eq(invitation.status, "pending"))
    .orderBy(desc(invitation.expiresAt));
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    email: r.email,
    role: r.role,
    status: r.status,
    expiresAt: r.expiresAt,
    inviterEmail: r.inviterEmail,
    link: r.tokenHash
      ? null
      : `${baseURL}/api/auth/accept-invitation?id=${r.id}`,
  }));
}

// ----- Members ----------------------------------------------------------------

export interface MemberRow {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: Date;
  /** Last successful login by this user (any org). NULL = never recorded. */
  lastLoginAt: Date | null;
  /** Set when membership was auto-blocked by inactivity cron. */
  blockedAt: Date | null;
}

/** List org members for a specific client (by client slug). */
export async function listOrgMembersForClient(
  clientSlug: string,
): Promise<MemberRow[]> {
  await assertAdmin();
  const orgs = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, clientSlug));
  if (!orgs.length) return [];
  const orgId = orgs[0].id;
  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      email: userTable.email,
      name: userTable.name,
      role: member.role,
      joinedAt: member.createdAt,
      lastLoginAt: userTable.lastLoginAt,
      blockedAt: member.blockedAt,
    })
    .from(member)
    .leftJoin(userTable, eq(member.userId, userTable.id))
    .where(eq(member.organizationId, orgId));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    email: r.email ?? "",
    name: r.name ?? "",
    role: r.role,
    joinedAt: r.joinedAt,
    lastLoginAt: r.lastLoginAt,
    blockedAt: r.blockedAt,
  }));
}

/**
 * Re-activate a member that was blocked by the inactivity cron.
 * Clears member.blockedAt AND resets user.lastLoginAt = now() so the next
 * cron pass doesn't immediately re-block them.
 */
export async function activateMember(
  memberId: string,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const rows = await db
    .select({
      id: member.id,
      userId: member.userId,
      orgId: member.organizationId,
    })
    .from(member)
    .where(eq(member.id, memberId));
  if (!rows.length) return { ok: false, error: "メンバーが見つかりません" };

  const m = rows[0];
  await db
    .update(member)
    .set({ blockedAt: null })
    .where(eq(member.id, memberId));
  await db
    .update(userTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(userTable.id, m.userId));

  // Audit
  let orgSlug: string | undefined;
  const orgRows = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, m.orgId));
  orgSlug = orgRows[0]?.slug ?? undefined;
  const { actorEmail, impersonatedOrgSlug } = await resolveAdminActor();
  await writeAuditLog({
    actorEmail,
    targetOrgId: m.orgId,
    targetOrgSlug: orgSlug,
    action: "member.activated",
    metadata: { memberId },
    impersonatedOrgSlug,
  });
  return { ok: true };
}

export async function removeMember(
  memberId: string,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();

  // Resolve org context for audit log before deletion.
  const rows = await db
    .select({ orgId: member.organizationId })
    .from(member)
    .where(eq(member.id, memberId));
  const orgId = rows[0]?.orgId ?? undefined;

  let orgSlug: string | undefined;
  if (orgId) {
    const orgRows = await db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, orgId));
    orgSlug = orgRows[0]?.slug ?? undefined;
  }

  await db.delete(member).where(eq(member.id, memberId));

  const { actorEmail, impersonatedOrgSlug } = await resolveAdminActor();

  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId,
    targetOrgSlug: orgSlug,
    action: "member.removed",
    metadata: { memberId },
    impersonatedOrgSlug,
  });

  return { ok: true };
}

/**
 * 運営（mixednuts admin）によるメンバーのロール変更。
 * ガード: assertAdmin / owner のロールは変更不可 / admin 昇格時は maxAdmins 尊重。
 * 2026-07-03 追加。
 */
export async function updateMemberRole(
  memberId: string,
  newRole: "editor" | "member",
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  if (newRole !== "editor" && newRole !== "member") {
    return { ok: false, error: "無効なロールです" };
  }

  const rows = await db
    .select({ role: member.role, orgId: member.organizationId })
    .from(member)
    .where(eq(member.id, memberId));
  const target = rows[0];
  if (!target) return { ok: false, error: "メンバーが見つかりません" };
  if (target.role === "owner") {
    return { ok: false, error: "オーナーのロールは変更できません" };
  }
  if (target.role === newRole) return { ok: true };

  if (newRole === "editor") {
    // 原子的条件付きUPDATE（TOCTOU回避、2026-07-03 Codex監査 #1）。
    // 編集者上限 = maxAdmins。編集者数は editor/admin(legacy)/owner を数える。
    const upd = await db
      .update(member)
      .set({ role: "editor" })
      .where(
        and(
          eq(member.id, memberId),
          sql`${member.role} <> 'owner'`,
          sql`(SELECT count(*) FROM "member" m2 WHERE m2."organization_id" = ${target.orgId} AND m2."role" IN ('editor','admin','owner')) < COALESCE((SELECT "max_admins" FROM "organization" o WHERE o."id" = ${target.orgId}), 2147483647)`,
        ),
      );
    if ((upd.rowCount ?? 0) === 0) {
      const orgRows = target.orgId
        ? await db
            .select({ maxAdmins: organization.maxAdmins })
            .from(organization)
            .where(eq(organization.id, target.orgId))
        : [];
      const maxAdmins = orgRows[0]?.maxAdmins ?? null;
      return {
        ok: false,
        error:
          maxAdmins !== null
            ? `編集者上限（${maxAdmins}名）に達しています。`
            : "ロールを変更できませんでした",
      };
    }
  } else {
    await db
      .update(member)
      .set({ role: "member" })
      .where(eq(member.id, memberId));
  }

  let orgSlug: string | undefined;
  if (target.orgId) {
    const orgRows = await db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, target.orgId));
    orgSlug = orgRows[0]?.slug ?? undefined;
  }
  const { actorEmail, impersonatedOrgSlug } = await resolveAdminActor();
  await writeAuditLog({
    actorEmail,
    targetOrgId: target.orgId ?? undefined,
    targetOrgSlug: orgSlug,
    action: "member.role_updated",
    metadata: { memberId, from: target.role, to: newRole },
    impersonatedOrgSlug,
  });

  return { ok: true };
}

export interface CreateInviteInput {
  clientId: ClientId;
  email: string;
  role?: "editor" | "member";
}

export interface CreateInviteResult {
  ok: boolean;
  link?: string;
  invitationId?: string;
  error?: string;
  /**
   * The raw (unhashed) invite token, returned ONLY in this one response —
   * never persisted, never logged. Exists so createInvites can build a
   * combined multi-org link (`?ids=...&tokens=...`, position-aligned)
   * without having to re-derive per-invite secrets it never stored.
   */
  token?: string;
}

/**
 * Create a Better Auth invitation. Auto-creates the org if missing.
 *
 * NOTE: BA's organization plugin requires an authenticated session
 * (the inviter). For now we do this via a plain DB insert — the BA
 * helper expects a logged-in BA user, but the admin in our case is
 * authenticated via mn_session, not BA. Once the admin themselves
 * have a BA account (next milestone, when admin Google sign-in
 * completes the cycle), we'll switch to `auth.api.createInvitation()`
 * which handles email send + UUID + expiry consistently.
 */
export async function createInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  await assertAdmin();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "有効なメールアドレスを入力してください" };
  }

  // Ensure org exists.
  const org = await ensureOrgForClient(input.clientId);

  const { actorEmail, impersonatedOrgSlug, ip } = await resolveAdminActor();

  // F-3: server-side rate limit — a UI-side cooldown is not a control.
  try {
    await assertInviteRateLimit({ actorEmail, orgId: org.id, ip });
  } catch (e) {
    if (e instanceof InviteRateLimitError)
      return { ok: false, error: e.message };
    throw e;
  }

  // Find or create an inviter user (the admin acting). For now we
  // upsert against ADMIN_EMAILS[0] — the canonical admin identity.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const inviterEmail = adminEmails[0] ?? "admin@mixednuts-inc.com";

  const existingInviter = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, inviterEmail));
  let inviterId: string;
  if (existingInviter.length) {
    inviterId = existingInviter[0].id;
  } else {
    inviterId = crypto.randomUUID();
    await db.insert(userTable).values({
      id: inviterId,
      name: "Admin",
      email: inviterEmail,
      emailVerified: true,
      role: "admin",
    });
  }

  // F-3: a re-invite for an email that already has a pending invitation
  // in this org must invalidate the previous token, not leave two live
  // links redeemable at once — consistent with the tenant-side path.
  const priorPending = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, org.id),
        eq(invitation.email, email),
        eq(invitation.status, "pending"),
      ),
    );
  for (const prior of priorPending) {
    await markInvitationRevoked(db, prior.id);
  }

  // Create the invitation. F-3: id stays a non-secret primary key; the
  // bearer secret is a separately generated token, hashed before
  // storage, and only ever emitted here into the returned link.
  const id = crypto.randomUUID();
  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  await insertInvitationRow(db, {
    id,
    organizationId: org.id,
    email,
    role: input.role ?? "member",
    status: "pending",
    expiresAt,
    inviterId,
    tokenHash,
  });

  const link = buildInviteUrl(baseURL, id, rawToken);

  await writeAuditLog({
    actorEmail,
    targetOrgId: org.id,
    targetOrgSlug: org.slug,
    action: "invitation.created",
    metadata: { email, role: input.role ?? "member", source: "admin_panel" },
    impersonatedOrgSlug,
  });

  // F-3: never log the raw token/link — only the non-secret id.
  console.info(
    `[invite] created clientId=${input.clientId} org=${org.name} email=${email} role=${input.role ?? "member"} id=${id}`,
  );
  return { ok: true, link, invitationId: id, token: rawToken };
}

/**
 * Bulk version of createInvite. Creates one invitation per clientId for the
 * same email + role. Returns per-client result so the UI can show partial
 * success (e.g., 5 invitations created, 1 failed because the org is missing).
 *
 * Use case: CEO grants the same partner email access to multiple
 * client dashboards in one form submission.
 */
export interface CreateInvitesInput {
  clientIds: ClientId[];
  email: string;
  role?: "editor" | "member";
}

export interface PerInviteOutcome {
  clientId: ClientId;
  ok: boolean;
  link?: string;
  invitationId?: string;
  error?: string;
}

export interface CreateInvitesResult {
  ok: boolean;
  results: PerInviteOutcome[];
  /**
   * Single URL covering ALL successful invitations. Recipient clicks once,
   * /api/auth/accept-invitation enrolls them into every selected org in one
   * flow, then drops them on /dashboard/select. Only present when 2+ invites
   * succeeded; for a single invite use results[0].link.
   */
  combinedLink?: string;
}

export async function createInvites(
  input: CreateInvitesInput,
): Promise<CreateInvitesResult> {
  await assertAdmin();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      results: input.clientIds.map((cid) => ({
        clientId: cid,
        ok: false,
        error: "有効なメールアドレスを入力してください",
      })),
    };
  }
  if (!input.clientIds.length) {
    return { ok: false, results: [] };
  }
  // Dedupe clientIds to avoid duplicate invitation rows for the same org.
  const uniqueIds = Array.from(new Set(input.clientIds));

  const results: PerInviteOutcome[] = [];
  // F-3: raw tokens, kept only transiently for this response so the
  // combined multi-org link below can include them position-aligned with
  // ids — never persisted (only their hashes are, inside createInvite).
  const tokensById = new Map<string, string>();
  for (const clientId of uniqueIds) {
    try {
      const r = await createInvite({ clientId, email, role: input.role });
      results.push({
        clientId,
        ok: r.ok,
        link: r.link,
        invitationId: r.invitationId,
        error: r.error,
      });
      if (r.ok && r.invitationId && r.token)
        tokensById.set(r.invitationId, r.token);
    } catch (err) {
      results.push({
        clientId,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const successInvitationIds = results
    .filter((r) => r.ok && r.invitationId)
    .map((r) => r.invitationId as string);
  const combinedLink =
    successInvitationIds.length >= 2
      ? buildCombinedInviteUrl(
          baseURL,
          successInvitationIds.map((id) => ({
            id,
            token: tokensById.get(id) ?? "",
          })),
        )
      : undefined;

  return {
    ok: results.every((r) => r.ok),
    results,
    combinedLink,
  };
}

export async function revokeInvite(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const rows = await db
    .select({
      email: invitation.email,
      organizationId: invitation.organizationId,
    })
    .from(invitation)
    .where(eq(invitation.id, id));
  await markInvitationRevoked(db, id);

  const { actorEmail, impersonatedOrgSlug } = await resolveAdminActor();
  let orgSlug: string | undefined;
  if (rows[0]) {
    const orgRows = await db
      .select({ slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, rows[0].organizationId));
    orgSlug = orgRows[0]?.slug ?? undefined;
  }
  await writeAuditLog({
    actorEmail,
    targetOrgId: rows[0]?.organizationId,
    targetOrgSlug: orgSlug,
    action: "invitation.revoked",
    metadata: { invitationId: id, email: rows[0]?.email },
    impersonatedOrgSlug,
  });

  return { ok: true };
}

/**
 * Re-issue a pending invitation's link (F-3, 2026-07-25): revokes the
 * existing row and creates a fresh one (new id, new token, new 14-day
 * expiry) for the same org/email/role. Necessary because a hashed
 * invite's raw token cannot be reconstructed from its stored hash — this
 * is the admin-panel equivalent of resendTenantInvite (the tenant
 * settings page's action of the same shape), used here to regenerate a
 * usable link rather than to trigger an email send (admin-issued invites
 * are link-only by design — see the module doc comment above).
 */
export async function reissueInviteLink(
  id: string,
): Promise<{ ok: boolean; link?: string; error?: string }> {
  await assertAdmin();
  // Explicit projection of only the base columns used below — a bare
  // `.select()` would reference every Phase F column too and 42703
  // pre-migration; see phase-f-columns.ts.
  const rows = await db
    .select({
      status: invitation.status,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      inviterId: invitation.inviterId,
    })
    .from(invitation)
    .where(eq(invitation.id, id));
  if (!rows.length) return { ok: false, error: "招待が見つかりません" };
  const inv = rows[0];
  if (inv.status !== "pending") {
    return { ok: false, error: "この招待は既に処理済み、または取消済みです" };
  }

  const { actorEmail, impersonatedOrgSlug, ip } = await resolveAdminActor();
  try {
    await assertInviteRateLimit({ actorEmail, orgId: inv.organizationId, ip });
  } catch (e) {
    if (e instanceof InviteRateLimitError)
      return { ok: false, error: e.message };
    throw e;
  }

  await markInvitationRevoked(db, id);
  await writeAuditLog({
    actorEmail,
    targetOrgId: inv.organizationId,
    targetOrgSlug: undefined,
    action: "invitation.revoked",
    metadata: { invitationId: id, email: inv.email, reason: "reissue" },
    impersonatedOrgSlug,
  });

  const newId = crypto.randomUUID();
  const rawToken = generateInviteToken();
  const tokenHash = await hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await insertInvitationRow(db, {
    id: newId,
    organizationId: inv.organizationId,
    email: inv.email,
    role: inv.role,
    status: "pending",
    expiresAt,
    inviterId: inv.inviterId,
    tokenHash,
  });
  const link = buildInviteUrl(baseURL, newId, rawToken);
  await writeAuditLog({
    actorEmail,
    targetOrgId: inv.organizationId,
    targetOrgSlug: undefined,
    action: "invitation.created",
    metadata: {
      email: inv.email,
      role: inv.role,
      source: "admin_panel_reissue",
    },
    impersonatedOrgSlug,
  });

  console.info(
    `[invite] reissued org=${inv.organizationId} email=${inv.email} id=${newId}`,
  );
  return { ok: true, link };
}

// Suppress unused import warning — auth is reserved for the migration
// to auth.api.createInvitation() once admin BA sessions exist.
void auth;
