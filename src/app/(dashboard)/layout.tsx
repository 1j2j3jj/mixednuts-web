import type { Metadata } from "next";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import { listAccessibleClients } from "@/lib/access";

/**
 * Route group layout for /dashboard/*. Wraps the tree in:
 *   - ClerkProvider  (auth context)
 *   - .dashboard-scope (scoped shadcn CSS variables; see globals.css)
 *   - DashboardSidebar / header shell
 *
 * Gating: the sidebar and each page individually call the `access.ts` helpers
 * so a user who is signed in but not on any client allow-list still sees a
 * shell with an empty sidebar (not a 500). Per-client pages 404 unauthorised
 * viewers — intentional to avoid leaking which clients exist.
 *
 * Clerk v7 removed the <SignedIn>/<SignedOut> components; we derive sign-in
 * state server-side via `auth()` instead, which is also faster (no extra
 * client-side hydration for the header).
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
  const accessibleClients = clerkConfigured ? await listAccessibleClients() : [];
  const signedInState = await getSignedInState();

  const shell = (
    <div className="dashboard-scope min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <DashboardSidebar accessibleClientIds={accessibleClients.map((c) => c.id)} />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
            <div className="text-sm font-medium text-muted-foreground">mixednuts client dashboard</div>
            {clerkConfigured ? (
              signedInState === "in" ? (
                <UserButton />
              ) : (
                <SignInButton mode="modal">
                  <button className="text-sm underline">Sign in</button>
                </SignInButton>
              )
            ) : (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                Clerk not configured (dev mode)
              </span>
            )}
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );

  if (!clerkConfigured) return shell;
  return <ClerkProvider>{shell}</ClerkProvider>;
}
