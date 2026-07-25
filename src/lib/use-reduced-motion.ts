"use client";

import { useEffect, useState } from "react";

/**
 * SC 2.3.3 (E-5): tracks the `prefers-reduced-motion: reduce` media feature.
 * Starts `false` (matches server-rendered markup — no window at SSR time)
 * and syncs to the real value on mount, then stays live via the media query
 * change listener so a user who flips the OS setting mid-session (or a
 * tester using devtools emulation) sees charts react without a reload.
 *
 * Used to pass Recharts' `isAnimationActive` off per the task's explicit
 * instruction ("pass its animation props off under reduced motion rather
 * than globally disabling") rather than a blanket CSS
 * `* { animation: none }` override, which Recharts' JS-driven SVG
 * transitions wouldn't obey anyway.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
