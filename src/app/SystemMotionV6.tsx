"use client";

import { useEffect, useRef } from "react";
import CinemaCanvas, { type CinemaCanvasHandle } from "@/components/v6/CinemaCanvas";

export default function SystemMotionV6({ canvas = false, act = 0 }: { canvas?: boolean; act?: 0 | 1 | 2 | 3 }) {
  const canvasRef = useRef<CinemaCanvasHandle>(null);

  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".mn-system-v6");
    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const cleanup: Array<() => void> = [];

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      scope.classList.add("v6-js");
      canvasRef.current?.setAct(act);
      const context = gsap.context(() => {
        gsap.fromTo(
          ".system-breadcrumb, .system-title, .system-lead",
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: .6, stagger: .09, ease: "expo.out", immediateRender: true },
        );
        gsap.utils.toArray<HTMLElement>("[data-v6-reveal]", scope).forEach((element) => {
          gsap.fromTo(element, { opacity: 0, y: 24 }, {
            opacity: 1,
            y: 0,
            duration: .6,
            ease: "expo.out",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 84%", once: true },
          });
        });
        if (canvas) {
          ScrollTrigger.create({
            trigger: ".system-hero",
            start: "top top",
            end: "bottom top",
            onUpdate: (self) => canvasRef.current?.setScroll(self.progress),
          });
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
  }, [act, canvas]);

  return (
    <>
      {canvas ? <CinemaCanvas ref={canvasRef} /> : null}
      <div className="v6-letterbox" aria-hidden="true">
        <div className="v6-letterbox-bar v6-letterbox-bar--top" />
        <div className="v6-letterbox-bar v6-letterbox-bar--bottom" />
      </div>
    </>
  );
}
