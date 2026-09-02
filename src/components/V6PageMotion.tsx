"use client";

import { useEffect } from "react";

export default function V6PageMotion() {
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>("[data-v6-page]");
    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const titleCharacters = scope.querySelectorAll(".v6-slam .c");
        if (titleCharacters.length) {
          gsap.fromTo(
            titleCharacters,
            { rotateX: -90, yPercent: 45, opacity: 0 },
            {
              rotateX: 0,
              yPercent: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.025,
              ease: "back.out(1.45)",
              immediateRender: true,
            },
          );
        }

        const heroDetails = scope.querySelectorAll(".v6-hero-detail");
        if (heroDetails.length) {
          gsap.fromTo(
            heroDetails,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.07,
              delay: 0.38,
              ease: "power3.out",
              immediateRender: true,
            },
          );
        }

        scope.querySelectorAll<HTMLElement>(".v6-reveal").forEach((element) => {
          gsap.fromTo(
            element,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.75,
              ease: "expo.out",
              immediateRender: true,
              scrollTrigger: { trigger: element, start: "top 88%", once: true },
            },
          );
        });

        scope.querySelectorAll<HTMLElement>(".v6-rule").forEach((element) => {
          gsap.fromTo(
            element,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.8,
              ease: "power4.out",
              transformOrigin: "left",
              immediateRender: true,
              scrollTrigger: { trigger: element, start: "top 92%", once: true },
            },
          );
        });

        const nav = document.querySelector<HTMLElement>(".nav");
        scope.querySelectorAll<HTMLElement>("[data-nav]").forEach((section) => {
          const theme = section.dataset.nav;
          if (!nav || !theme) return;
          ScrollTrigger.create({
            trigger: section,
            start: "top 15%",
            end: "bottom 15%",
            onEnter: () => { nav.dataset.theme = theme; },
            onEnterBack: () => { nav.dataset.theme = theme; },
          });
        });
      }, scope);

      cleanups.push(() => context.revert());
      await document.fonts?.ready;
      if (!cancelled) ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
