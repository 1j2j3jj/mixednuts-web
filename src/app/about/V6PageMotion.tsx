"use client";

import { useEffect } from "react";

export default function V6PageMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".v6-page-motion");
    if (!root) return;

    const resolveOdometers = () => {
      root.querySelectorAll<HTMLElement>(".od").forEach((column) => {
        const reel = column.querySelector<HTMLElement>("i");
        if (reel) reel.style.transform = `translateY(-${Number(column.dataset.d || 0) * 0.85}em)`;
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      resolveOdometers();
      return;
    }

    let cancelled = false;
    let revert = () => {};
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const nav = document.querySelector<HTMLElement>(".nav");
        root.querySelectorAll<HTMLElement>("[data-nav]").forEach((section) => {
          ScrollTrigger.create({
            trigger: section,
            start: "top 20%",
            end: "bottom 20%",
            onEnter: () => { if (nav) nav.dataset.theme = section.dataset.nav || "light"; },
            onEnterBack: () => { if (nav) nav.dataset.theme = section.dataset.nav || "light"; },
          });
        });

        gsap.fromTo(
          root.querySelectorAll(".title-card h1 .c"),
          { rotateX: -90, yPercent: 45, opacity: 0 },
          { rotateX: 0, yPercent: 0, opacity: 1, duration: 0.78, stagger: 0.025, ease: "back.out(1.4)", immediateRender: true },
        );
        gsap.fromTo(
          root.querySelectorAll(".title-card .overline, .title-card .page-lead, .title-card .page-index"),
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: "expo.out", immediateRender: true },
        );

        root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(element, { y: 28, opacity: 0 }, {
            y: 0,
            opacity: 1,
            duration: 0.75,
            ease: "expo.out",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          });
        });

        root.querySelectorAll<HTMLElement>("[data-wipe]").forEach((element, index) => {
          gsap.fromTo(element, {
            clipPath: index % 2 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)",
          }, {
            clipPath: "inset(0 0% 0 0%)",
            duration: 0.82,
            ease: "power4.inOut",
            immediateRender: true,
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          });
        });

        root.querySelectorAll<HTMLElement>("[data-odometer]").forEach((group) => {
          const reels = group.querySelectorAll<HTMLElement>(".od i");
          gsap.fromTo(reels, { y: 0 }, {
            y: (_, reel) => {
              const column = (reel as HTMLElement).closest<HTMLElement>(".od");
              return `${-Number(column?.dataset.d || 0) * 0.85}em`;
            },
            duration: 1.2,
            stagger: 0.06,
            ease: "power4.out",
            immediateRender: true,
            scrollTrigger: { trigger: group, start: "top 86%", once: true },
          });
        });
      }, root);
      revert = () => context.revert();

      await document.fonts?.ready;
      if (!cancelled) ScrollTrigger.refresh();
    })();

    return () => { cancelled = true; revert(); };
  }, []);

  return null;
}
