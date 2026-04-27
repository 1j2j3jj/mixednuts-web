import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * /switch — Workspace switcher entry point.
 *
 * For multi-client sessions: redirects to /dashboard/select.
 * For single-client sessions: redirects to their own dashboard.
 * For admin sessions: redirects to /dashboard (admin index).
 *
 * The actual workspace switcher dropdown UI lives in the dashboard
 * layout header (WorkspaceSwitcher component). This route exists so
 * keyboard shortcuts and direct links to /switch always land somewhere
 * sensible.
 */
export const dynamic = "force-dynamic";

export default async function SwitchPage() {
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");
  const slug = h.get("x-viewer-client-slug");

  if (viewerKind === "admin") {
    redirect("/dashboard");
  }

  if (viewerKind === "client-multi") {
    redirect("/dashboard/select");
  }

  if (viewerKind === "client" && slug) {
    redirect(`/dashboard/${slug}`);
  }

  // Fallback — unauthenticated (middleware should have caught this).
  redirect("/login");
}
