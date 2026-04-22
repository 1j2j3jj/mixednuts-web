import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";

/**
 * Route group layout for /dashboard/*. Sidebar-less shell. Header carries:
 *   - brand mark
 *   - admin-only "Admin index" link (hidden from client viewers)
 *   - Clerk sign-in state (only when CLERK_SECRET_KEY is set — optional
 *     in the Basic Auth multi-tenant model we actually use)
 *
 * Auth: Basic Auth multi-tenant via middleware (src/middleware.ts) is the
 * primary gate. Clerk is optional; without it we do NOT show a "dev mode"
 * chip because Basic Auth IS production auth. Per-client pages 404
 * unauthorised viewers to avoid leaking which clients exist.
 */

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | mixednuts Dashboard",
  },
  robots: { index: false, follow: false }, // never index the portal
};

// Render the shell even when Clerk is not configured so that dev-time
// scaffolding (without keys) still works. When Clerk env is missing we short
// -circuit the ClerkProvider and display an inline notice.
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);

async function getSignedInState(): Promise<"in" | "out"> {
  if (!clerkConfigured) return "out";
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  return userId ? "in" : "out";
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Viewer identity from middleware. Admin sees an "Admin index" affordance;
  // clients see only brand + their own dashboard (the admin index URL
  // redirects them away anyway but showing the link would hint at its
  // existence).
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind"); // "admin" | "client" | null

  const signedInState = await getSignedInState();

  const shell = (
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
          {clerkConfigured &&
            (signedInState === "in" ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="text-sm underline">Sign in</button>
              </SignInButton>
            ))}
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );

  if (!clerkConfigured) return shell;
  return <ClerkProvider>{shell}</ClerkProvider>;
}
