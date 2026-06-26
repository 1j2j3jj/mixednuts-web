import Link from "next/link";

/**
 * v4 marketing footer — dark, 5-column (brand + 4 link groups).
 */
export default function FooterV4() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="mixednuts Inc." className="footer-mark" width={210} height={40} />
          <p>
            戦略 × AI × マーケティング。
            <br />
            3つの力で成長エンジンをつくる。
          </p>
          <p className="addr">ミックスナッツ株式会社 · mixednuts Inc.</p>
        </div>
        <div className="footer-col">
          <h5>Services</h5>
          <Link href="/services/ai">AI Solutions</Link>
          <Link href="/services/strategy">Strategy</Link>
          <Link href="/services/marketing">Marketing</Link>
        </div>
        <div className="footer-col">
          <h5>Company</h5>
          <Link href="/about">About</Link>
          <Link href="/team">Team</Link>
          <Link href="/careers">Careers</Link>
        </div>
        <div className="footer-col">
          <h5>Resources</h5>
          <Link href="/works">Works</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div className="footer-col">
          <h5>Legal</h5>
          <Link href="/privacy">プライバシー</Link>
          <Link href="/legal">利用規約</Link>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© 2021–2026 mixednuts Inc. All rights reserved.</span>
        <span>Tokyo, Japan</span>
      </div>
    </footer>
  );
}
