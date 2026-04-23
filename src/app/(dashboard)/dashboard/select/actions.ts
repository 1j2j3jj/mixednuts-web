"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";

/**
 * Switch the active client for a multi-client session.
 *
 * Re-signs the mn_session cookie with the chosen slug as `currentSlug`
 * (availableSlugs unchanged) and redirects to that client's dashboard.
 * If the session is not client-multi or the slug is not in the list,
 * silently redirects to /dashboard/select to avoid information leakage.
 */
export async function switchClient(targetSlug: string): Promise<never> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const sess = await verifySession(token);

  if (
    !sess ||
    sess.kind !== "client-multi" ||
    !sess.availableSlugs.includes(targetSlug)
  ) {
    redirect("/dashboard/select");
  }

  const newToken = await signSession({
    kind: "client-multi",
    currentSlug: targetSlug,
    availableSlugs: sess.availableSlugs,
  });

  jar.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });

  redirect(`/dashboard/${targetSlug}`);
}
