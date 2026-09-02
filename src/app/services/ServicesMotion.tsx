"use client";

import { useEffect } from "react";

export default function ServicesMotion() {
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".services-v6");
    if (!scope) return;

    const nav = document.querySelector<HTMLElement>(".nav");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resolveOdometers = () => scope.querySelectorAll<HTMLElement>(".od").forEach((column) => {
      const digit = Number(column.dataset.d || 0);
      const reel = column.querySelector<HTMLElement>("i");
      if (reel) reel.style.transform = `translateY(-${digit * 0.85}em)`;
    });

    if (reduce) {
      scope.querySelectorAll(".force").forEach((force) => force.classList.add("on"));
      resolveOdometers();
      if (nav) nav.dataset.theme = scope.querySelector<HTMLElement>("[data-nav]")?.dataset.nav || "light";
      return;
    }

    let cancelled = false;
    let cleanup = () => {};
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const setNav = (theme?: string) => {
          if (nav && theme && nav.dataset.theme !== theme) nav.dataset.theme = theme;
        };

        setNav(scope.querySelector<HTMLElement>("[data-nav]")?.dataset.nav);

        scope.querySelectorAll<HTMLElement>("[data-nav]").forEach((section) => {
          ScrollTrigger.create({
            trigger: section,
            start: "top 72px",
            end: "bottom 72px",
            onEnter: () => setNav(section.dataset.nav),
            onEnterBack: () => setNav(section.dataset.nav),
          });
        });

        const titleCharacters = scope.querySelectorAll("[data-service-title] .c");
        if (titleCharacters.length) gsap.fromTo(titleCharacters, { rotateX: -90, yPercent: 45, opacity: 0 }, { rotateX: 0, yPercent: 0, opacity: 1, duration: 0.82, stagger: 0.028, ease: "back.out(1.45)", immediateRender: true });

        const heroCopy = scope.querySelectorAll("[data-hero-copy]");
        if (heroCopy.length) gsap.fromTo(heroCopy, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.72, stagger: 0.07, delay: 0.35, ease: "expo.out", immediateRender: true });

        const canvasCuts = scope.querySelectorAll(".act-canvas .canvas-cut");
        if (canvasCuts.length) gsap.fromTo(canvasCuts, { scaleX: 0 }, { scaleX: 1, duration: 0.85, stagger: 0.08, delay: 0.2, ease: "power4.inOut", immediateRender: true });

        gsap.utils.toArray<HTMLElement>(".force").forEach((force) => {
          ScrollTrigger.create({
            trigger: force,
            start: "top 70%",
            end: "bottom 72px",
            onEnter: () => force.classList.add("on"),
            onLeave: () => force.classList.remove("on"),
            onEnterBack: () => force.classList.add("on"),
            onLeaveBack: () => force.classList.remove("on"),
          });
          const word = force.querySelector(".word");
          if (word) gsap.fromTo(word, { xPercent: force.dataset.side === "r" ? 14 : -14, skewX: force.dataset.side === "r" ? -7 : 7, opacity: 0 }, { xPercent: 0, skewX: 0, opacity: 1, duration: 0.9, ease: "expo.out", immediateRender: true, scrollTrigger: { trigger: force, start: "top 86%" } });
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(
            element,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.72, ease: "expo.out", immediateRender: true, scrollTrigger: { trigger: element, start: "top 86%", once: true } },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-wipe]").forEach((element) => {
          gsap.fromTo(
            element,
            { clipPath: "inset(0 100% 0 0)" },
            { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power4.inOut", immediateRender: true, scrollTrigger: { trigger: element, start: "top 90%", once: true } },
          );
        });

        scope.querySelectorAll<HTMLElement>("[data-metric]").forEach((metric) => {
          ScrollTrigger.create({
            trigger: metric,
            start: "top 86%",
            once: true,
            onEnter: () => metric.querySelectorAll<HTMLElement>(".od").forEach((column, index) => {
              gsap.to(column.querySelector("i"), { yPercent: -(Number(column.dataset.d) * 10), duration: 1.35, delay: index * 0.05, ease: "power4.out" });
            }),
          });
        });

        const end = scope.querySelector<HTMLElement>(".service-end");
        const endCharacters = end?.querySelectorAll("[data-split] .c");
        if (end && endCharacters?.length) gsap.fromTo(endCharacters, { rotateX: -90, yPercent: 50, opacity: 0 }, { rotateX: 0, yPercent: 0, opacity: 1, duration: 0.78, stagger: 0.025, ease: "back.out(1.45)", immediateRender: true, scrollTrigger: { trigger: end, start: "top 70%", once: true } });
      }, scope);

      await document.fonts?.ready;
      if (!cancelled) ScrollTrigger.refresh();
      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
