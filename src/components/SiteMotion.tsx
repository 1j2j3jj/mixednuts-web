"use client";

import { useEffect } from "react";

/**
 * mixednuts v4 motion engine — client-side port of the dist `site.js`.
 * Particle field · scroll reveals · count-up · magnetic buttons ·
 * custom cursor · parallax / mouse-tilt · reactive marquee · nav state.
 *
 * Renders the two fixed overlays (scroll-progress bar + custom cursor)
 * and wires every effect in a single useEffect with full teardown so
 * client-side navigation never stacks duplicate rAF loops or listeners.
 *
 * Mount this INSIDE the `.mn-v4` wrapper so the scoped CSS applies.
 */
export default function SiteMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(hover: none)").matches;

    let killed = false;
    const rafs = new Set<number>();
    const raf = (fn: FrameRequestCallback) => {
      if (killed) return 0;
      const id = requestAnimationFrame((t) => {
        rafs.delete(id);
        if (!killed) fn(t);
      });
      rafs.add(id);
      return id;
    };
    type Off = () => void;
    const offs: Off[] = [];
    const on = (
      target: Window | Document | Element,
      type: string,
      handler: EventListenerOrEventListenerObject,
      opts?: AddEventListenerOptions
    ) => {
      target.addEventListener(type, handler, opts);
      offs.push(() => target.removeEventListener(type, handler, opts));
    };

    /* ---------- particle field (mouse-reactive) ---------- */
    function field(
      canvas: HTMLCanvasElement | null,
      opts: { count: number; link: number; speed: number; interactive?: boolean }
    ) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = 0,
        h = 0,
        pts: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
      const COUNT = opts.count,
        LINK = opts.link,
        SP = opts.speed,
        INT = !!opts.interactive && !touch;
      let mxp = -9999,
        myp = -9999;
      function resize() {
        w = canvas!.clientWidth;
        h = canvas!.clientHeight;
        canvas!.width = w * dpr;
        canvas!.height = h * dpr;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(COUNT * Math.min(1.4, Math.max(0.5, w / 1200)));
        pts = [];
        for (let i = 0; i < n; i++) {
          pts.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * SP,
            vy: (Math.random() - 0.5) * SP,
            r: Math.random() * 1.7 + 0.6,
          });
        }
      }
      if (INT) {
        on(window, "mousemove", (e) => {
          const r = canvas!.getBoundingClientRect();
          mxp = (e as MouseEvent).clientX - r.left;
          myp = (e as MouseEvent).clientY - r.top;
        });
        on(window, "mouseout", () => {
          mxp = -9999;
          myp = -9999;
        });
      }
      function draw() {
        ctx!.clearRect(0, 0, w, h);
        if (INT && mxp > -9000) {
          const g = ctx!.createRadialGradient(mxp, myp, 0, mxp, myp, 175);
          g.addColorStop(0, "rgba(0,217,255,0.10)");
          g.addColorStop(1, "rgba(0,217,255,0)");
          ctx!.fillStyle = g;
          ctx!.fillRect(mxp - 175, myp - 175, 350, 350);
        }
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (INT && mxp > -9000) {
            const ax = p.x - mxp,
              ay = p.y - myp,
              ad = ax * ax + ay * ay;
            if (ad < 19600) {
              const dd = Math.sqrt(ad) || 1,
                fo = (140 - dd) / 140;
              p.vx += (ax / dd) * fo * 0.7;
              p.vy += (ay / dd) * fo * 0.7;
            }
          }
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy),
            cap = SP * 3.2;
          if (spd > cap) {
            p.vx *= cap / spd;
            p.vy *= cap / spd;
          }
          p.vx *= 0.996;
          p.vy *= 0.996;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx!.fillStyle = "rgba(120,220,255,0.75)";
          ctx!.fill();
          for (let j = i + 1; j < pts.length; j++) {
            const q = pts[j],
              dx = p.x - q.x,
              dy = p.y - q.y,
              d = dx * dx + dy * dy;
            if (d < LINK * LINK) {
              const a = (1 - Math.sqrt(d) / LINK) * 0.55;
              ctx!.beginPath();
              ctx!.moveTo(p.x, p.y);
              ctx!.lineTo(q.x, q.y);
              ctx!.strokeStyle = "rgba(0,200,255," + a + ")";
              ctx!.lineWidth = 0.7;
              ctx!.stroke();
            }
          }
        }
        raf(draw);
      }
      function staticDraw() {
        ctx!.clearRect(0, 0, w, h);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, 6.2832);
          ctx!.fillStyle = "rgba(120,220,255,0.5)";
          ctx!.fill();
        }
      }
      resize();
      on(window, "resize", () => {
        resize();
        if (reduce) staticDraw();
      });
      if (reduce) staticDraw();
      else draw();
    }
    field(document.getElementById("fx") as HTMLCanvasElement, { count: 82, link: 158, speed: 0.45, interactive: true });
    field(document.getElementById("fx2") as HTMLCanvasElement, { count: 50, link: 145, speed: 0.4 });
    document.querySelectorAll<HTMLCanvasElement>("canvas.fxgen").forEach((c) => {
      field(c, {
        count: +(c.getAttribute("data-count") || 0) || 58,
        link: +(c.getAttribute("data-link") || 0) || 150,
        speed: +(c.getAttribute("data-speed") || 0) || 0.42,
        interactive: c.hasAttribute("data-interactive"),
      });
    });

    /* ---------- count-up ---------- */
    function countUp(el: HTMLElement) {
      const target = parseFloat(el.getAttribute("data-count") || "0");
      const suffix = el.getAttribute("data-suffix") || "";
      if (reduce) {
        el.textContent = target + suffix;
        return;
      }
      const dur = 1400;
      let t0: number | null = null;
      function step(t: number) {
        if (!t0) t0 = t;
        const p = Math.min((t - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suffix;
        if (p < 1) raf(step);
      }
      raf(step);
    }

    /* ---------- reveal + count-up on scroll ---------- */
    const revs = Array.from(document.querySelectorAll<HTMLElement>(".mn-v4 .reveal"));
    const nums = Array.from(document.querySelectorAll<HTMLElement>(".mn-v4 [data-count]"));
    const counted = new WeakSet<HTMLElement>();
    function inView(el: HTMLElement, ratio?: number) {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top < vh * (ratio || 0.9) && r.bottom > vh * 0.03;
    }
    function checkReveals() {
      if (reduce) revs.forEach((el) => el.classList.add("in"));
      else revs.forEach((el) => {
        if (!el.classList.contains("in") && inView(el)) el.classList.add("in");
      });
      nums.forEach((el) => {
        if (!counted.has(el) && inView(el, 0.86)) {
          counted.add(el);
          countUp(el);
        }
      });
    }
    let rTick = false;
    function onRevealScroll() {
      if (rTick) return;
      rTick = true;
      raf(() => {
        checkReveals();
        rTick = false;
      });
    }
    on(window, "scroll", onRevealScroll, { passive: true });
    on(window, "resize", onRevealScroll);
    on(window, "load", checkReveals);
    checkReveals();

    /* ---------- hero headline entrance ---------- */
    const showHero = () => {
      const hh = document.querySelector(".mn-v4 .hero-h1");
      if (hh) hh.classList.add("show");
    };
    raf(() => raf(showHero));

    /* ---------- safety net ---------- */
    const safety = window.setTimeout(() => {
      root.classList.add("force-show");
      showHero();
      nums.forEach((el) => {
        if (!counted.has(el)) {
          counted.add(el);
          el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
        }
      });
    }, 1900);

    /* ---------- mobile nav toggle ---------- */
    const nt = document.querySelector(".mn-v4 .nav-toggle");
    const navEl = document.getElementById("nav");
    if (nt && navEl) {
      on(nt, "click", () => {
        const open = navEl.classList.toggle("open");
        document.body.style.overflow = open ? "hidden" : "";
      });
      navEl.querySelectorAll(".nav-links a").forEach((a) => {
        on(a, "click", () => {
          navEl.classList.remove("open");
          document.body.style.overflow = "";
        });
      });
    }

    /* ---------- parallax + mouse-tilt + work img + reactive marquee ---------- */
    if (!reduce) {
      const layers = Array.from(
        document.querySelectorAll<HTMLElement>(".mn-v4 [data-parallax],.mn-v4 [data-mouse]")
      ).map((el) => {
        el.style.transform = "none";
        return {
          el,
          orb: el.classList.contains("hero-orb"),
          pf: parseFloat(el.getAttribute("data-parallax") || "0") || 0,
          mf: (parseFloat(el.getAttribute("data-mouse") || "0") || 0) * 1100,
          base: el.getBoundingClientRect().top + window.pageYOffset,
        };
      });
      const worksEls = Array.from(document.querySelectorAll<HTMLElement>(".mn-v4 .work"));
      const marq = document.querySelector<HTMLElement>(".mn-v4 .marquee-run");
      let mhalf = 0,
        mpos = 0;
      function remeasure() {
        layers.forEach((o) => {
          const t = o.el.style.transform;
          o.el.style.transform = "none";
          o.base = o.el.getBoundingClientRect().top + window.pageYOffset;
          o.el.style.transform = t;
        });
        if (marq) mhalf = marq.scrollWidth / 2;
      }
      let tmx = 0,
        tmy = 0,
        mxs = 0,
        mys = 0;
      if (!touch)
        on(window, "mousemove", (e) => {
          tmx = (e as MouseEvent).clientX / window.innerWidth - 0.5;
          tmy = (e as MouseEvent).clientY / window.innerHeight - 0.5;
        });
      let lastY = window.pageYOffset,
        vel = 0;
      function tick() {
        const y = window.pageYOffset,
          vh = window.innerHeight,
          now = performance.now() / 1000;
        vel += (y - lastY - vel) * 0.22;
        lastY = y;
        mxs += (tmx - mxs) * 0.07;
        mys += (tmy - mys) * 0.07;
        for (let i = 0; i < layers.length; i++) {
          const o = layers[i];
          let tx = -mxs * o.mf,
            ty = (y - o.base) * o.pf - mys * o.mf;
          if (o.orb) {
            tx += Math.sin(now * 0.5 + i) * 16;
            ty += Math.cos(now * 0.42 + i * 1.3) * 14;
          }
          o.el.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0)";
        }
        for (let k = 0; k < worksEls.length; k++) {
          const wk = worksEls[k],
            r = wk.getBoundingClientRect();
          if (r.bottom > -60 && r.top < vh + 60)
            wk.style.setProperty("--py", (((r.top + r.height / 2 - vh / 2) / vh) * 38).toFixed(1) + "px");
        }
        if (marq && mhalf) {
          mpos -= 1.05 + Math.min(Math.abs(vel) * 0.55, 30);
          if (mpos <= -mhalf) mpos += mhalf;
          const sk = Math.max(-11, Math.min(11, vel * 0.42));
          marq.style.transform = "translate3d(" + mpos.toFixed(1) + "px,0,0) skewX(" + sk.toFixed(2) + "deg)";
        }
        raf(tick);
      }
      on(window, "resize", remeasure);
      on(window, "load", remeasure);
      window.setTimeout(remeasure, 400);
      tick();
    }

    /* ---------- nav + scroll progress ---------- */
    const nav = document.getElementById("nav");
    const bar = document.querySelector<HTMLElement>(".mn-v4 .scroll-progress span");
    on(
      window,
      "scroll",
      () => {
        const y = window.pageYOffset;
        if (nav) nav.classList.toggle("scrolled", y > 40);
        if (bar) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
        }
      },
      { passive: true }
    );

    /* ---------- custom cursor + magnetic ---------- */
    if (!touch && !reduce) {
      const cur = document.querySelector<HTMLElement>(".mn-v4 .cursor");
      if (cur) {
        let cx = 0,
          cy = 0,
          tx = 0,
          ty = 0,
          shown = false;
        on(window, "mousemove", (e) => {
          tx = (e as MouseEvent).clientX;
          ty = (e as MouseEvent).clientY;
          if (!shown) {
            shown = true;
            cur.classList.add("on");
          }
        });
        const loop = () => {
          cx += (tx - cx) * 0.2;
          cy += (ty - cy) * 0.2;
          cur.style.left = cx + "px";
          cur.style.top = cy + "px";
          raf(loop);
        };
        loop();
        document.querySelectorAll(".mn-v4 a,.mn-v4 button,.mn-v4 .magnetic,.mn-v4 .work,.mn-v4 .cap-card").forEach((el) => {
          on(el, "mouseenter", () => cur.classList.add("hot"));
          on(el, "mouseleave", () => cur.classList.remove("hot"));
        });
      }
      document.querySelectorAll<HTMLElement>(".mn-v4 .magnetic").forEach((el) => {
        on(el, "mousemove", (e) => {
          const r = el.getBoundingClientRect();
          const mx = (e as MouseEvent).clientX - r.left - r.width / 2;
          const my = (e as MouseEvent).clientY - r.top - r.height / 2;
          el.style.transform = "translate(" + mx * 0.3 + "px," + my * 0.4 + "px)";
        });
        on(el, "mouseleave", () => {
          el.style.transform = "";
        });
      });
    }

    /* ---------- teardown ---------- */
    return () => {
      killed = true;
      rafs.forEach((id) => cancelAnimationFrame(id));
      rafs.clear();
      offs.forEach((off) => off());
      window.clearTimeout(safety);
      document.body.style.overflow = "";
      root.classList.remove("force-show");
    };
  }, []);

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <span />
      </div>
      <div className="cursor" aria-hidden="true" />
    </>
  );
}
