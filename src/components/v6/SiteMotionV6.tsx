"use client";

import { useEffect } from "react";

export default function SiteMotionV6() {
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(".mn-v6");
    if (!scope) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const intro = scope.querySelector<HTMLElement>(".intro");
    const resolveOdometers = () => scope.querySelectorAll<HTMLElement>(".od").forEach((column) => {
      const digit = Number(column.dataset.d || 0);
      const reel = column.querySelector<HTMLElement>("i");
      if (reel) reel.style.transform = `translateY(-${digit * 0.85}em)`;
    });
    if (reduce) {
      intro?.remove();
      scope.querySelectorAll(".force").forEach((force) => force.classList.add("on"));
      resolveOdometers();
      return;
    }

    let cancelled = false;
    const cleanups: Array<() => void> = [];
    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger"), import("lenis"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mobile = window.matchMedia("(max-width: 900px)").matches;
      const nav = document.querySelector<HTMLElement>(".nav");
      const setNav = (theme?: string) => { if (nav && theme && nav.dataset.theme !== theme) nav.dataset.theme = theme; };
      const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      const onLenisScroll = () => ScrollTrigger.update();
      const lenisTick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", onLenisScroll);
      gsap.ticker.add(lenisTick);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => { gsap.ticker.remove(lenisTick); lenis.destroy(); });

      const context = gsap.context(() => {
        gsap.set(".od i", { yPercent: 0 });

        let seen = false;
        try { seen = sessionStorage.getItem("mn-intro") === "1"; sessionStorage.setItem("mn-intro", "1"); } catch {}
        const introTimeline = gsap.timeline({ defaults: { ease: "power4.out" } });
        if (!seen) {
          introTimeline.fromTo(".intro .word span", { yPercent: 80, scale: 1.4, opacity: 0, rotate: -6 }, { yPercent: 0, scale: 1, opacity: 1, rotate: 0, duration: 0.55, stagger: 0.07, ease: "back.out(1.8)", immediateRender: true }, 0.1)
            .fromTo(".intro .word small", { opacity: 0, y: 10 }, { opacity: 0.8, y: 0, duration: 0.4, immediateRender: true }, 0.55)
            .to(".intro .word", { opacity: 0, scale: 1.08, duration: 0.35, ease: "power2.in" }, 1.25)
            .to(".intro .p1", { xPercent: -100, duration: 0.8, ease: "power4.inOut" }, 1.35)
            .to(".intro .p2", { xPercent: 100, duration: 0.8, ease: "power4.inOut" }, 1.35);
        } else {
          introTimeline.to(".intro .word", { opacity: 0, duration: 0.01 }).to(".intro .p1", { xPercent: -100, duration: 0.6, ease: "power4.inOut" }, 0.05).to(".intro .p2", { xPercent: 100, duration: 0.6, ease: "power4.inOut" }, 0.05);
        }
        const heroAt = seen ? 0.25 : 1.55;
        introTimeline.fromTo("h1 .c", { rotateX: -90, yPercent: 40, opacity: 0 }, { rotateX: 0, yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.028, ease: "back.out(1.4)", immediateRender: true }, heroAt)
          .fromTo(".overline, .lead, .chips, .btns, .spine", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, immediateRender: true }, heroAt + 0.45)
          .fromTo(".wall", { xPercent: 6, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.4, ease: "power3.out", immediateRender: true }, heroAt - 0.1)
          .add(() => intro?.remove());

        const skewTo = gsap.quickTo(".vs", "skewY", { duration: 0.5, ease: "power3" });
        const ticker = scope.querySelector<HTMLElement>(".ticker .track");
        const tickerTween = gsap.to(ticker, { xPercent: -50, ease: "none", duration: 28, repeat: -1 });
        const wallScale = gsap.quickTo(".wall", "scaleX", { duration: 0.6, ease: "power3" });
        const wallSkew = gsap.quickTo(".wall", "skewX", { duration: 0.6, ease: "power3" });
        let lastVelocity = 0;
        ScrollTrigger.create({ onUpdate(self) {
          const velocity = self.getVelocity(); lastVelocity = velocity;
          if (!mobile) { skewTo(gsap.utils.clamp(-3, 3, velocity / 1400)); wallScale(1 + gsap.utils.clamp(0, 0.22, Math.abs(velocity) / 6000)); wallSkew(gsap.utils.clamp(-10, 10, velocity / 300)); }
          const tickerSpeed = gsap.utils.clamp(-6, 6, velocity / 400);
          gsap.to(tickerTween, { timeScale: (velocity >= 0 ? 1 : -1) * (1 + Math.abs(tickerSpeed)), duration: 0.3, overwrite: true });
        } });
        const settleVelocity = () => { if (Math.abs(lastVelocity) < 20) { skewTo(0); if (!mobile) { wallScale(1); wallSkew(0); } gsap.to(tickerTween, { timeScale: 1, duration: 0.8, overwrite: "auto" }); } lastVelocity *= 0.9; };
        gsap.ticker.add(settleVelocity);
        cleanups.push(() => gsap.ticker.remove(settleVelocity));

        gsap.to(".wallwrap", { xPercent: -18, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.6 } });
        gsap.to(".wall", { xPercent: -5, duration: 14, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to("h1", { "--w": 100, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(".ring", { rotateY: 360, duration: 40, ease: "none", repeat: -1 });
        if (!mobile) {
          const wallX = gsap.quickTo(".wallwrap", "x", { duration: 0.8, ease: "power3" }); const wallY = gsap.quickTo(".wallwrap", "y", { duration: 0.8, ease: "power3" });
          const ringX = gsap.quickTo(".ring", "x", { duration: 1, ease: "power3" }); const ringY = gsap.quickTo(".ring", "y", { duration: 1, ease: "power3" }); const leadX = gsap.quickTo(".lead", "x", { duration: 1, ease: "power3" });
          const titleX = gsap.quickTo("h1", "x", { duration: 0.8, ease: "power3" }); const titleRotateY = gsap.quickTo("h1", "rotateY", { duration: 0.8, ease: "power3" }); const titleRotateX = gsap.quickTo("h1", "rotateX", { duration: 0.8, ease: "power3" });
          const onMouseMove = (event: MouseEvent) => { const x = event.clientX / innerWidth - 0.5; const y = event.clientY / innerHeight - 0.5; wallX(x * -46); wallY(y * -22); titleX(x * -10); titleRotateY(x * 8); titleRotateX(y * -5); ringX(x * 40); ringY(y * 24); leadX(x * -5); };
          addEventListener("mousemove", onMouseMove); cleanups.push(() => removeEventListener("mousemove", onMouseMove));
        }

        let navFrame = 0;
        const sampleNav = () => { if ((++navFrame) % 5) return; const element = document.elementFromPoint(Math.round(innerWidth * 0.5), 30); const section = element?.closest<HTMLElement>("[data-nav]"); if (section) setNav(section.dataset.nav); };
        gsap.ticker.add(sampleNav); cleanups.push(() => gsap.ticker.remove(sampleNav));

        const fields = gsap.utils.toArray<HTMLElement>(".field");
        if (!mobile) {
          const thesisTimeline = gsap.timeline({ scrollTrigger: { trigger: "#thesis", start: "top top", end: `+=${fields.length * 95}%`, pin: true, scrub: 0.5, anticipatePin: 1 } });
          fields.forEach((field, index) => {
            const big = field.querySelector(".big"); const kicker = field.querySelector(".k"); const sub = field.querySelector(".sub"); const number = field.querySelector(".num");
            if (index === 0) {
              thesisTimeline.fromTo(big, { xPercent: -12, yPercent: 30, scale: 1.15, opacity: 0 }, { xPercent: 0, yPercent: 0, scale: 1, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, 0)
                .fromTo(kicker, { opacity: 0 }, { opacity: 0.7, duration: 0.4, immediateRender: true }, 0.1)
                .fromTo(number, { xPercent: 40, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.6, immediateRender: true }, 0.05).to({}, { duration: 0.5 });
            } else {
              const flash = () => gsap.fromTo(".flash", { opacity: 0.28 }, { opacity: 0, duration: 0.45, ease: "power2.out", overwrite: true });
              if (field.hasAttribute("data-diag")) thesisTimeline.fromTo(field, { clipPath: "polygon(0% 100%, 100% 130%, 100% 130%, 0% 100%)" }, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 0.9, ease: "power4.inOut", immediateRender: true, onStart: flash, onReverseComplete: flash });
              else thesisTimeline.fromTo(field, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 0.8, ease: "power4.inOut", immediateRender: true, onStart: flash, onReverseComplete: flash });
              thesisTimeline.fromTo(big, { xPercent: index % 2 ? 14 : -14, yPercent: 40, scale: 1.2, opacity: 0 }, { xPercent: 0, yPercent: 0, scale: 1, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, "<0.35")
                .fromTo(kicker, { opacity: 0 }, { opacity: 0.7, duration: 0.4 }, "<0.1").fromTo(number, { xPercent: 40, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.6 }, "<");
              if (sub) thesisTimeline.fromTo(sub, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "<0.2");
              thesisTimeline.to({}, { duration: index === fields.length - 1 ? 0.9 : 0.5 });
            }
          });
        } else fields.forEach((field, index) => gsap.fromTo(field.querySelector(".big"), { xPercent: index % 2 ? 10 : -10, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.8, ease: "power3.out", immediateRender: true, scrollTrigger: { trigger: field, start: "top 75%" } }));

        gsap.utils.toArray<HTMLElement>(".force").forEach((force) => {
          ScrollTrigger.create({ trigger: force, start: "top 62%", end: "bottom 38%", onEnter: () => force.classList.add("on"), onLeave: () => force.classList.remove("on"), onEnterBack: () => force.classList.add("on"), onLeaveBack: () => force.classList.remove("on") });
          gsap.fromTo(force.querySelector(".word"), { xPercent: force.dataset.side === "r" ? 18 : -18, skewX: force.dataset.side === "r" ? -8 : 8, opacity: 0 }, { xPercent: 0, skewX: 0, opacity: 1, duration: 1, ease: "power3.out", immediateRender: true, scrollTrigger: { trigger: force, start: "top 85%" } });
        });

        ScrollTrigger.create({ trigger: ".stats", start: "top 78%", once: true, onEnter: () => { scope.querySelectorAll<HTMLElement>(".stats .od").forEach((column, index) => gsap.to(column.querySelector("i"), { yPercent: -(Number(column.dataset.d) * 10), duration: 1.6, delay: index * 0.08, ease: "power4.out" })); gsap.fromTo(".stat .sym", { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.9, ease: "back.out(2)", immediateRender: true }); } });
        gsap.fromTo(".row", { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: "power3.out", immediateRender: true, scrollTrigger: { trigger: ".index", start: "top 75%" } });
        gsap.fromTo(".row .bar", { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.07, ease: "power4.out", immediateRender: true, scrollTrigger: { trigger: ".index", start: "top 75%" } });
        gsap.utils.toArray<HTMLElement>(".proof, .insights, .founder").forEach((section, index) => gsap.fromTo(section, { clipPath: index % 2 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0%)", ease: "none", immediateRender: true, scrollTrigger: { trigger: section, start: "top 96%", end: "top 40%", scrub: 0.3 } }));
        ScrollTrigger.create({ trigger: ".insights", start: "top 70%", once: true, onEnter: () => scope.querySelectorAll<HTMLElement>(".art .od").forEach((column, index) => gsap.to(column.querySelector("i"), { yPercent: -(Number(column.dataset.d) * 10), duration: 1.4, delay: index * 0.06, ease: "power4.out" })) });
        gsap.fromTo(".art", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power3.out", immediateRender: true, scrollTrigger: { trigger: ".insights", start: "top 70%" } });
        gsap.fromTo(".art .num", { xPercent: -20 }, { xPercent: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", immediateRender: true, scrollTrigger: { trigger: ".insights", start: "top 70%" } });
        gsap.fromTo(".founder .mono", { xPercent: -18 }, { xPercent: 10, ease: "none", scrollTrigger: { trigger: ".founder", start: "top bottom", end: "bottom top", scrub: true } });
        gsap.fromTo(".end", { clipPath: "polygon(0% 100%, 100% 70%, 100% 100%, 0% 100%)" }, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", ease: "none", scrollTrigger: { trigger: ".endwrap", start: "top 90%", end: "top 20%", scrub: 0.4 } });
        gsap.fromTo(".end h2 .c", { rotateX: -90, yPercent: 50, opacity: 0 }, { rotateX: 0, yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.03, ease: "back.out(1.5)", immediateRender: true, scrollTrigger: { trigger: ".end", start: "top 65%" } });
        gsap.fromTo(".end .cols", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, delay: 0.4, immediateRender: true, scrollTrigger: { trigger: ".end", start: "top 65%" } });
        gsap.fromTo(document.querySelectorAll(".footer .bars i"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.12, ease: "power3.out", immediateRender: true, scrollTrigger: { trigger: ".footer", start: "top 95%" } });
      }, scope);
      cleanups.push(() => context.revert());
      await document.fonts?.ready;
      if (!cancelled) ScrollTrigger.refresh();
    })();

    return () => { cancelled = true; cleanups.reverse().forEach((cleanup) => cleanup()); };
  }, []);

  return null;
}
