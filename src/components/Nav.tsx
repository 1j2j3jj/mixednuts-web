"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/works", label: "Works" },
  { href: "/insights", label: "Insights" },
  { href: "/team", label: "Team" },
];

export default function Nav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Scrolled backdrop: the nav is transparent by design, so once the page scrolls we
  // paint a bar in whatever colour sits underneath it (sampled at the bar's bottom edge).
  // Keeps the adaptive light/dark theme intact and stops body copy colliding with the brand.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("nav.nav");
    if (!nav) return;
    let frame = 0;
    // Only an (almost) opaque colour counts — translucent tint layers (e.g. rgba(17,17,20,.08)) are skipped.
    const isOpaque = (color: string) => {
      if (!color || color === "transparent") return false;
      const match = /^rgba?\(([^)]+)\)$/.exec(color);
      if (!match) return true;
      const parts = match[1].split(/[\s,\/]+/).filter(Boolean);
      const alpha = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;
      return Number.isNaN(alpha) || alpha >= 0.85;
    };
    const sample = () => {
      frame = 0;
      nav.dataset.scrolled = window.scrollY > 12 ? "1" : "0";
      const rect = nav.getBoundingClientRect();
      const y = Math.max(1, Math.round(rect.bottom - 1));
      let element = document.elementFromPoint(Math.round(window.innerWidth * 0.5), y) as HTMLElement | null;
      while (element && element !== document.documentElement) {
        const color = getComputedStyle(element).backgroundColor;
        if (isOpaque(color)) { nav.style.setProperty("--nav-bg", color); return; }
        element = element.parentElement;
      }
      nav.style.setProperty("--nav-bg", getComputedStyle(document.body).backgroundColor);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sample); };
    sample();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const interval = window.setInterval(schedule, 250); // pinned/scrubbed scenes change colour without a scroll event
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.clearInterval(interval);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    firstLinkRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <Link href="/" className="mark" aria-label="mixednuts Inc. - Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" aria-hidden="true" width="13" height="36" />
      </Link>
      <nav className="nav" aria-label="Primary navigation" data-theme="light">
        <div className="nav-inner">
          <Link href="/" className="brand" aria-label="mixednuts Inc. - Home">mixednuts Inc.</Link>

          <div className="nav-desktop">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
            <Link href="/login" className="nav-login">Login</Link>
            <Link href="/contact" className="cta">Contact</Link>
          </div>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="nav-drawer"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>

        <div
          id="nav-drawer"
          className={`nav-drawer${open ? " is-open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          hidden={!open}
        >
          <div className="nav-drawer-links">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                ref={index === 0 ? firstLinkRef : undefined}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/login">Login</Link>
            <Link href="/contact" className="nav-drawer-cta">Contact</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
