import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Services — Strategy × AI × Marketing",
  description: "戦略コンサルティング・AI実装支援・マーケティング成長支援の3軸を一気通貫で提供。",
};

const visualConfigs = {
  strategy: { bg: "linear-gradient(135deg, var(--charcoal) 0%, var(--charcoal-soft) 100%)", label: "STRATEGY" },
  ai: { bg: "linear-gradient(135deg, var(--charcoal-soft) 0%, var(--charcoal) 100%)", label: "AI" },
  marketing: { bg: "linear-gradient(135deg, var(--charcoal) 0%, #141414 100%)", label: "GROWTH" },
};

export default function ServicesPage() {
  return (
    <>
      <style>{`
        .service-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; margin-bottom: 96px; }
        .service-detail:last-child { margin-bottom: 0; }
        .service-visual { aspect-ratio: 4/3; border-radius: 20px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 48px; }
        .service-visual::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 32px 32px; mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%); -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%); }
        .service-visual-inner { position: relative; z-index: 2; text-align: center; }
        .service-visual-icon { font-family: var(--font-display); font-size: 120px; font-weight: 900; color: var(--cyan); line-height: 1; margin-bottom: 24px; letter-spacing: -0.03em; }
        .service-visual-label { color: var(--off-white); font-family: var(--font-display); font-size: 26px; font-weight: 900; letter-spacing: 0.05em; }
        .service-visual-sub { color: rgba(245,241,232,0.85); font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 12px; font-weight: 600; }
        .service-text .tag { display: inline-block; color: var(--cyan); font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px; }
        .service-text h2 { font-family: 'Noto Sans JP', sans-serif; font-size: 28px; font-weight: 900; color: var(--charcoal); margin-bottom: 20px; line-height: 1.4; word-break: keep-all; }
        .service-text p { color: var(--charcoal); font-size: 15px; line-height: 1.9; margin-bottom: 20px; }
        .service-capabilities { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 24px 0; padding: 0; }
        .service-capabilities li { padding: 10px 14px; background: var(--off-white-alt); border: 1px solid rgba(10,10,10,0.08); border-radius: 4px; font-size: 13px; color: var(--charcoal); font-weight: 500; }
        .integration-section { background: var(--navy); color: #fff; padding: 120px 32px; position: relative; overflow: hidden; }
        .integration-section::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 30% 50%, rgba(0,180,216,0.1) 0%, transparent 50%); }
        .integration-inner { max-width: 1280px; margin: 0 auto; position: relative; z-index: 2; }
        .integration-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px; }
        .integration-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; }
        .integration-card h3 { font-family: var(--font-serif-jp); font-size: 20px; font-weight: 700; margin-bottom: 16px; }
        .integration-card p { font-size: 14px; color: rgba(255,255,255,0.75); line-height: 1.8; }
        .integration-card .arrow { color: var(--cyan); font-size: 28px; margin-bottom: 16px; }
        @media (max-width: 900px) {
          .service-detail { grid-template-columns: 1fr; gap: 32px; }
          .service-capabilities { grid-template-columns: 1fr; }
          .integration-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / Services</div>
          <div className="page-hero-badge">Our Services</div>
          <h1>3つの専門性を、<br /><span className="accent">1つのチームで</span>。</h1>
          <p className="lead">
            戦略コンサルティング、AI実装支援、グロースマーケティング。多くのファームが「どれか一つ」しか提供できない領域を、私たちは統合して届けます。断絶させず、有機的に繋ぐのが mixednuts の強みです。
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          {services.map((service, i) => {
            const vc = visualConfigs[service.slug];
            const isEven = i % 2 === 1;
            const num = String(i + 1).padStart(2, "0");
            return (
              <div key={service.slug} className="service-detail">
                <div className="service-visual" style={{background: vc.bg, order: isEven ? 1 : 0}}>
                  <div className="service-visual-inner">
                    <div className="service-visual-icon">{num}</div>
                    <div className="service-visual-label">{vc.label}</div>
                    <div className="service-visual-sub">{service.tagline}</div>
                  </div>
                </div>
                <div className="service-text" style={{order: isEven ? 2 : 0}}>
                  <span className="tag">{num} / {service.label}</span>
                  <h2>{service.tagline}</h2>
                  <p>{service.description}</p>
                  <ul className="service-capabilities">
                    {service.capabilities.map((cap) => (
                      <li key={cap}>{cap}</li>
                    ))}
                  </ul>
                  <Link href={`/services/${service.slug}`} className="btn-dark">
                    {service.label} を詳しく見る →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Integration Section */}
      <section className="integration-section">
        <div className="integration-inner">
          <span className="section-label" style={{color: 'var(--cyan)'}}>Why Integration Matters</span>
          <h2 className="section-title" style={{color: '#fff'}}>なぜ「統合」が重要なのか。</h2>
          <p className="section-lead" style={{color: 'rgba(255,255,255,0.75)'}}>3つを別々に依頼しても、断絶が生まれます。mixednuts は、3つが常に連動する設計で動きます。</p>
          <div className="integration-grid">
            <div className="integration-card">
              <div className="arrow">→</div>
              <h3>戦略が AI を加速する</h3>
              <p>「どのプロセスを自動化すべきか」の判断は戦略思考が必要です。戦略家とAIエンジニアが同じチームにいるから、正しいAI投資ができます。</p>
            </div>
            <div className="integration-card">
              <div className="arrow">→</div>
              <h3>AI がマーケを進化させる</h3>
              <p>クリエイティブ生成、入札最適化、データ分析。AIなしのマーケティングは2024年以前の話。AI前提でマーケを設計します。</p>
            </div>
            <div className="integration-card">
              <div className="arrow">→</div>
              <h3>マーケが戦略を検証する</h3>
              <p>顧客の反応は最良の戦略検証です。マーケの実行データを戦略のループに取り込み、仮説検証を高速で回します。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <h2>どのサービスが<br />最適か、一緒に考えましょう。</h2>
          <p>まずは課題をお聞かせください。60分の無料相談で、最適なアプローチをご提案します。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
