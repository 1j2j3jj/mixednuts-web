import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

/**
 * Route group layout for /dashboard/*. Sidebar-less shell.
 *
 * Auth model (post-Clerk cleanup): Basic Auth / cookie session via
 * middleware (src/middleware.ts) is the sole gate. Clerk's role is
 * reduced to a hosted OAuth detour (Account Portal); after sign-in
 * Clerk redirects to /login/success which bridges into our HttpOnly
 * mn_session cookie. No Clerk React components are mounted here, so
 * no ClerkProvider / SignInButton / UserButton — the header only
 * carries our brand mark, Admin-index link (admin only), and Logout.
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
  const viewerKind = h.get("x-viewer-kind"); // "admin" | "client" | null

  return (
    <div className="dashboard-scope min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="mixednuts Inc." className="h-6 w-auto" />
          <span className="text-sm font-semibold tracking-tight">mixednuts</span>
        </Link>
        <div className="flex items-center gap-4">
          {viewerKind === "admin" && (
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">
              Admin index
            </Link>
          )}
          {(viewerKind === "admin" || viewerKind === "client") && (
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
