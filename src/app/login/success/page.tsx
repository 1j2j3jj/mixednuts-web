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
 * When Clerk is not configured, or Clerk says no user, we fall through
 * to /login?error=oauth.
 */
export const dynamic = "force-dynamic";

async function getClerkEmail(): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY) return null;
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const u = await currentUser();
    return u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}

export default async function OAuthSuccessPage() {
  const email = await getClerkEmail();
  if (!email) redirect("/login?error=oauth_no_email");

  const role = resolveRoleByEmail(email);
  if (role.kind === "deny") {
    // Don't throw — show a friendly page via query param so the user
    // lands back on /login with context.
    redirect(`/login?error=not_allowed&email=${encodeURIComponent(role.email)}`);
  }

  // Set our HttpOnly session cookie. Same session shape as ID/PW login
  // so middleware treats both identically from here on.
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

  const redirectTo =
    role.kind === "admin" ? "/dashboard" : `/dashboard/${role.slug}`;
  redirect(redirectTo);
}
