import Link from "next/link";
import type { Metadata } from "next";
import V6PageMotion from "@/components/V6PageMotion";
import "./v6-not-found.css";
import "./v6-not-found-fixes.css";

export const metadata: Metadata = { title: { absolute: "ページが見つかりません | mixednuts Inc." }, robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <main className="not-found-v6" data-nav="dark" data-v6-page>
      <V6PageMotion />
      <p>Page not found / Error</p>
      <div className="not-found-v6__code" aria-hidden="true">404</div>
      <h1>ページが見つかりません。</h1>
      <p className="not-found-v6__lead">このページは移動したか、存在しません。下のリンクから目的のページを探してください。</p>
      <nav aria-label="404ページの案内"><Link href="/">ホームに戻る</Link><Link href="/works">Works</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link></nav>
    </main>
  );
}
