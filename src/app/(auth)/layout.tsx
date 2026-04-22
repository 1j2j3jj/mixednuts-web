import type { Metadata } from "next";

/**
 * Route group layout for auth pages (/sign-in, /sign-up). Pages under
 * this group just redirect to Clerk's Account Portal — no Clerk React
 * components mount here, so no ClerkProvider wrap is needed. Keeps
 * the Clerk JS bundle off our domain entirely.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
