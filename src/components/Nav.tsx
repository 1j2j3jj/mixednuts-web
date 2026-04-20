import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo" aria-label="mixednuts Inc. - Home">
          <svg
            className="logo-mark"
            viewBox="0 0 100 260"
            width="22"
            height="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M 50 5 Q 65 10 60 30 Q 50 45 40 30 Q 35 15 50 5 Z" fill="currentColor" stroke="none" />
            <ellipse cx="50" cy="95" rx="30" ry="40" />
            <ellipse cx="50" cy="175" rx="36" ry="45" />
            <line x1="20" y1="95" x2="80" y2="95" />
            <line x1="18" y1="130" x2="82" y2="130" />
            <line x1="14" y1="175" x2="86" y2="175" />
            <line x1="16" y1="210" x2="84" y2="210" />
            <line x1="50" y1="55" x2="50" y2="220" />
          </svg>
          <span className="logo-text">mixed<span className="accent">nuts</span></span>
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
  );
}
