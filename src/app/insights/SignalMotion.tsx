"use client";

import { useEffect, useRef } from "react";
import CinemaCanvas, { type CinemaCanvasHandle } from "@/components/v6/CinemaCanvas";

export default function SignalMotion() {
  const canvasRef = useRef<CinemaCanvasHandle>(null);

  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".mn-v6-insights");
    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let contextCleanup: (() => void) | undefined;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        const words = gsap.utils.toArray<HTMLElement>(".v6-hero-word", scope);
        gsap.timeline({ defaults: { ease: "expo.out" } })
          .fromTo(".v6-hero-overline", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, immediateRender: true })
          .fromTo(words, {
            opacity: 0,
            yPercent: 30,
            letterSpacing: "0.28em",
            fontVariationSettings: '"opsz" 36, "SOFT" 60, "WONK" 0',
          }, {
            opacity: 1,
            yPercent: 0,
            letterSpacing: "0.02em",
            fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
            stagger: 0.13,
            duration: 0.9,
            immediateRender: true,
          }, "-=0.1")
          .fromTo(".v6-hero-bottom", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, immediateRender: true }, "-=0.3");

        const desktop = window.matchMedia("(min-width: 861px)").matches;
        if (desktop) {
          gsap.timeline({
            scrollTrigger: { trigger: ".signal-hero", start: "top top", end: "+=90%", pin: true, scrub: 1 },
          })
            .to(".v6-hero-title-wrap", { yPercent: -14, scale: 0.88, opacity: 0.58, ease: "none" }, 0)
            .to(".v6-hero-bottom", { yPercent: -6, opacity: 0.4, ease: "none" }, 0)
            .to({}, { duration: 1, onUpdate() { canvasRef.current?.setScroll(this.progress()); } }, 0);
        }

        gsap.utils.toArray<HTMLElement>(".signal-index-head, .signal-coming-head", scope).forEach((element) => {
          gsap.fromTo(element, { opacity: 0, y: 20 }, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "expo.out",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 84%", once: true },
          });
        });

        gsap.utils.toArray<HTMLElement>(".v6-insight, .signal-coming-row", scope).forEach((element) => {
          gsap.fromTo(element, { opacity: 0, y: 18 }, {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "expo.out",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          });
        });
      }, scope);
      contextCleanup = () => context.revert();
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      contextCleanup?.();
    };
  }, []);

  return (
    <>
      <CinemaCanvas ref={canvasRef} />
      <div className="v6-letterbox" aria-hidden="true">
        <div className="v6-letterbox-bar v6-letterbox-bar--top" />
        <div className="v6-letterbox-bar v6-letterbox-bar--bottom" />
      </div>
    </>
  );
}
