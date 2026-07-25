import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { CLIENTS } from "@/config/clients";
import {
  signImpersonate,
  IMPERSONATE_COOKIE_NAME,
} from "@/lib/impersonate-cookie";
import { writeAuditLog } from "@/lib/audit";
import { resolveAdminActor } from "@/lib/admin-actor";
import { db } from "@/db/client";
import { organization as organizationTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /dashboard/admin/orgs/[slug]/impersonate
 *
 * Starts an impersonation session: writes the mn_impersonate cookie
 * (2-hour signed HMAC token containing the target org slug) and
 * redirects the admin to the client's dashboard.
 *
 * Only admin viewers (x-viewer-kind: admin) may call this endpoint.
 * The admin's own mn_session is never modified — impersonation is a
 * lightweight overlay that middleware and layout.tsx detect separately.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  // Validate that slug maps to a known client config.
  const client = Object.values(CLIENTS).find((c) => c.slug === slug);
  if (!client) {
    return NextResponse.json({ error: "unknown slug" }, { status: 404 });
  }

  // Resolve orgId for audit log (may be null if org not yet created).
  let orgId: string | null = null;
  try {
    const rows = await db
      .select({ id: organizationTable.id })
      .from(organizationTable)
      .where(eq(organizationTable.slug, slug));
    orgId = rows[0]?.id ?? null;
  } catch {
    // Non-fatal — audit log will have null orgId.
  }

  // F-4 (2026-07-25): resolve the REAL signed-in admin, not always
  // ADMIN_EMAILS[0] — with multiple admins this previously made every
  // impersonation.started row indistinguishable as to who actually
  // started it.
  const { actorEmail } = await resolveAdminActor();

  await writeAuditLog({
    actorEmail,
    targetOrgId: orgId ?? undefined,
    targetOrgSlug: slug,
    action: "impersonation.started",
    metadata: { clientLabel: client.label },
  });

  // F-4: issuer bound into the token payload itself (self-describing).
  const token = await signImpersonate(slug, actorEmail);

  const res = NextResponse.redirect(
    new URL(`/dashboard/${slug}`, _req.nextUrl.origin),
    302,
  );
  res.cookies.set(IMPERSONATE_COOKIE_NAME, token, {
    httpOnly: true,
    // F-4: was gated on NODE_ENV==="production" alone, inconsistent with
    // every other session-cookie writer in this codebase (auth-cookie
    // login/logout/accept-invitation routes all hardcode secure:true).
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60, // 2 hours
  });
  return res;
}
