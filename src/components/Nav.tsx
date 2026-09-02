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
        <img src="/logo-mark.png" alt="" width="13" height="36" />
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
