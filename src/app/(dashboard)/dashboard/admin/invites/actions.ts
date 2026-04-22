"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { invitation, member, organization, user as userTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";

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
    const members = await db.select().from(member).where(eq(member.organizationId, o.id));
    const invites = await db
      .select()
      .from(invitation)
      .where(eq(invitation.organizationId, o.id));
    const pending = invites.filter((i) => i.status === "pending").length;
    const slugStr = o.slug ?? "";
    const matched =
      (CLIENT_IDS.find((id) => CLIENTS[id].slug === slugStr) as ClientId | undefined) ?? null;
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
export async function ensureOrgForClient(clientId: ClientId): Promise<OrgSummary> {
  await assertAdmin();
  const cfg = CLIENTS[clientId];
  if (!cfg) throw new Error(`unknown clientId: ${clientId}`);

  const existing = await db.select().from(organization).where(eq(organization.slug, cfg.slug));
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
  return { id, name: cfg.label, slug: cfg.slug, clientId, memberCount: 0, pendingInviteCount: 0 };
}

// ----- Invitations ----------------------------------------------------------

export interface InviteRow {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  inviterEmail: string | null;
  link: string;
}

/** All pending invitations across orgs. */
export async function listPendingInvites(): Promise<InviteRow[]> {
  await assertAdmin();
  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviterEmail: userTable.email,
    })
    .from(invitation)
    .leftJoin(userTable, eq(invitation.inviterId, userTable.id))
    .where(eq(invitation.status, "pending"))
    .orderBy(desc(invitation.expiresAt));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: r.status,
    expiresAt: r.expiresAt,
    inviterEmail: r.inviterEmail,
    link: `${baseURL}/api/auth/accept-invitation?id=${r.id}`,
  }));
}

export interface CreateInviteInput {
  clientId: ClientId;
  email: string;
  role?: "admin" | "member";
}

export interface CreateInviteResult {
  ok: boolean;
  link?: string;
  invitationId?: string;
  error?: string;
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
export async function createInvite(input: CreateInviteInput): Promise<CreateInviteResult> {
  await assertAdmin();
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "有効なメールアドレスを入力してください" };
  }

  // Ensure org exists.
  const org = await ensureOrgForClient(input.clientId);

  // Find or create an inviter user (the admin acting). For now we
  // upsert against ADMIN_EMAILS[0] — the canonical admin identity.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const inviterEmail = adminEmails[0] ?? "admin@mixednuts-inc.com";

  const existingInviter = await db.select().from(userTable).where(eq(userTable.email, inviterEmail));
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

  // Create the invitation.
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  await db.insert(invitation).values({
    id,
    organizationId: org.id,
    email,
    role: input.role ?? "member",
    status: "pending",
    expiresAt,
    inviterId,
  });

  const link = `${baseURL}/api/auth/accept-invitation?id=${id}`;
  console.info(
    `[invite] created clientId=${input.clientId} org=${org.name} email=${email} role=${input.role ?? "member"}\n` +
    `[invite] link=${link}`
  );
  return { ok: true, link, invitationId: id };
}

export async function revokeInvite(id: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  await db
    .update(invitation)
    .set({ status: "cancelled" })
    .where(eq(invitation.id, id));
  return { ok: true };
}

// Suppress unused import warning — auth is reserved for the migration
// to auth.api.createInvitation() once admin BA sessions exist.
void auth;
