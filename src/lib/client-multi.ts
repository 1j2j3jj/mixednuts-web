import type { Session } from "@/lib/auth-cookie";

/**
 * Resolve where the multi-client picker should send the viewer.
 *
 * IMPORTANT: tenant selection is URL-scoped. This helper intentionally does
 * not mutate session state; it only decides a redirect target for the current
 * request.
 */
export function resolveClientMultiSwitchRedirect(
  sess: Session | null,
  targetSlug: string,
): string {
  if (!sess || sess.kind !== "client-multi") return "/dashboard/select";
  if (!sess.availableSlugs.includes(targetSlug)) return "/dashboard/select";
  return `/dashboard/${targetSlug}`;
}
