"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

/**
 * Marketing-site chrome (Nav + Footer) that hides itself under /dashboard/*
 * so the logged-in dashboard gets a clean full-bleed canvas without the
 * public-site nav bar.
 *
 * The root layout keeps rendering this wrapper for every route; only the
 * visible chrome is conditional, so marketing pages are untouched.
 */
// Routes that ship their own self-contained v4 chrome (dark nav + footer +
// motion engine) inside the page itself. The shared marketing Nav/Footer is
// suppressed for these so we don't double-render chrome. Grows as pages migrate.
const V4_ROUTES = new Set<string>(["/"]);

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isDashboard = pathname.startsWith("/dashboard");
  const isV4 = V4_ROUTES.has(pathname);
  if (isDashboard || isV4) return <>{children}</>;
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
