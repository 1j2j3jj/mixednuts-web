"use client";

import { useEffect } from "react";

export default function InsightsMotion() {
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".insights-v6");
    if (!scope) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = document.querySelector<HTMLElement>(".nav");
    const firstTheme = scope.querySelector<HTMLElement>("[data-nav]")?.dataset.nav;
    if (firstTheme) nav?.setAttribute("data-theme", firstTheme);
    const resolveOdometers = () => {
      scope.querySelectorAll<HTMLElement>(".od").forEach((column) => {
        const reel = column.querySelector<HTMLElement>("i");
        const digit = Number(column.dataset.d || 0);
        if (reel) reel.style.transform = `translateY(-${digit * 0.85}em)`;
      });
    };

    if (reduced) {
      resolveOdometers();
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
        gsap.fromTo(
          ".insights-slam .c",
          { rotateX: -90, yPercent: 45, opacity: 0 },
          {
            rotateX: 0,
            yPercent: 0,
            opacity: 1,
            duration: 0.82,
            stagger: 0.018,
            ease: "expo.out",
            immediateRender: true,
          },
        );

        gsap.fromTo(
          ".insights-title-meta",
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.06,
            delay: 0.28,
            ease: "expo.out",
            immediateRender: true,
          },
        );

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
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

        gsap.utils.toArray<HTMLElement>("[data-odometer-group]").forEach((group) => {
          const columns = group.querySelectorAll<HTMLElement>(".od");
          gsap.set(Array.from(columns, (column) => column.querySelector("i")), { yPercent: 0 });
          ScrollTrigger.create({
            trigger: group,
            start: "top 82%",
            once: true,
            onEnter: () => {
              columns.forEach((column, index) => {
                gsap.to(column.querySelector("i"), {
                  yPercent: -(Number(column.dataset.d || 0) * 10),
                  duration: 1.25,
                  delay: index * 0.055,
                  ease: "power4.out",
                });
              });
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-wipe]").forEach((section, index) => {
          gsap.fromTo(
            section,
            { clipPath: index % 2 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" },
            {
              clipPath: "inset(0 0% 0 0%)",
              duration: 0.78,
              ease: "power4.inOut",
              immediateRender: true,
              scrollTrigger: { trigger: section, start: "top 92%", once: true },
            },
          );
        });

        scope.querySelectorAll<HTMLElement>("[data-nav]").forEach((section) => {
          const theme = section.dataset.nav;
          if (!theme) return;
          ScrollTrigger.create({
            trigger: section,
            start: "top 18%",
            end: "bottom 18%",
            onEnter: () => nav?.setAttribute("data-theme", theme),
            onEnterBack: () => nav?.setAttribute("data-theme", theme),
          });
        });
      }, scope);
      cleanup = () => context.revert();

      await document.fonts?.ready;
      if (!cancelled) ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
