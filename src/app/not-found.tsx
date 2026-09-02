import Link from "next/link";
import type { Metadata } from "next";
import "./system-v6.css";

export const metadata: Metadata = { title: "404 — ページが見つかりません", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="mn-v6 mn-system-v6">
      <section className="minimal-page"><div className="minimal-page-inner"><p className="v6-kicker">Scene Missing</p><div className="v6-en-display minimal-code">4<span className="v6-accent">0</span>4</div><h1 className="v6-jp-heading">ページが見つかりません。</h1><p>このページは移動したか、存在しません。下のリンクから目的のページを探してください。</p><div className="v6-button-row"><Link href="/" className="v6-button v6-button--paper">ホームに戻る</Link><Link href="/works" className="v6-button v6-button--outline">Works</Link><Link href="/contact" className="v6-button v6-button--outline">Contact</Link></div></div></section>
    </div>
  );
}
