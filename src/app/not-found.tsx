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
        .nf-mark {
          width: 88px; height: auto;
          color: var(--charcoal);
          margin-bottom: 40px;
          opacity: 0.85;
        }
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
        <svg
          className="nf-mark"
          viewBox="0 0 100 260"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
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
        <div className="nf-code">4<span className="accent">0</span>4</div>
        <h1 className="nf-title">ページが見つかりません。</h1>
        <p className="nf-lead">
          お探しのページは移動または削除された可能性があります。
          <br />
          メニューから他のページをご覧いただくか、お気軽にお問い合わせください。
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
