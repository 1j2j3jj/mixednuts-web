import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h4>
            <svg
              className="footer-mark"
              viewBox="0 0 100 260"
              width="20"
              height="40"
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
            <span>mixed<span className="accent">nuts</span></span>
          </h4>
          <p>戦略 × AI × マーケティング。<br />3つの力で成長エンジンをつくる。</p>
          <p className="addr">
            ミックスナッツ株式会社<br />
            mixednuts Inc.
          </p>
        </div>
        <div>
          <h5>Services</h5>
          <ul>
            <li><Link href="/services/ai">AI Solutions</Link></li>
            <li><Link href="/services/strategy">Strategy</Link></li>
            <li><Link href="/services/marketing">Marketing</Link></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/team">Team</Link></li>
            <li><Link href="/careers">Careers</Link></li>
          </ul>
        </div>
        <div>
          <h5>Resources</h5>
          <ul>
            <li><Link href="/works">Works</Link></li>
            <li><Link href="/insights">Insights</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h5>Legal</h5>
          <ul>
            <li><Link href="/privacy">プライバシー</Link></li>
            <li><Link href="/legal">利用規約</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 mixednuts Inc. All rights reserved.</span>
        <span>Built with AI, crafted with care.</span>
      </div>
    </footer>
  );
}
