import { NextRequest, NextResponse } from "next/server";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";
import { resolveRoleByEmail } from "@/lib/role-resolver";
import { auth } from "@/lib/auth";

/**
 * Post-OAuth landing — Route Handler flavour.
 *
 * Originally a Server Component (page.tsx), but Next.js 15+ forbids
 * `cookies().set()` from a Server Component — the rendering pipeline
 * can't guarantee the Set-Cookie header reaches the browser. Route
 * Handlers can, so we bridge here.
 *
 * Flow:
 *   1) Better Auth (Google OAuth) drops the user at this URL after the
 *      callbackURL hop. BA's own session cookie is already present.
 *   2) We read the BA session, resolve the email to an internal role
 *      (admin / client / deny) via env ADMIN_EMAILS / CLIENT_EMAILS_*.
 *   3) We sign our own mn_session cookie and redirect into the dashboard.
 *
 * Middleware reads only mn_session, so downstream pages never need to
 * know Better Auth exists.
 *
 * Defensive: every step is wrapped so auth-bridge failures redirect to
 * /login?error=<type>:<first-80-chars-of-message> instead of a 500.
 */
export const dynamic = "force-dynamic";

function redirect(req: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, req.url));
}

function errorRedirect(req: NextRequest, type: string, msg?: string): NextResponse {
  const code = msg ? `${type}:${msg.slice(0, 80)}` : type;
  return redirect(req, `/login?error=${encodeURIComponent(code)}`);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check if there's a `next` parameter — invitation flows set this so the
  // user lands back at the accept-invitation handler after Google OAuth.
  const nextParam = req.nextUrl.searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/api/auth/accept-invitation")
      ? nextParam
      : null;

  // 1) Read BA session.
  let email: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    email = session?.user?.email ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] getSession threw:", msg);
    return errorRedirect(req, "ba_error", msg);
  }

  if (!email) return errorRedirect(req, "no_session");

  // 2) If this is an invitation-completion flow, hand off to the
  //    accept-invitation handler which owns the full acceptance logic.
  //    We do NOT set mn_session here — the accept-invitation route does it
  //    once it has verified the invitation + created the member row.
  if (safeNext) {
    // Pass the BA session cookie through (it's already set by BA's OAuth
    // handler) — accept-invitation will read it via auth.api.getSession.
    return redirect(req, safeNext);
  }

  // 3) Email → role (env + DB membership lookup for non-invitation paths).
  const role = await resolveRoleByEmail(email);
  if (role.kind === "deny") {
    return redirect(
      req,
      `/login?error=not_allowed&email=${encodeURIComponent(role.email)}`
    );
  }

  // 4) Sign mn_session.
  let token: string;
  let target: string;
  try {
    if (role.kind === "admin") {
      token = await signSession({ kind: "admin" });
      target = "/dashboard";
    } else if (role.kind === "client") {
      token = await signSession({ kind: "client", clientId: role.clientId, slug: role.slug });
      target = `/dashboard/${role.slug}`;
    } else {
      // multi-client: first match becomes the initial currentSlug
      const availableSlugs = role.matches.map((m) => m.slug);
      token = await signSession({
        kind: "client-multi",
        currentSlug: availableSlugs[0],
        availableSlugs,
      });
      target = "/dashboard/select";
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] signSession threw:", msg);
    return errorRedirect(req, "sign_error", msg);
  }

  // 5) Build redirect response, then attach the cookie to it.
  const res = redirect(req, target);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });
  return res;
}
