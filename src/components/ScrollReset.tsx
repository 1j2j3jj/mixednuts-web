"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Scroll to the top on client-side navigations.
 *
 * The App Router's own scroll-to-top does not fire on this site (the page roots are wrapped in
 * fixed/animated scenes), so a header click opened the next page at the previous scroll offset.
 * Back/forward navigations (popstate) keep the browser's restored position; hash links keep their target.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function ScrollReset() {
  const pathname = usePathname();
  const popped = useRef(false);
  const last = useRef<string | null>(null);

  useEffect(() => {
    const onPop = () => { popped.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useIsoLayoutEffect(() => {
    if (last.current === null) { last.current = pathname; return; }
    if (last.current === pathname) return;
    last.current = pathname;
    if (popped.current) { popped.current = false; return; }
    if (window.location.hash) return;
    // `html { scroll-behavior: smooth }` would turn this into an animation that GSAP's ScrollTrigger.refresh()
    // (which snapshots and restores the scroll position) cancels — so jump instantly.
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    html.scrollTop = 0;
    document.body.scrollTop = 0;
    html.style.scrollBehavior = previous;
  }, [pathname]);

  return null;
}
