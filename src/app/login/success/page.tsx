import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";
import { resolveRoleByEmail } from "@/lib/role-resolver";
import { auth } from "@/lib/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

/**
 * Post-OAuth landing page. Fires after Better Auth (Google sign-in) hands
 * control back to us. Reads the verified email from the BA session, looks
 * it up in our role registry (env ADMIN_EMAILS / CLIENT_EMAILS_<ID>), and
 * bridges into our own mn_session cookie — so the rest of the app
 * doesn't have to be Better Auth-aware. The middleware reads only mn_session.
 *
 * Defensive handling: everything that isn't a Next.js redirect is caught,
 * logged to stderr, and surfaced to the user via /login?error=bridge:<msg>
 * so Vercel production never shows the opaque "server error occurred"
 * generic error page for auth-bridge failures.
 */
export const dynamic = "force-dynamic";

async function runBridge(): Promise<{ redirectTo: string; setCookie?: { name: string; token: string } }> {
  // 1) Read BA session — has its own try/catch so a DB hiccup becomes a
  //    redirect-to-login, not a 500.
  let email: string | null = null;
  try {
    const hdrsReadonly = await headers();
    // Next.js's ReadonlyHeaders is accepted by Better Auth but we
    // normalise to a mutable Headers just in case a future BA version
    // tightens the type.
    const hdrs = new Headers();
    for (const [k, v] of hdrsReadonly.entries()) hdrs.set(k, v);
    const session = await auth.api.getSession({ headers: hdrs });
    email = session?.user?.email ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] getSession threw:", msg, e);
    return { redirectTo: `/login?error=${encodeURIComponent("ba_error:" + msg.slice(0, 80))}` };
  }

  if (!email) {
    return { redirectTo: "/login?error=no_session" };
  }

  const role = resolveRoleByEmail(email);
  if (role.kind === "deny") {
    return { redirectTo: `/login?error=not_allowed&email=${encodeURIComponent(role.email)}` };
  }

  let token: string;
  try {
    token =
      role.kind === "admin"
        ? await signSession({ kind: "admin" })
        : await signSession({ kind: "client", clientId: role.clientId, slug: role.slug });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] signSession threw:", msg, e);
    return { redirectTo: `/login?error=${encodeURIComponent("sign_error:" + msg.slice(0, 80))}` };
  }

  return {
    redirectTo: role.kind === "admin" ? "/dashboard" : `/dashboard/${role.slug}`,
    setCookie: { name: COOKIE_NAME, token },
  };
}

export default async function OAuthSuccessPage() {
  let plan: Awaited<ReturnType<typeof runBridge>>;
  try {
    plan = await runBridge();
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login/success] unhandled:", msg, e);
    redirect(`/login?error=${encodeURIComponent("bridge:" + msg.slice(0, 80))}`);
  }

  if (plan.setCookie) {
    try {
      const jar = await cookies();
      jar.set(plan.setCookie.name, plan.setCookie.token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: TTL_SECONDS,
        path: "/",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[login/success] cookie set threw:", msg, e);
      redirect(`/login?error=${encodeURIComponent("cookie_error:" + msg.slice(0, 80))}`);
    }
  }

  redirect(plan.redirectTo);
}
