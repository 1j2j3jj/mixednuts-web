import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";
import { resolveRoleByEmail } from "@/lib/role-resolver";
import { auth } from "@/lib/auth";

/**
 * Post-OAuth landing page. Fires after Better Auth (Google sign-in) hands
 * control back to us. Reads the verified email from the BA session, looks
 * it up in our role registry (env ADMIN_EMAILS / CLIENT_EMAILS_<ID>), and
 * bridges into our own mn_session cookie — so the rest of the app
 * doesn't have to be Better Auth-aware. The middleware reads only mn_session.
 *
 * Wrapped with defensive error handling because the cross-domain cookie
 * round-trip can land users here with partial auth state, and Next.js's
 * production error page is opaque. On any error we redirect back to /login
 * with a diagnostic query param.
 */
export const dynamic = "force-dynamic";

async function getSessionEmail(): Promise<{ email: string | null; error?: string }> {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session) return { email: null, error: "no_session" };
    const email = session.user?.email ?? null;
    return { email, error: email ? undefined : "no_email_on_user" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] Better Auth getSession failed:", msg);
    return { email: null, error: `ba_error:${msg.slice(0, 80)}` };
  }
}

export default async function OAuthSuccessPage() {
  const { email, error } = await getSessionEmail();

  if (!email) {
    // Unauthenticated or BA fetch failed — send user back to /login
    // with a hint. The user can click Google again from /login to retry.
    const code = error ?? "oauth_no_email";
    redirect(`/login?error=${encodeURIComponent(code)}`);
  }

  const role = resolveRoleByEmail(email);
  if (role.kind === "deny") {
    redirect(`/login?error=not_allowed&email=${encodeURIComponent(role.email)}`);
  }

  const token =
    role.kind === "admin"
      ? await signSession({ kind: "admin" })
      : await signSession({ kind: "client", clientId: role.clientId, slug: role.slug });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });

  const redirectTo = role.kind === "admin" ? "/dashboard" : `/dashboard/${role.slug}`;
  redirect(redirectTo);
}
