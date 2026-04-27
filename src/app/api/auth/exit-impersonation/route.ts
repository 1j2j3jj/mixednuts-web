import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { IMPERSONATE_COOKIE_NAME } from "@/lib/impersonate-cookie";
import { writeAuditLog } from "@/lib/audit";

/**
 * GET /api/auth/exit-impersonation
 *
 * Clears the mn_impersonate cookie and redirects back to /dashboard/admin.
 * Safe to call whether or not the cookie is present — always succeeds.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  // Attempt to log who exited (best-effort — non-blocking).
  try {
    const h = await headers();
    const impersonatedSlug = h.get("x-impersonated-slug");
    const actorEmail = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)[0] ?? "admin@mixednuts-inc.com";

    if (impersonatedSlug) {
      await writeAuditLog({
        actorEmail,
        targetOrgId: undefined,
        targetOrgSlug: impersonatedSlug,
        action: "impersonation.ended",
        metadata: {},
      });
    }
  } catch {
    // Non-fatal — clear the cookie regardless.
  }

  // Delete the cookie by setting maxAge=0, then redirect.
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE_NAME);

  return NextResponse.redirect(new URL("/dashboard/admin", _req.nextUrl.origin), 302);
}
