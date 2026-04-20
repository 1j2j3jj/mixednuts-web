import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — まずは、話しましょう",
  description: "初回無料相談（60分）で、貴社の課題をヒアリングし最適なアプローチをご提案します。24時間以内にご返信します。",
};

export default function ContactPage() {
  return (
    <>
      <style>{`
        .contact-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
        .contact-form { background: #fff; border: 1px solid #E5E7EB; border-radius: 20px; padding: 48px; }
        .contact-form h3 { font-family: var(--font-serif-jp); font-size: 24px; margin-bottom: 24px; color: var(--navy); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 12px; color: #4B5563; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em; }
        .form-group label .req { color: var(--burgundy); }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%; padding: 12px 14px;
          border: 1px solid #D1D5DB; border-radius: 8px;
          font-size: 14px; font-family: inherit;
          transition: all 0.2s; background: #fff; color: #1A1A1A;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,180,216,0.1);
        }
        .form-group textarea { resize: vertical; min-height: 140px; }
        .form-actions { margin-top: 32px; }
        .form-submit { width: 100%; justify-content: center; background: var(--navy); color: #fff; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .form-submit:hover { background: var(--cyan); color: var(--navy); transform: translateY(-2px); }
        .form-note { font-size: 11px; color: #9CA3AF; margin-top: 16px; line-height: 1.7; }
        .contact-info { padding: 48px 0; }
        .contact-info h3 { font-family: var(--font-serif-jp); font-size: 24px; margin-bottom: 24px; color: var(--navy); }
        .info-block { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E5E7EB; }
        .info-block:last-child { border-bottom: none; }
        .info-block-label { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
        .info-block-value { font-size: 14px; color: #1A1A1A; line-height: 1.7; }
        .info-block-value a { color: var(--navy); text-decoration: underline; }
        .quick-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .quick-link { padding: 8px 14px; background: #F9FAFB; color: #4B5563; border-radius: 999px; font-size: 12px; text-decoration: none; transition: all 0.2s; }
        .quick-link:hover { background: var(--navy); color: #fff; }
        .flow-steps { display: flex; flex-direction: column; gap: 20px; margin-top: 32px; }
        .flow-step { display: flex; gap: 16px; align-items: flex-start; }
        .flow-num { width: 32px; height: 32px; border-radius: 50%; background: var(--navy); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
        .flow-step-text h4 { font-size: 15px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
        .flow-step-text p { font-size: 13px; color: #4B5563; line-height: 1.6; }
        @media (max-width: 900px) {
          .contact-wrap { grid-template-columns: 1fr; gap: 32px; }
          .contact-form { padding: 32px 24px; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / Contact</div>
          <div className="page-hero-badge">Let&apos;s Talk</div>
          <h1><span className="accent">まずは、話しましょう。</span></h1>
          <p className="lead">
            初回無料相談（60分）で、貴社の課題をヒアリングし、最適なアプローチをご提案します。24時間以内にご返信します。売り込みではなく、対話からはじめましょう。
          </p>
        </div>
      </section>

      <section className="section" style={{background: '#F9FAFB'}}>
        <div className="section-inner">
          <div className="contact-wrap">

            <div className="contact-form">
              <h3>お問い合わせフォーム</h3>
              <ContactForm />
            </div>

            <div className="contact-info">
              <h3>その他のお問い合わせ方法</h3>

              <div className="info-block">
                <div className="info-block-label">Email</div>
                <div className="info-block-value">
                  <a href="mailto:hello@mixednuts-inc.com">hello@mixednuts-inc.com</a><br />
                  通常24時間以内に返信いたします（土日祝は翌営業日）。
                </div>
              </div>

              <div className="info-block">
                <div className="info-block-label">所在地</div>
                <div className="info-block-value">
                  〒107-0062<br />
                  東京都港区南青山3-8-40<br />
                  ※ 訪問は事前予約制です
                </div>
              </div>

              <div className="info-block">
                <div className="info-block-label">お役立ちリンク</div>
                <div className="quick-links">
                  <Link href="/services" className="quick-link">サービス一覧</Link>
                  <Link href="/works" className="quick-link">実績・事例</Link>
                  <Link href="/team" className="quick-link">メンバー紹介</Link>
                  <Link href="/insights" className="quick-link">Insights</Link>
                </div>
              </div>

              <div className="info-block">
                <div className="info-block-label">相談フロー</div>
                <div className="flow-steps">
                  <div className="flow-step">
                    <div className="flow-num">1</div>
                    <div className="flow-step-text">
                      <h4>お問い合わせ</h4>
                      <p>フォームまたはメールにてご連絡ください。</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="flow-num">2</div>
                    <div className="flow-step-text">
                      <h4>初回ヒアリング（60分・無料）</h4>
                      <p>課題・目標・時間軸をオンラインでお聞きします。</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="flow-num">3</div>
                    <div className="flow-step-text">
                      <h4>提案・見積もり</h4>
                      <p>最適なアプローチと費用感をご提案します。</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="flow-num">4</div>
                    <div className="flow-step-text">
                      <h4>契約・キックオフ</h4>
                      <p>業務委託契約締結後、即日着手可能です。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
