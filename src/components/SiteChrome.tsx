"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import V4Shell from "@/components/V4Shell";

/**
 * Marketing-site chrome.
 *
 *  - /dashboard/*  → no marketing chrome (the app provides its own).
 *  - v4 routes     → wrapped in the dark V4Shell (NavV4 + FooterV4 + motion).
 *  - everything else (not-yet-migrated marketing pages) → legacy Nav/Footer.
 *
 * V4_PREFIXES grows as pages migrate to the v4 design. A path matches when it
 * equals a prefix or sits under it (so /services also covers /services/ai).
 * Pages that are still functional-only and not yet reskinned (login,
 * careers/apply, team/ceo) are intentionally excluded for now.
 */
const V4_PREFIXES = [
  "/about",
  "/services",
  "/works",
  "/insights",
  "/team",
  "/careers",
  "/contact",
  "/privacy",
  "/legal",
];

const V4_EXCLUDE = ["/careers/apply", "/team/ceo"];

function isV4Route(pathname: string): boolean {
  if (pathname === "/") return true;
  if (V4_EXCLUDE.some((p) => pathname === p || pathname.startsWith(p + "/"))) return false;
  return V4_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/dashboard")) return <>{children}</>;
  if (isV4Route(pathname)) return <V4Shell>{children}</V4Shell>;
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
