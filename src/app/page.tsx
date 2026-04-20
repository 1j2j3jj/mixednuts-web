import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "mixednuts — 戦略 × AI × マーケティング",
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
};

export default function HomePage() {
  return (
    <>
      <style>{`
        .home-body { --off-white: #F5F1E8; --charcoal: #0A0A0A; --cyan-bright: #00D9FF; }

        /* HERO */
        .home-hero {
          min-height: 100vh;
          background: var(--off-white);
          position: relative; overflow: hidden;
          padding: 180px 40px 80px;
          display: flex; flex-direction: column; justify-content: center;
        }
        .hero-badge-top {
          position: absolute; top: 120px; right: 40px;
          font-family: var(--font-inter);
          font-size: 11px; letter-spacing: 0.25em;
          color: var(--charcoal); text-transform: uppercase;
          display: flex; align-items: center; gap: 8px;
        }
        .hero-badge-top::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: var(--cyan);
          animation: home-pulse 2s infinite;
          box-shadow: 0 0 10px rgba(0,217,255,0.8);
        }
        @keyframes home-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }

        .hero-mega {
          font-family: var(--font-archivo), var(--font-sans-jp);
          font-weight: 900;
          font-size: clamp(72px, 14vw, 220px);
          line-height: 0.85; letter-spacing: -0.05em;
          color: var(--charcoal); text-transform: uppercase;
        }
        .hero-mega .line { display: block; }
        .hero-mega .masked {
          background-image: url("/images/generated/hero_mask.jpg");
          background-size: cover; background-position: center;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .hero-mega .italic-dot {
          font-family: var(--font-playfair), serif;
          font-style: italic; font-weight: 900;
          text-transform: lowercase;
          color: var(--cyan);
        }
        .hero-sub {
          margin-top: 48px;
          display: flex; justify-content: space-between; align-items: flex-end;
          gap: 40px; flex-wrap: wrap;
        }
        .hero-sub-left { max-width: 560px; }
        .hero-tagline {
          font-family: var(--font-playfair), serif;
          font-size: 20px; font-style: italic;
          color: var(--charcoal);
          margin-bottom: 16px; line-height: 1.4;
        }
        .hero-lead {
          font-size: 15px; color: #4B5563; line-height: 1.9;
        }
        .hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-mega {
          background: var(--charcoal); color: #fff;
          padding: 18px 32px; border-radius: 999px;
          font-weight: 600; font-size: 14px; letter-spacing: 0.05em;
          display: inline-flex; align-items: center; gap: 10px;
          transition: all 0.3s; text-transform: uppercase;
          text-decoration: none;
        }
        .btn-mega:hover { background: var(--cyan); color: var(--charcoal); transform: translateY(-2px); }
        .btn-mega .arrow {
          width: 28px; height: 28px; background: #fff; color: var(--charcoal);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 14px; transition: transform 0.3s;
        }
        .btn-mega:hover .arrow { transform: rotate(-45deg); background: var(--charcoal); color: var(--cyan); }
        .btn-ghost-mega {
          color: var(--charcoal);
          padding: 18px 32px; border-radius: 999px;
          border: 1px solid var(--charcoal);
          font-weight: 600; font-size: 14px;
          letter-spacing: 0.05em; text-transform: uppercase;
          transition: all 0.3s; text-decoration: none;
          display: inline-flex; align-items: center;
        }
        .btn-ghost-mega:hover { background: var(--charcoal); color: #fff; }

        /* MARQUEE */
        .marquee {
          background: var(--charcoal); color: #fff;
          padding: 28px 0; overflow: hidden; white-space: nowrap;
          border-top: 1px solid rgba(255,255,255,0.1);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .marquee-inner {
          display: inline-flex; gap: 80px;
          animation: marquee 50s linear infinite;
          padding-right: 80px;
        }
        .marquee-item {
          font-family: var(--font-archivo), sans-serif;
          font-size: 38px; font-weight: 900;
          letter-spacing: -0.02em; text-transform: uppercase;
          display: inline-flex; align-items: center; gap: 24px;
        }
        .marquee-item .dot {
          width: 10px; height: 10px;
          background: var(--cyan); border-radius: 50%;
          display: inline-block;
        }
        .marquee-item .accent {
          color: var(--cyan); font-style: italic;
          font-family: var(--font-playfair), serif;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        /* CAPABILITIES */
        .capabilities { padding: 160px 40px; background: #fff; }
        .cap-inner { max-width: 1600px; margin: 0 auto; }
        .cap-header {
          display: grid; grid-template-columns: 1fr 1.5fr;
          gap: 80px; align-items: end; margin-bottom: 120px;
        }
        .cap-label {
          font-family: var(--font-inter);
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.25em; color: var(--cyan);
          text-transform: uppercase; margin-bottom: 24px;
          display: inline-flex; align-items: center; gap: 10px;
        }
        .cap-label::before { content: '—'; }
        .cap-title {
          font-family: var(--font-archivo), var(--font-sans-jp);
          font-size: clamp(48px, 7vw, 110px);
          font-weight: 900; line-height: 0.9;
          letter-spacing: -0.04em; color: var(--charcoal);
          text-transform: uppercase;
        }
        .cap-title .italic {
          font-family: var(--font-playfair), serif;
          font-style: italic; font-weight: 900;
          text-transform: lowercase; letter-spacing: -0.02em;
        }
        .cap-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0; border-top: 1px solid var(--charcoal);
        }
        .cap-card {
          padding: 48px 32px 48px 0;
          border-right: 1px solid rgba(0,0,0,0.1);
          position: relative; transition: all 0.3s;
          cursor: pointer; text-decoration: none; color: inherit;
          display: block;
        }
        .cap-card:last-child { border-right: none; padding-right: 0; }
        .cap-card:hover { padding-left: 8px; }
        .cap-num {
          font-family: var(--font-archivo), sans-serif;
          font-size: 14px; font-weight: 900;
          color: #9CA3AF; margin-bottom: 40px;
          letter-spacing: 0.1em;
        }
        .cap-card h3 {
          font-family: var(--font-archivo), var(--font-sans-jp);
          font-size: 44px; font-weight: 900;
          line-height: 1; letter-spacing: -0.03em;
          margin-bottom: 16px; color: var(--charcoal);
        }
        .cap-card h3 .italic {
          font-family: var(--font-playfair), serif;
          font-style: italic;
        }
        .cap-card .jp {
          font-family: var(--font-serif-jp);
          font-size: 18px; font-weight: 700;
          color: var(--charcoal);
          margin-bottom: 20px; display: block;
        }
        .cap-card p {
          font-size: 13px; line-height: 1.9;
          color: #4B5563; margin-bottom: 32px;
        }
        .cap-link {
          display: inline-flex; align-items: center; gap: 12px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--charcoal);
        }
        .cap-link::after {
          content: '→'; transition: transform 0.3s;
        }
        .cap-card:hover .cap-link::after { transform: translateX(8px); }

        /* MANIFESTO */
        .manifesto {
          padding: 200px 40px;
          background:
            linear-gradient(180deg, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.95) 100%),
            url("/images/generated/manifesto_bg.jpg");
          background-size: cover; background-position: center;
          color: #fff; position: relative; overflow: hidden;
        }
        .manifesto::before {
          content: ''; position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(0,217,255,0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(212,165,116,0.12) 0%, transparent 50%);
          pointer-events: none;
        }
        .manifesto-inner { max-width: 1400px; margin: 0 auto; position: relative; z-index: 2; }
        .manifesto-label {
          font-family: var(--font-inter);
          font-size: 12px; letter-spacing: 0.25em;
          color: var(--cyan); text-transform: uppercase;
          margin-bottom: 48px; font-weight: 700;
        }
        .manifesto-text {
          font-family: var(--font-serif-jp);
          font-size: clamp(32px, 4.5vw, 68px);
          line-height: 1.35; font-weight: 500;
          letter-spacing: -0.01em;
        }
        .manifesto-text .em {
          color: var(--cyan);
          font-family: var(--font-playfair), serif;
          font-style: italic; font-weight: 700;
        }
        .manifesto-sig {
          margin-top: 80px;
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 48px;
          border-top: 1px solid rgba(255,255,255,0.15);
          font-family: var(--font-inter);
          font-size: 12px; letter-spacing: 0.15em;
          color: rgba(255,255,255,0.5); text-transform: uppercase;
        }

        /* STATS */
        .stats-section { padding: 160px 40px; background: var(--off-white); }
        .stats-inner { max-width: 1600px; margin: 0 auto; }
        .stats-head { text-align: center; margin-bottom: 120px; }
        .stats-head h2 {
          font-family: var(--font-archivo), var(--font-sans-jp);
          font-size: clamp(40px, 6vw, 88px);
          font-weight: 900; line-height: 1;
          letter-spacing: -0.03em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .stats-head h2 .italic {
          font-family: var(--font-playfair), serif;
          font-style: italic; font-weight: 900;
          text-transform: lowercase;
        }
        .stats-head p { color: #4B5563; font-size: 15px; }

        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
        }
        .stat-item {
          padding: 48px 32px;
          border-left: 1px solid rgba(0,0,0,0.1);
          text-align: left;
        }
        .stat-item:first-child { border-left: none; }
        .stat-num {
          font-family: var(--font-archivo), sans-serif;
          font-size: clamp(72px, 10vw, 140px);
          font-weight: 900; line-height: 0.9;
          letter-spacing: -0.05em;
          color: var(--charcoal);
          margin-bottom: 16px;
        }
        .stat-num .unit {
          font-size: 0.3em;
          color: #9CA3AF; font-weight: 900;
          margin-left: 4px;
        }
        .stat-label {
          font-size: 12px; color: #4B5563;
          letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 600; max-width: 200px; line-height: 1.5;
        }

        /* CASES */
        .home-cases { padding: 160px 40px; background: #fff; }
        .home-cases-inner { max-width: 1600px; margin: 0 auto; }
        .home-cases-head {
          display: grid; grid-template-columns: 1fr auto;
          gap: 40px; align-items: end; margin-bottom: 80px;
        }
        .home-cases-head h2 {
          font-family: var(--font-archivo), var(--font-sans-jp);
          font-size: clamp(40px, 6vw, 88px);
          font-weight: 900; line-height: 0.95;
          letter-spacing: -0.03em; text-transform: uppercase;
        }
        .home-cases-head h2 .italic {
          font-family: var(--font-playfair), serif;
          font-style: italic; font-weight: 900;
          text-transform: lowercase;
        }
        .home-cases-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-template-rows: 540px 440px;
          gap: 24px;
        }
        .case-item {
          text-decoration: none; color: inherit;
          display: block; position: relative; overflow: hidden;
          border-radius: 20px; transition: all 0.4s;
        }
        .case-item:hover { transform: translateY(-4px); }
        .case-item.big { grid-column: span 7; grid-row: 1; }
        .case-item.med { grid-column: span 5; grid-row: 1; }
        .case-item.sm { grid-column: span 4; grid-row: 2; }

        .case-visual {
          height: 100%; width: 100%;
          position: relative; overflow: hidden;
          border-radius: 20px;
        }
        .case-bg-ai {
          background:
            linear-gradient(135deg, rgba(0,217,255,0.3) 0%, rgba(11,22,52,0.85) 80%),
            url('/images/generated/ai_hero.jpg') center/cover no-repeat;
        }
        .case-bg-strategy {
          background:
            linear-gradient(135deg, rgba(139,44,62,0.5) 0%, rgba(11,22,52,0.88) 80%),
            url('/images/generated/strategy_hero.jpg') center/cover no-repeat;
        }
        .case-bg-marketing {
          background:
            linear-gradient(135deg, rgba(212,165,116,0.4) 0%, rgba(139,44,62,0.85) 80%),
            url('/images/generated/marketing_hero.jpg') center/cover no-repeat;
        }
        .case-visual::after {
          content: ''; position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        }
        .case-overlay {
          position: absolute; inset: 0;
          padding: 32px;
          display: flex; flex-direction: column; justify-content: space-between;
          color: #fff; z-index: 2;
        }
        .case-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .case-tag {
          padding: 6px 12px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 999px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          font-family: var(--font-inter);
        }
        .case-meta { font-size: 11px; letter-spacing: 0.1em; font-family: var(--font-inter); opacity: 0.7; }
        .case-item h3 {
          font-family: var(--font-serif-jp);
          font-size: 28px; font-weight: 700;
          line-height: 1.3; margin-bottom: 20px;
        }
        .case-item.sm h3 { font-size: 20px; }
        .case-nums {
          display: flex; gap: 32px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.2);
        }
        .case-num { flex: 1; }
        .case-num-label {
          font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.1em; opacity: 0.6;
          margin-bottom: 6px; font-family: var(--font-inter);
        }
        .case-num-value {
          font-family: var(--font-archivo), sans-serif;
          font-size: 32px; font-weight: 900; line-height: 1;
        }
        .case-item.sm .case-num-value { font-size: 24px; }
        .case-num-value.highlight { color: var(--cyan); }

        /* CTA BIG */
        .cta-big {
          padding: 200px 40px;
          background: var(--charcoal); color: #fff;
          text-align: center; position: relative; overflow: hidden;
        }
        .cta-big::before {
          content: ''; position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 50% 50%, rgba(0,217,255,0.2) 0%, transparent 60%);
        }
        .cta-big h2 {
          font-family: var(--font-archivo), var(--font-sans-jp);
          font-size: clamp(56px, 9vw, 140px);
          font-weight: 900; line-height: 0.9;
          letter-spacing: -0.04em; text-transform: uppercase;
          margin-bottom: 48px;
          position: relative; z-index: 2;
        }
        .cta-big h2 .italic {
          font-family: var(--font-playfair), serif;
          font-style: italic; color: var(--cyan);
          text-transform: lowercase;
        }
        .cta-big p {
          max-width: 560px; margin: 0 auto 48px;
          color: rgba(255,255,255,0.7);
          font-size: 16px; position: relative; z-index: 2;
        }
        .cta-big .btn-mega {
          position: relative; z-index: 2;
          background: #fff; color: var(--charcoal);
        }
        .cta-big .btn-mega:hover { background: var(--cyan); }

        @media (max-width: 1024px) {
          .cap-header { grid-template-columns: 1fr; gap: 40px; }
          .cap-grid { grid-template-columns: 1fr; }
          .cap-card { border-right: none; border-bottom: 1px solid rgba(0,0,0,0.1); padding: 40px 0; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .home-cases-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
          .case-item.big, .case-item.med, .case-item.sm { grid-column: span 1; grid-row: auto; min-height: 400px; }
          .stat-item { border-left: none; border-top: 1px solid rgba(0,0,0,0.1); }
          .stat-item:first-child { border-top: none; }
        }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr; }
          .home-hero, .capabilities, .manifesto, .stats-section, .home-cases, .cta-big {
            padding-left: 20px; padding-right: 20px;
          }
          .home-hero { padding-top: 120px; padding-bottom: 60px; min-height: auto; }
          .hero-mega { font-size: clamp(44px, 13vw, 80px); line-height: 0.9; }
          .hero-badge-top { right: 20px; top: 80px; font-size: 9px; letter-spacing: 0.18em; }
          .hero-sub { margin-top: 32px; flex-direction: column; align-items: flex-start; gap: 24px; }
          .hero-tagline { font-size: 16px; }
          .hero-lead { font-size: 13px; }
          .hero-ctas { width: 100%; }
          .btn-mega, .btn-ghost-mega { padding: 14px 22px; font-size: 12px; }
          .marquee { padding: 18px 0; }
          .marquee-item { font-size: 24px; gap: 16px; }
          .marquee-item .dot { width: 6px; height: 6px; }
          .capabilities, .manifesto, .stats-section, .home-cases { padding-top: 80px; padding-bottom: 80px; }
          .cap-header { margin-bottom: 60px; gap: 24px; }
          .cap-title, .cases-head h2, .stats-head h2 { font-size: clamp(36px, 12vw, 64px) !important; }
          .cap-card h3 { font-size: 32px; }
          .cap-card { padding: 32px 0; }
          .stat-num { font-size: clamp(56px, 20vw, 96px) !important; }
          .stat { padding: 32px 20px; }
          .manifesto { padding: 100px 20px; }
          .manifesto-text { font-size: clamp(24px, 6vw, 40px) !important; line-height: 1.4; }
          .case-item h3 { font-size: 22px; }
          .case-item.sm h3 { font-size: 18px; }
          .case-num-value { font-size: 24px !important; }
          .cta-big { padding: 100px 20px; }
          .cta-big h2 { font-size: clamp(44px, 14vw, 80px) !important; }

          /* Mobile: center stats numbers */
          .stat { text-align: center !important; padding: 36px 20px !important; }
          .stat-label { max-width: none !important; margin: 0 auto; }

          /* Mobile: stack case top tag + meta vertically to prevent overlap */
          .case-top { flex-direction: column !important; gap: 8px; align-items: flex-start !important; }
          .case-tag { white-space: nowrap; }
        }
      `}</style>

      <section className="home-hero">
        <div className="hero-badge-top">AI-FIRST CONSULTING · EST. 2024</div>
        <h1 className="hero-mega">
          <span className="line">RETHINK</span>
          <span className="line">GROWTH<span className="italic-dot">.</span></span>
          <span className="line masked">WITH AI.</span>
        </h1>
        <div className="hero-sub">
          <div className="hero-sub-left">
            <p className="hero-tagline">Mixing Strategy, AI, and Marketing —<br />to ignite unstoppable growth.</p>
            <p className="hero-lead">
              広告代理店、事業会社マーケ責任者、戦略コンサル、外資系ビッグテック、SNSクリエイター——多様なバックグラウンドのプロフェッショナルが&quot;ミックス&quot;する集団が、大手企業から新規事業まで、戦略・AI・マーケを一気通貫で支援しています。
            </p>
          </div>
          <div className="hero-ctas">
            <Link href="/contact" className="btn-mega">Let&apos;s Talk <span className="arrow">↗</span></Link>
            <Link href="/works" className="btn-ghost-mega">See Works</Link>
          </div>
        </div>
      </section>

      <div className="marquee">
        <div className="marquee-inner">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="marquee-item">
              Strategy <span className="dot"></span> <span className="accent">ai</span> <span className="dot"></span> Marketing
            </span>
          ))}
        </div>
      </div>

      <section className="capabilities">
        <div className="cap-inner">
          <div className="cap-header">
            <div>
              <div className="cap-label">What We Do</div>
            </div>
            <h2 className="cap-title">Three forces.<br /><span className="italic">one</span> growth engine.</h2>
          </div>
          <div className="cap-grid">
            <Link href="/services/strategy" className="cap-card">
              <div className="cap-num">01 / STRATEGY</div>
              <h3>STRATEGY</h3>
              <span className="jp">戦略コンサルティング</span>
              <p>事業戦略、新規事業、M&amp;A、経営管理まで。&quot;分厚い報告書&quot;ではなく、明日からの行動に変換するロードマップ。AIで仮説検証を加速し、意思決定を数日で回します。</p>
              <span className="cap-link">Explore Strategy</span>
            </Link>
            <Link href="/services/ai" className="cap-card">
              <div className="cap-num">02 / AI — MOST REQUESTED</div>
              <h3>AI<span className="italic">.</span></h3>
              <span className="jp">AI 実装支援</span>
              <p>エージェント設計、LLM業務実装、プロンプトエンジニアリング。私たち自身が120体超のAIと働くAI-first組織。その知見を貴社の業務に実装します。</p>
              <span className="cap-link">Explore AI</span>
            </Link>
            <Link href="/services/marketing" className="cap-card">
              <div className="cap-num">03 / MARKETING</div>
              <h3>GROWTH</h3>
              <span className="jp">マーケティング成長支援</span>
              <p>広告運用、CVR改善、SEO/AIO、SNS。評論家ではなく、現場の最前線で実行。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ再現性のある成長。</p>
              <span className="cap-link">Explore Marketing</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="manifesto">
        <div className="manifesto-inner">
          <div className="manifesto-label">— Manifesto</div>
          <div className="manifesto-text">
            戦略だけでは遅い。<br />
            AIだけでは浅い。<br />
            マーケだけでは一過性。<br /><br />
            3つが <span className="em">&quot;ミックス&quot;</span> して初めて、<br />
            事業は再現性のある<br />
            成長曲線を描きはじめる。
          </div>
          <div className="manifesto-sig">
            <span>— mixednuts Inc.</span>
            <span>Since 2024 · Tokyo</span>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-inner">
          <div className="stats-head">
            <h2>By <span className="italic">the</span> Numbers</h2>
            <p>AI-first 組織の、数字で見るケイパビリティ。</p>
          </div>
          <div className="stats-grid">
            <div className="stat-item"><div className="stat-num">120<span className="unit">+</span></div><div className="stat-label">社内 AI エージェント稼働中</div></div>
            <div className="stat-item"><div className="stat-num">30<span className="unit">+</span></div><div className="stat-label">累計支援クライアント</div></div>
            <div className="stat-item"><div className="stat-num">40<span className="unit">+</span></div><div className="stat-label">業務プロセス自動化</div></div>
            <div className="stat-item"><div className="stat-num">-70<span className="unit">%</span></div><div className="stat-label">業務時間削減の実例</div></div>
          </div>
        </div>
      </section>

      <section className="home-cases">
        <div className="home-cases-inner">
          <div className="home-cases-head">
            <h2>Selected<br /><span className="italic">works</span>.</h2>
            <Link href="/works" className="btn-ghost-mega">All Works →</Link>
          </div>
          <div className="home-cases-grid">
            <Link href="/works/livestream-fpna-ai" className="case-item big">
              <div className="case-visual case-bg-ai">
                <div className="case-overlay">
                  <div className="case-top">
                    <span className="case-tag">AI × Strategy</span>
                    <span className="case-meta">Entertainment · Ongoing</span>
                  </div>
                  <div>
                    <h3>ライブ配信事業の FP&amp;A × AI 自動化。</h3>
                    <div className="case-nums">
                      <div className="case-num"><div className="case-num-label">取締役会付議</div><div className="case-num-value highlight">毎月実行</div></div>
                      <div className="case-num"><div className="case-num-label">KPI 更新粒度</div><div className="case-num-value highlight">D+1</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works/ip-investment-dd" className="case-item med">
              <div className="case-visual case-bg-strategy">
                <div className="case-overlay">
                  <div className="case-top">
                    <span className="case-tag">Strategy</span>
                    <span className="case-meta">IP Investment · 取締役会承認</span>
                  </div>
                  <div>
                    <h3>アニメ IP 投資、取締役会承認。</h3>
                    <div className="case-nums">
                      <div className="case-num"><div className="case-num-label">承認案件</div><div className="case-num-value highlight">3件</div></div>
                      <div className="case-num"><div className="case-num-label">投資規模</div><div className="case-num-value highlight">10億円/件</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works/banking-loan-acquisition" className="case-item sm">
              <div className="case-visual case-bg-marketing">
                <div className="case-overlay">
                  <div className="case-top">
                    <span className="case-tag">Marketing × Strategy</span>
                    <span className="case-meta">Banking · 1.5y</span>
                  </div>
                  <div>
                    <h3>銀行ローン、審査通過率の改善。</h3>
                    <div className="case-nums">
                      <div className="case-num"><div className="case-num-label">有効契約率</div><div className="case-num-value highlight">+18%</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works/ai-agent-organization" className="case-item sm">
              <div className="case-visual case-bg-ai">
                <div className="case-overlay">
                  <div className="case-top">
                    <span className="case-tag">AI × Strategy</span>
                    <span className="case-meta">Internal · Ongoing</span>
                  </div>
                  <div>
                    <h3>90体超の AI エージェント組織。</h3>
                    <div className="case-nums">
                      <div className="case-num"><div className="case-num-label">エージェント数</div><div className="case-num-value highlight">90体超</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works/insurance-cmo-new-biz" className="case-item sm">
              <div className="case-visual case-bg-strategy">
                <div className="case-overlay">
                  <div className="case-top">
                    <span className="case-tag">Strategy × Marketing × AI</span>
                    <span className="case-meta">Insurance · Ongoing</span>
                  </div>
                  <div>
                    <h3>新規デジタル事業、CMO 代行。</h3>
                    <div className="case-nums">
                      <div className="case-num"><div className="case-num-label">リード目標</div><div className="case-num-value highlight">+40% 超過</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="cta-big">
        <div>
          <h2>LET&apos;S<br />BUILD<br /><span className="italic">growth</span>.</h2>
          <p>60分の無料相談で、貴社の事業に適したアプローチを共に設計しませんか。</p>
          <Link href="/contact" className="btn-mega">Start the Conversation <span className="arrow">↗</span></Link>
        </div>
      </section>
    </>
  );
}
