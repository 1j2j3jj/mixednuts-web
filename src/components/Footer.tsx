import Link from "next/link";

const footerGroups = [
  {
    title: "Practice",
    links: [
      ["Strategy", "/services/strategy"],
      ["AI Solutions", "/services/ai"],
      ["Marketing", "/services/marketing"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Works", "/works"],
      ["Team", "/team"],
      ["Careers", "/careers"],
    ],
  },
  {
    title: "Connect",
    links: [
      ["Insights", "/insights"],
      ["Contact", "/contact"],
      ["Login", "/login"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="mixednuts Inc." className="footer-wordmark" width="210" height="40" />
          <p>戦略 × AI × マーケティング。<br />3つの力で成長エンジンをつくる。</p>
        </div>
        {footerGroups.map((group) => (
          <div className="footer-group" key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.links.map(([label, href]) => (
                <li key={href}><Link href={href}>{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© 2021–2026 mixednuts Inc. All rights reserved.</span>
        <div><Link href="/privacy">Privacy</Link><Link href="/legal">Legal</Link></div>
      </div>
    </footer>
  );
}
