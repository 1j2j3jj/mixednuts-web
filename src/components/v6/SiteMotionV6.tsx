"use client";

import { useEffect, useRef } from "react";
import CinemaCanvas, { type CinemaCanvasHandle } from "@/components/v6/CinemaCanvas";

export function triggerV6LetterboxCut() {
  window.dispatchEvent(new CustomEvent("v6:letterbox-cut"));
}

export default function SiteMotionV6() {
  const canvasRef = useRef<CinemaCanvasHandle>(null);

  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".mn-v6");
    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const cleanup: Array<() => void> = [];

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      scope.classList.add("v6-js");
      const context = gsap.context(() => {
        const topBar = scope.querySelector<HTMLElement>(".v6-letterbox-bar--top");
        const bottomBar = scope.querySelector<HTMLElement>(".v6-letterbox-bar--bottom");
        const bars = [topBar, bottomBar].filter(Boolean);
        const cut = (duration = 0.64) => {
          if (!bars.length) return gsap.timeline();
          return gsap.timeline()
            .fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: duration / 2, ease: "power4.inOut", immediateRender: true })
            .to(bars, { scaleY: 0, duration: duration / 2, ease: "power4.inOut" });
        };
        const onCut = () => cut();
        window.addEventListener("v6:letterbox-cut", onCut);
        cleanup.push(() => window.removeEventListener("v6:letterbox-cut", onCut));

        const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        cleanup.push(() => {
          gsap.ticker.remove(tick);
          lenis.destroy();
        });

        const revisiting = sessionStorage.getItem("mn-v6-intro-seen") === "1";
        sessionStorage.setItem("mn-v6-intro-seen", "1");
        const introScale = revisiting ? 0.42 : 1;
        const heroWords = gsap.utils.toArray<HTMLElement>(".v6-hero-word", scope);
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .fromTo(".v6-hero-overline", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 * introScale, immediateRender: true })
          .fromTo(heroWords, { opacity: 0, yPercent: 35, letterSpacing: "0.35em", fontWeight: 500, fontVariationSettings: '"opsz" 36, "SOFT" 60, "WONK" 0' }, {
            opacity: 1,
            yPercent: 0,
            letterSpacing: "0.02em",
            fontWeight: 650,
            fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
            stagger: 0.16 * introScale,
            duration: 0.9 * introScale,
            immediateRender: true,
          }, `-=${0.1 * introScale}`)
          .fromTo([".v6-hero-register", ".v6-hero-lead", ".v6-hero-actions"], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.65 * introScale, stagger: 0.1 * introScale, immediateRender: true }, `-=${0.25 * introScale}`);

        const desktop = window.matchMedia("(min-width: 861px)").matches;
        if (desktop) {
          gsap.timeline({
            scrollTrigger: { trigger: ".v6-hero", start: "top top", end: "+=90%", pin: true, scrub: 1 },
          })
            .to(".v6-hero-title-wrap", { yPercent: -18, scale: 0.84, opacity: 0.55, ease: "none" }, 0)
            .to(".v6-hero-bottom", { yPercent: -8, opacity: 0.35, ease: "none" }, 0)
            .to({}, { duration: 1, onUpdate() { canvasRef.current?.setScroll(this.progress()); } }, 0)
            .add(cut(0.66), 0.82);

          const thesisLines = gsap.utils.toArray<HTMLElement>(".v6-thesis-line", scope);
          if (thesisLines[0]) {
            gsap.fromTo(thesisLines[0], { clipPath: "inset(0 100% 0 0)", opacity: 0.2 }, {
              clipPath: "inset(0 0% 0 0)",
              opacity: 1,
              immediateRender: true,
              ease: "none",
              scrollTrigger: { trigger: thesisLines[0], start: "top 92%", end: "top 75%", scrub: true },
            });
          }
          gsap.timeline({ scrollTrigger: { trigger: ".v6-thesis", start: "top top", end: "+=140%", pin: true, scrub: 0.75 } })
            .fromTo(thesisLines.slice(1), { clipPath: "inset(0 100% 0 0)", opacity: 0.2 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, stagger: 0.24, duration: 0.48, immediateRender: true, ease: "power4.inOut" })
            .fromTo(".v6-thesis-answer", { clipPath: "inset(0 0 100% 0)", opacity: 0 }, { clipPath: "inset(0 0 0% 0)", opacity: 1, duration: 0.5, immediateRender: true, ease: "power4.inOut" });

          const actPanels = gsap.utils.toArray<HTMLElement>(".v6-act", scope);
          const actTimeline = gsap.timeline({ scrollTrigger: { trigger: ".v6-acts", start: "top top", end: "+=300%", pin: true, scrub: 0.7 } });
          actPanels.forEach((panel, index) => {
            const position = index;
            actTimeline.fromTo(panel, { opacity: 0, clipPath: "inset(0 0 100% 0)", y: 32 }, { opacity: 1, clipPath: "inset(0 0 0% 0)", y: 0, duration: 0.34, immediateRender: true, ease: "power4.inOut", onStart: () => canvasRef.current?.setAct(index + 1), onReverseComplete: () => canvasRef.current?.setAct(Math.max(0, index)) }, position);
            if (index < actPanels.length - 1) {
              actTimeline.add(cut(0.64), position + 0.55).to(panel, { opacity: 0, clipPath: "inset(0 0 100% 0)", y: -24, duration: 0.28, ease: "power4.inOut" }, position + 0.68);
            }
          });
        } else {
          gsap.timeline({ scrollTrigger: { trigger: ".v6-thesis", start: "top 82%", once: true } })
            .add(cut(0.6), 0)
            .fromTo(".v6-thesis-line, .v6-thesis-answer", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: "expo.out", immediateRender: true }, 0.2);
          gsap.utils.toArray<HTMLElement>(".v6-act", scope).forEach((panel) => {
            ScrollTrigger.create({ trigger: panel, start: "top 82%", once: true, onEnter: () => gsap.fromTo(panel, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", immediateRender: true }) });
          });
        }

        gsap.utils.toArray<HTMLElement>(".v6-proof-item", scope).forEach((item) => {
          const shutter = item.querySelector(".v6-proof-shutter");
          gsap.timeline({ scrollTrigger: { trigger: item, start: "top 82%", once: true } })
            .fromTo(item, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: true })
            .fromTo(shutter, { scaleY: 1 }, { scaleY: 0, duration: 0.7, ease: "power4.inOut", immediateRender: true });
        });
        gsap.fromTo(".v6-index-row", { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.55, immediateRender: true, ease: "expo.out", scrollTrigger: { trigger: ".v6-index", start: "top 82%", once: true } });
        gsap.fromTo(".v6-insight", { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.75, immediateRender: true, ease: "expo.out", scrollTrigger: { trigger: ".v6-insight-list", start: "top 82%", once: true } });
        gsap.fromTo([".v6-end-title", ".v6-end-copy", ".v6-end .v6-button"], { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.9, immediateRender: true, ease: "expo.out", scrollTrigger: { trigger: ".v6-end", start: "top 70%", once: true } });
        ScrollTrigger.create({
          trigger: ".v6-end",
          start: "top 65%",
          onEnter: () => canvasRef.current?.setAct(0),
          onLeaveBack: () => canvasRef.current?.setAct(3),
        });
      }, scope);
      cleanup.push(() => context.revert());
      ScrollTrigger.refresh();
    })();

    return () => {
      cancelled = true;
      cleanup.reverse().forEach((fn) => fn());
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
