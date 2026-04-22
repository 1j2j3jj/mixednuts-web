import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

/**
 * Route group layout for Clerk-hosted auth pages (/sign-in, /sign-up).
 * Wrapped in ClerkProvider so <SignIn /> and <SignUp /> components can
 * mount. Kept scoped to this group (rather than wrapping the root
 * layout) so the marketing site / dashboard don't pull Clerk's JS
 * bundle when it isn't needed.
 *
 * Gracefully degrades when Clerk isn't configured — the sign-in pages
 * 404 instead of crashing.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
