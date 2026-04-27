import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import WorkspaceSwitcher, { type WorkspaceItem } from "@/components/dashboard/WorkspaceSwitcher";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";

/**
 * Route group layout for /dashboard/*. Sidebar-less shell.
 *
 * Auth model: Basic Auth / cookie session via middleware
 * (src/middleware.ts) is the sole gate. Better Auth runs the Google
 * OAuth round-trip; after sign-in /login/success bridges the BA
 * session into our HttpOnly mn_session cookie. No BA React components
 * are mounted here — the header only carries our brand mark, Admin-
 * index link (admin only), and Logout.
 */

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | mixednuts Dashboard",
  },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind"); // "admin" | "client" | "client-multi" | null
  const isAdmin = viewerKind === "admin";

  // Derive which "workspace" is currently active from the URL path.
  // next/headers doesn't expose the URL directly, but middleware sets the
  // x-viewer-slug header for client sessions; for admin sessions the slug
  // is read from the path — we pass "admin" as a sentinel.
  // middleware forwards x-viewer-client-slug for both "client" and "client-multi"
  const viewerSlug = h.get("x-viewer-client-slug") ?? (isAdmin ? "admin" : null);

  // For multi-client sessions: enumerate available slugs from the header.
  const isMultiClient = viewerKind === "client-multi";
  const availableSlugsRaw = h.get("x-viewer-available-slugs") ?? "";
  const availableSlugs = availableSlugsRaw.split(",").filter(Boolean);

  // Build the workspace items list.
  const switcherItems: WorkspaceItem[] = [];

  if (isAdmin) {
    // Admin sees every client.
    for (const id of CLIENT_IDS) {
      const c = CLIENTS[id];
      switcherItems.push({
        key: c.slug,
        label: c.label,
        subtitle: c.subtitle,
        href: `/dashboard/${c.slug}`,
      });
    }
    switcherItems.push({ key: "admin", label: "管理パネル", href: "/dashboard/admin", isAdmin: true });
  } else if (isMultiClient && availableSlugs.length >= 2) {
    // Multi-client: show available slugs only.
    for (const slug of availableSlugs) {
      const c = Object.values(CLIENTS).find((cl) => cl.slug === slug);
      switcherItems.push({
        key: slug,
        label: c?.label ?? slug,
        subtitle: undefined,
        href: `/dashboard/${slug}`,
      });
    }
  }

  // Only render the switcher when there are 2+ destinations.
  const showSwitcher = switcherItems.length >= 2;
  // Current workspace: admin sentinel or the slug from header.
  const currentWorkspace = isAdmin ? "admin" : (viewerSlug ?? "");

  return (
    <div className="dashboard-scope min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="mixednuts Inc." className="h-6 w-auto" />
          </Link>
          {showSwitcher ? (
            <WorkspaceSwitcher
              current={currentWorkspace}
              items={switcherItems}
              isAdmin={isAdmin}
            />
          ) : (
            <span className="text-sm font-semibold tracking-tight">mixednuts</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {(viewerKind === "admin" || viewerKind === "client" || viewerKind === "client-multi") && (
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="text-xs text-muted-foreground hover:underline"
            >
              Logout
            </Link>
          )}
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
