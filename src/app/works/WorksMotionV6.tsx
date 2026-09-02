"use client";

import { useEffect, useRef } from "react";
import CinemaCanvas, { type CinemaCanvasHandle } from "@/components/v6/CinemaCanvas";

export default function WorksMotionV6() {
  const canvasRef = useRef<CinemaCanvasHandle>(null);

  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".mn-v6.works-v6");
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
        const topBar = scope.querySelector<HTMLElement>(".v6-letterbox-bar--top");
        const bottomBar = scope.querySelector<HTMLElement>(".v6-letterbox-bar--bottom");
        const bars = [topBar, bottomBar].filter((bar): bar is HTMLElement => Boolean(bar));
        const cut = () => {
          if (!bars.length) return;
          gsap.timeline()
            .fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 0.32, ease: "power4.inOut", immediateRender: true })
            .to(bars, { scaleY: 0, duration: 0.32, ease: "power4.inOut" });
        };
        window.addEventListener("v6:letterbox-cut", cut);
        cleanup.push(() => window.removeEventListener("v6:letterbox-cut", cut));

        const heroWords = gsap.utils.toArray<HTMLElement>(".v6-hero-word", scope);
        const heroSupporting = gsap.utils.toArray<HTMLElement>(
          ".v6-hero-overline, .v6-hero-register, .v6-hero-lead, .works-v6-hero-note, .works-v6-case-services, .works-v6-case-client",
          scope,
        );

        gsap.timeline({ defaults: { ease: "expo.out" } })
          .fromTo(heroWords, { opacity: 0, yPercent: 22 }, {
            opacity: 1,
            yPercent: 0,
            duration: 0.58,
            stagger: 0.08,
            immediateRender: true,
          })
          .fromTo(heroSupporting, { opacity: 0, y: 14 }, {
            opacity: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.05,
            immediateRender: true,
          }, "-=0.36");

        if (window.matchMedia("(min-width: 861px)").matches) {
          gsap.timeline({
            scrollTrigger: { trigger: ".v6-hero", start: "top top", end: "+=105%", pin: true, scrub: 1 },
          })
            .to(".v6-hero-title-wrap", { yPercent: -14, scale: 0.88, opacity: 0.58, ease: "none" }, 0)
            .to(".v6-hero-bottom", { yPercent: -6, opacity: 0.38, ease: "none" }, 0)
            .to({}, { duration: 1, onUpdate() { canvasRef.current?.setScroll(this.progress()); } }, 0);
        }

        const indexRows = gsap.utils.toArray<HTMLElement>(".works-v6-index-row", scope);
        if (indexRows.length) {
          gsap.fromTo(indexRows, { opacity: 0, y: 12 }, {
            opacity: 1,
            y: 0,
            stagger: 0.045,
            duration: 0.55,
            immediateRender: true,
            ease: "expo.out",
            scrollTrigger: { trigger: ".works-v6-index", start: "top 84%", once: true },
          });
        }

        gsap.utils.toArray<HTMLElement>(".works-v6-area, .works-v6-case-section, .works-v6-case-closing article", scope).forEach((element) => {
          gsap.fromTo(element, { opacity: 0, y: 20 }, {
            opacity: 1,
            y: 0,
            duration: 0.58,
            ease: "expo.out",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 84%", once: true },
          });
        });

        const endElements = gsap.utils.toArray<HTMLElement>(".v6-end-title, .v6-end-copy, .v6-end .v6-button", scope);
        if (endElements.length) {
          gsap.fromTo(endElements, { opacity: 0, y: 24 }, {
            opacity: 1,
            y: 0,
            stagger: 0.08,
            duration: 0.58,
            immediateRender: true,
            ease: "expo.out",
            scrollTrigger: { trigger: ".v6-end", start: "top 76%", once: true },
          });
        }
      }, scope);

      cleanup.push(() => context.revert());
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cleanup.reverse().forEach((dispose) => dispose());
      scope.classList.remove("v6-js");
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
