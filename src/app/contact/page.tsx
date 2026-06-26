import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — まずは、話しましょう",
  description: "初回無料相談（60分）で、貴社の課題をヒアリングし最適なアプローチをご提案します。24時間以内にご返信します。",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      {/* ===== SUBHERO ===== */}
      <header className="subhero">
        <canvas
          className="hero-fx fxgen"
          data-count="60"
          data-interactive
          aria-hidden="true"
        />
        <div className="hero-orb o1" data-parallax="0.34" data-mouse="0.05" aria-hidden="true" />
        <div className="hero-orb o2" data-parallax="0.22" data-mouse="0.035" aria-hidden="true" />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap subhero-inner">
          <div className="crumb reveal">
            <Link href="/">Home</Link> / Contact
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s Talk
          </div>
          <h1 className="big-title-jp reveal">
            まずは、<em>話しましょう</em>。
          </h1>
          <p className="subhero-lead reveal">
            初回無料相談（60分）で、貴社の課題をヒアリングし、最適なアプローチをご提案します。24時間以内にご返信します。売り込みではなく、対話からはじめましょう。
          </p>
        </div>
      </header>

      {/* ===== FORM + INFO ===== */}
      <section className="sec white">
        <div className="wrap contact-grid">
          <div className="reveal">
            <ContactForm />
          </div>

          <aside className="info-card reveal">
            <div className="row">
              <div className="l">無料相談</div>
              <div className="v cy">60分 / オンライン</div>
            </div>
            <div className="row">
              <div className="l">Email</div>
              <div className="v">
                <a href="mailto:hello@mixednuts-inc.com">hello@mixednuts-inc.com</a>
                <p style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7 }}>
                  通常24時間以内に返信いたします（土日祝は翌営業日）。
                </p>
              </div>
            </div>
            <div className="row">
              <div className="l">所在地</div>
              <div className="v" style={{ fontSize: 16, lineHeight: 1.7 }}>
                〒107-0062<br />
                東京都港区南青山3-8-40<br />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>※ 訪問は事前予約制です</span>
              </div>
            </div>
            <div className="row">
              <div className="l">返信</div>
              <div className="v">1営業日以内</div>
            </div>
            <div className="row">
              <div className="l">対応領域</div>
              <div className="v">戦略 × AI × マーケ</div>
            </div>
            <div className="row">
              <div className="l">お役立ちリンク</div>
              <div className="v" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <Link
                  href="/services"
                  style={{ padding: "8px 14px", background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 999, fontSize: 13 }}
                >
                  サービス一覧
                </Link>
                <Link
                  href="/works"
                  style={{ padding: "8px 14px", background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 999, fontSize: 13 }}
                >
                  実績・事例
                </Link>
                <Link
                  href="/team"
                  style={{ padding: "8px 14px", background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 999, fontSize: 13 }}
                >
                  メンバー紹介
                </Link>
                <Link
                  href="/insights"
                  style={{ padding: "8px 14px", background: "rgba(255,255,255,.08)", color: "#fff", borderRadius: 999, fontSize: 13 }}
                >
                  Insights
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ===== FLOW ===== */}
      <section className="sec" style={{ background: "#0A0A0A" }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">
              <i className="pulse" /> How It Works
            </div>
            <h2 className="title" style={{ marginTop: 16, color: "#fff" }}>
              相談<em>フロー</em>。
            </h2>
          </div>
          <div className="proc">
            <div className="proc-step reveal">
              <div className="proc-n">1</div>
              <h4>お問い合わせ</h4>
              <p>フォームまたはメールにてご連絡ください。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">2</div>
              <h4>初回ヒアリング（60分・無料）</h4>
              <p>課題・目標・時間軸をオンラインでお聞きします。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">3</div>
              <h4>提案・見積もり</h4>
              <p>最適なアプローチと費用感をご提案します。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">4</div>
              <h4>契約・キックオフ</h4>
              <p>業務委託契約締結後、即日着手可能です。</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
