"use client";

import { useEffect, useRef } from "react";
import CinemaCanvas, { type CinemaCanvasHandle } from "@/components/v6/CinemaCanvas";

type ServiceDetailMotionProps = {
  act: 1 | 2 | 3;
};

export default function ServiceDetailMotion({ act }: ServiceDetailMotionProps) {
  const canvasRef = useRef<CinemaCanvasHandle>(null);

  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".mn-v6");
    canvasRef.current?.setAct(act);
    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const cleanup: Array<() => void> = [];

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      scope.classList.add("v6-js");
      const context = gsap.context(() => {
        gsap.timeline({ defaults: { ease: "expo.out" } })
          .fromTo(".sv6-detail-overline", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, immediateRender: true })
          .fromTo(".sv6-detail-title span", { opacity: 0, yPercent: 28, letterSpacing: "0.16em" }, { opacity: 1, yPercent: 0, letterSpacing: "-0.025em", duration: 0.8, stagger: 0.12, immediateRender: true }, "-=0.12")
          .fromTo([".sv6-detail-lead", ".sv6-detail-meta"], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, immediateRender: true }, "-=0.35");

        gsap.utils.toArray<HTMLElement>("[data-sv6-reveal]", scope).forEach((element) => {
          gsap.fromTo(element, { opacity: 0, y: 24 }, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "expo.out",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 84%", once: true },
          });
        });

        const desktop = window.matchMedia("(min-width: 861px)").matches;
        if (desktop) {
          gsap.timeline({ scrollTrigger: { trigger: ".sv6-detail-hero", start: "top top", end: "+=80%", scrub: 0.9 } })
            .to(".sv6-detail-title", { yPercent: -12, opacity: 0.58, ease: "none" }, 0)
            .to(".sv6-detail-bottom", { yPercent: -8, opacity: 0.38, ease: "none" }, 0)
            .to({}, { duration: 1, onUpdate() { canvasRef.current?.setScroll(this.progress()); } }, 0);
        }
      }, scope);
      cleanup.push(() => context.revert());
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cleanup.reverse().forEach((fn) => fn());
      scope.classList.remove("v6-js");
    };
  }, [act]);

  return <CinemaCanvas ref={canvasRef} />;
}
