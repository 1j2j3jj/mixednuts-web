"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * v4 marketing nav — dark glass bar with dropdown + mobile drawer.
 * Scroll-state (.scrolled) and the mobile toggle are driven by SiteMotion.
 * Active section is derived from the current pathname.
 */
export default function NavV4() {
  const pathname = usePathname() || "/";
  const is = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const cls = (active: boolean) => (active ? "active" : undefined);

  return (
    <nav className="nav" id="nav">
      <Link href="/" className="nav-brand" aria-label="mixednuts Inc. — Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="nav-mark" width={13} height={36} />
        <span>
          mixednuts<span className="dim">Inc.</span>
        </span>
      </Link>
      <button className="nav-toggle" aria-label="Menu" type="button">
        <span />
        <span />
        <span />
      </button>
      <div className="nav-links">
        <Link href="/about" className={cls(is("/about"))}>
          About
        </Link>
        <div className="nav-drop">
          <Link href="/services" className={`nav-drop-t ${is("/services") ? "active" : ""}`.trim()}>
            Services <i>▾</i>
          </Link>
          <div className="nav-menu">
            <Link href="/services/ai">
              <strong>AI Solutions</strong>
              <span>AIエージェント・自動化</span>
            </Link>
            <Link href="/services/strategy">
              <strong>Strategy</strong>
              <span>事業戦略・FP&amp;A</span>
            </Link>
            <Link href="/services/marketing">
              <strong>Marketing</strong>
              <span>広告・グロース</span>
            </Link>
          </div>
        </div>
        <Link href="/works" className={cls(is("/works"))}>
          Works
        </Link>
        <Link href="/insights" className={cls(is("/insights"))}>
          Insights
        </Link>
        <Link href="/team" className={cls(is("/team"))}>
          Team
        </Link>
        <Link href="/careers" className={cls(is("/careers"))}>
          Careers
        </Link>
        <Link href="/login" className="nav-login">
          Login
        </Link>
        <Link href="/contact" className="nav-cta">
          <span>Contact</span>
          <i>→</i>
        </Link>
      </div>
    </nav>
  );
}
