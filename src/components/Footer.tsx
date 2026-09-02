import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer" data-nav="dark">
      <div>
        <b>ミックスナッツ株式会社 / mixednuts Inc.</b>
        東京 · since 2021 · Strategy × AI × Marketing
      </div>
      <div>© 2021–2026 mixednuts Inc. All rights reserved. · <Link href="/legal">Legal</Link> · <Link href="/privacy">Privacy</Link></div>
      <div className="bars" aria-hidden="true"><i /><i /><i /></div>
    </footer>
  );
}
