import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";
import { resolveRoleByEmail } from "@/lib/role-resolver";

/**
 * Post-OAuth landing page. Fires after Clerk (Google sign-in) hands
 * control back to us. Reads the verified email from Clerk, looks it up
 * in our role registry (env ADMIN_EMAILS / CLIENT_EMAILS_<ID>) and
 * bridges into our own mn_session cookie — so the rest of the app
 * doesn't have to be Clerk-aware.
 *
 * Wrapped with defensive error handling because cross-origin Clerk
 * session transfer can land users here with partial auth state, and
 * Next.js's production error page is opaque. On any error we redirect
 * back to /login with a diagnostic query param.
 */
export const dynamic = "force-dynamic";

async function getClerkEmail(): Promise<{ email: string | null; error?: string }> {
  if (!process.env.CLERK_SECRET_KEY) return { email: null, error: "clerk_not_configured" };
  try {
    const mod = await import("@clerk/nextjs/server");
    const u = await mod.currentUser();
    if (!u) return { email: null, error: "no_session" };
    const email =
      u.primaryEmailAddress?.emailAddress ?? u.emailAddresses?.[0]?.emailAddress ?? null;
    return { email, error: email ? undefined : "no_email_on_user" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] Clerk currentUser() failed:", msg);
    return { email: null, error: `clerk_error:${msg.slice(0, 80)}` };
  }
}

export default async function OAuthSuccessPage() {
  const { email, error } = await getClerkEmail();

  if (!email) {
    // Unauthenticated or Clerk fetch failed — send user back to /login
    // with a hint. Clerk's cross-domain session transfer sometimes
    // doesn't land here on the first hit; the user can click Google
    // again from /login to retry.
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
