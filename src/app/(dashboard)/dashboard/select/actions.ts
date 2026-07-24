"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, COOKIE_NAME } from "@/lib/auth-cookie";
import { resolveClientMultiSwitchRedirect } from "@/lib/client-multi";

/**
 * Switch the active client for a multi-client session.
 *
 * Resolves the redirect target from the current session + target slug.
 * If the session is not client-multi or the slug is not in the list,
 * silently redirects to /dashboard/select to avoid information leakage.
 *
 * NOTE: this action does not rewrite mn_session.currentSlug. Cookie state is
 * shared across tabs, so rewriting it here would create cross-tab coupling.
 * Tenant selection remains URL-scoped (/dashboard/{slug}).
 */
export async function switchClient(targetSlug: string): Promise<never> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const sess = await verifySession(token);
  redirect(resolveClientMultiSwitchRedirect(sess, targetSlug));
}
