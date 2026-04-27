/**
 * GET /api/auth/accept-invitation?id=<invitationId>
 *
 * Landing page for invitation magic links. Two paths:
 *
 *   A) BA session already exists (user previously signed in):
 *      - Validate invitation (pending, not expired, email match)
 *      - Mark invitation accepted + create org member row
 *      - Issue mn_session for the client slug the org maps to
 *      - Redirect to the client dashboard
 *
 *   B) No BA session:
 *      - Redirect to /login?next=/api/auth/accept-invitation?id=<id>
 *        so the user signs in first, then lands back here (path A).
 *
 * This is intentionally a plain DB approach (no auth.api.* call) because
 * accept-invitation via auth.api requires a BA session header cookie that
 * the server-side handler cannot set on behalf of the client. We own the
 * DB so we replicate BA's accept logic (status update + member insert)
 * and keep full schema compatibility.
 *
 * Middleware note: /api/auth/* is exempt from mn_session gating, so this
 * route is always reachable even without a cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import {
  invitation as invitationTable,
  member as memberTable,
  organization as organizationTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";

export const dynamic = "force-dynamic";

function errorPage(req: NextRequest, msg: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${encodeURIComponent("invitation:" + msg.slice(0, 120))}`;
  return NextResponse.redirect(url);
}

/**
 * Map a BA organisation slug to our ClientId slug.
 * The org slug IS the client slug (kept intentionally aligned in ensureOrgForClient).
 */
function orgSlugToClientSlug(orgSlug: string): string | null {
  for (const id of CLIENT_IDS) {
    if (CLIENTS[id].slug === orgSlug) return CLIENTS[id].slug;
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const invitationId = req.nextUrl.searchParams.get("id");
  if (!invitationId) {
    return errorPage(req, "招待IDが指定されていません");
  }

  // ── 1. Look up the invitation ────────────────────────────────────────────
  const invRows = await db
    .select()
    .from(invitationTable)
    .where(eq(invitationTable.id, invitationId));
  const inv = invRows[0];

  if (!inv) {
    return errorPage(req, "招待が見つかりません");
  }
  if (inv.status !== "pending") {
    return errorPage(req, `この招待はすでに ${inv.status === "accepted" ? "承認済み" : "取消済み"} です`);
  }
  if (inv.expiresAt < new Date()) {
    return errorPage(req, "招待の有効期限が切れています。管理者に再発行を依頼してください");
  }

  // ── 2. Check for BA session ──────────────────────────────────────────────
  let baEmail: string | null = null;
  let baUserId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    baEmail = session?.user?.email ?? null;
    baUserId = session?.user?.id ?? null;
  } catch {
    // BA session read error — treat as unauthenticated
  }

  // ── 3. No session → redirect to login, pass invitation_id through ────────
  if (!baEmail || !baUserId) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Encode this route as the post-login destination so /login/success
    // bounces back here after Google OAuth / email-PW sign-in.
    const selfHref = `/api/auth/accept-invitation?id=${encodeURIComponent(invitationId)}`;
    loginUrl.search = `?next=${encodeURIComponent(selfHref)}&invitation_hint=${encodeURIComponent(inv.email)}`;
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Email must match invitation ────────────────────────────────────────
  if (baEmail.toLowerCase() !== inv.email.toLowerCase()) {
    return errorPage(
      req,
      `この招待は ${inv.email} 宛てです。別のアカウント (${baEmail}) でログインしています`
    );
  }

  // ── 5. Look up the organisation ──────────────────────────────────────────
  const orgRows = await db
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.id, inv.organizationId));
  const org = orgRows[0];
  if (!org) {
    return errorPage(req, "対応するOrganizationが見つかりません");
  }

  // ── 6. Create member + mark accepted (idempotent on duplicate) ───────────
  // Check for existing membership to avoid unique constraint errors.
  const existingMembers = await db
    .select()
    .from(memberTable)
    .where(eq(memberTable.organizationId, inv.organizationId));
  const alreadyMember = existingMembers.some((m) => m.userId === baUserId);

  if (!alreadyMember) {
    await db.insert(memberTable).values({
      id: crypto.randomUUID(),
      organizationId: inv.organizationId,
      userId: baUserId,
      role: inv.role ?? "member",
      createdAt: new Date(),
    });
  }

  // Mark invitation accepted regardless of duplicate membership.
  await db
    .update(invitationTable)
    .set({ status: "accepted" })
    .where(eq(invitationTable.id, invitationId));

  // ── 7. Determine the client slug from org slug ───────────────────────────
  const orgSlug = org.slug ?? "";
  const clientSlug = orgSlugToClientSlug(orgSlug);

  // ── 8. Issue mn_session and redirect ────────────────────────────────────
  const matchedId = CLIENT_IDS.find((id) => CLIENTS[id].slug === clientSlug);
  if (!clientSlug || !matchedId) {
    return errorPage(
      req,
      "このOrganizationに対応するクライアントが見つかりません。管理者にお問い合わせください"
    );
  }

  const token = await signSession({ kind: "client", clientId: matchedId, slug: clientSlug });
  const target = `/dashboard/${clientSlug}`;

  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });

  console.info(
    `[accept-invitation] id=${invitationId} email=${baEmail} org=${org.name} slug=${orgSlug} -> ${target}`
  );

  return res;
}
