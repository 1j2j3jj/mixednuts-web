import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — ページが見つかりません",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <style>{`
        .nf-wrap {
          min-height: 80vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 120px 32px 80px;
          text-align: center;
          background: var(--off-white);
        }
        .nf-mark { width: 240px; height: auto; margin-bottom: 40px; opacity: 0.95; }
        .nf-code {
          font-family: var(--font-display);
          font-size: clamp(72px, 12vw, 140px);
          font-weight: 900;
          color: var(--charcoal);
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 8px;
        }
        .nf-code .accent { color: var(--cyan); }
        .nf-title {
          font-family: 'Noto Sans JP', sans-serif;
          font-size: clamp(20px, 3vw, 28px);
          font-weight: 900;
          color: var(--charcoal);
          margin-bottom: 16px;
          word-break: keep-all;
        }
        .nf-lead {
          font-size: 15px;
          line-height: 1.9;
          color: var(--gray-600);
          max-width: 520px;
          margin: 0 auto 40px;
        }
        .nf-links {
          display: flex; flex-wrap: wrap;
          gap: 12px; justify-content: center;
          margin-bottom: 16px;
        }
        .nf-link {
          padding: 12px 24px;
          border: 1px solid rgba(10,10,10,0.15);
          border-radius: 999px;
          font-size: 13px;
          color: var(--charcoal);
          text-decoration: none;
          transition: all 0.15s ease;
          background: var(--off-white);
        }
        .nf-link:hover { background: var(--charcoal); color: var(--off-white); border-color: var(--charcoal); }
        .nf-link.primary { background: var(--charcoal); color: var(--off-white); border-color: var(--charcoal); }
        .nf-link.primary:hover { background: var(--cyan); color: var(--charcoal); border-color: var(--cyan); }
      `}</style>

      <section className="nf-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="mixednuts Inc." className="nf-mark" width="240" height="45" />
        <div className="nf-code">4<span className="accent">0</span>4</div>
        <h1 className="nf-title">ページが見つかりません。</h1>
        <p className="nf-lead">
          このページは移動したか、存在しません。<br />
          下のリンクから目的のページを探してください。
        </p>
        <div className="nf-links">
          <Link href="/" className="nf-link primary">ホームに戻る</Link>
          <Link href="/works" className="nf-link">Works</Link>
          <Link href="/services" className="nf-link">Services</Link>
          <Link href="/contact" className="nf-link">Contact</Link>
        </div>
      </section>
    </>
  );
}
