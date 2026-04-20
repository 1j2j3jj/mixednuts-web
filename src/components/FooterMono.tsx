import Link from "next/link";

export default function FooterMono() {
  return (
    <footer className="footer-v4">
      <div className="footer-v4-inner">
        <div className="brand">
          <h4>mixed<span className="em">nuts</span></h4>
          <p>Strategy × AI × Marketing.<br />3つの力を混ぜ合わせ、事業の成長エンジンを実装するAI-firstコンサルティングファーム。</p>
        </div>
        <div>
          <h5>Services</h5>
          <ul>
            <li><Link href="/services/strategy">Strategy</Link></li>
            <li><Link href="/services/ai">AI</Link></li>
            <li><Link href="/services/marketing">Marketing</Link></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/team">Team</Link></li>
            <li><Link href="/works">Works</Link></li>
            <li><Link href="/insights">Insights</Link></li>
            <li><Link href="/careers">Careers</Link></li>
          </ul>
        </div>
        <div>
          <h5>Connect</h5>
          <ul>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/legal">Legal</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-v4-bottom">
        <span>© 2026 Mixed Nuts Inc.</span>
        <span>Built with AI, crafted with care.</span>
      </div>
    </footer>
  );
}
