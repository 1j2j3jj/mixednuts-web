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

  // 2) Email → role.
  const role = resolveRoleByEmail(email);
  if (role.kind === "deny") {
    return redirect(
      req,
      `/login?error=not_allowed&email=${encodeURIComponent(role.email)}`
    );
  }

  // 3) Sign mn_session.
  let token: string;
  try {
    token =
      role.kind === "admin"
        ? await signSession({ kind: "admin" })
        : await signSession({ kind: "client", clientId: role.clientId, slug: role.slug });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] signSession threw:", msg);
    return errorRedirect(req, "sign_error", msg);
  }

  // 4) Build redirect response, then attach the cookie to it.
  const target = role.kind === "admin" ? "/dashboard" : `/dashboard/${role.slug}`;
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
