import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-light.png"
            alt="mixednuts Inc."
            className="footer-wordmark"
            width="210"
            height="40"
          />
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
        <span>© 2021–2026 mixednuts Inc. All rights reserved.</span>
      </div>
    </footer>
  );
}
