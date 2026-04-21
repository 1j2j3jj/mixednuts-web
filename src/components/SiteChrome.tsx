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
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isDashboard = pathname.startsWith("/dashboard");
  if (isDashboard) return <>{children}</>;
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
