import Link from "next/link";

export default function Nav() {
  return (
    <>
      {/* Peanut mark rendered OUTSIDE .nav to escape mix-blend-difference.
          Brand colors (red cap + blue body) must stay original regardless of bg. */}
      <Link href="/" className="nav-mark" aria-label="mixednuts Inc. - Home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="mixednuts Inc." width="13" height="36" />
      </Link>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="logo" aria-label="mixednuts Inc. - Home">
            <span className="logo-text">mixednuts Inc.</span>
          </Link>
          <ul className="nav-links">
            <li><Link href="/about">About</Link></li>
            <li className="dropdown">
              <Link href="/services">Services <span className="caret">▾</span></Link>
              <div className="dropdown-menu">
                <Link href="/services/ai">AI Solutions<span className="sub">AIエージェント・自動化</span></Link>
                <Link href="/services/strategy">Strategy<span className="sub">事業戦略・FP&A</span></Link>
                <Link href="/services/marketing">Marketing<span className="sub">広告・グロース</span></Link>
              </div>
            </li>
            <li><Link href="/works">Works</Link></li>
            <li><Link href="/insights">Insights</Link></li>
            <li><Link href="/team">Team</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <Link href="/contact" className="nav-cta">Contact →</Link>
          </ul>
        </div>
      </nav>
    </>
  );
}
