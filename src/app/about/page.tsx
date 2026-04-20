import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — 才能が「ミックス」する瞬間、事業は動き始める",
  description: "戦略・AI・マーケティングを一気通貫で提供するAI-firstファーム。多様なバックグラウンドのプロフェッショナルが集結。",
};

export default function AboutPage() {
  return (
    <>
      <style>{`
        .story-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; margin-bottom: 96px; }
        .story-text .story-num { font-size: 14px; color: var(--cyan); letter-spacing: 0.15em; margin-bottom: 16px; font-weight: 700; }
        .story-text h3 { font-family: var(--font-serif-jp); font-size: 28px; font-weight: 700; margin-bottom: 20px; color: var(--navy); line-height: 1.4; }
        .story-text p { color: #4B5563; font-size: 15px; line-height: 1.9; margin-bottom: 16px; }
        .story-visual { aspect-ratio: 4/3; background: linear-gradient(135deg, var(--navy) 0%, var(--burgundy) 100%); border-radius: 20px; overflow: hidden; }
        .values-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .value-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 40px 32px; transition: all 0.3s; }
        .value-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(11,22,52,0.08); border-color: var(--cyan); }
        .value-num { font-family: var(--font-serif-en); font-size: 48px; color: var(--cyan); font-weight: 900; line-height: 1; margin-bottom: 20px; }
        .value-card h3 { font-family: var(--font-serif-jp); font-size: 20px; font-weight: 700; margin-bottom: 12px; color: var(--navy); }
        .value-card p { color: #4B5563; font-size: 14px; line-height: 1.8; }
        .team-intro {
          background: linear-gradient(135deg, rgba(11,22,52,0.88) 0%, rgba(19,34,78,0.92) 100%), url('/images/generated/team_hero.png') center/cover no-repeat;
          color: #fff; border-radius: 24px; padding: 64px 48px; margin-bottom: 48px; position: relative; overflow: hidden;
        }
        .team-intro::before {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px; pointer-events: none;
        }
        .team-intro-inner { position: relative; z-index: 2; }
        .team-intro h3 { font-family: var(--font-serif-jp); font-size: 32px; font-weight: 700; margin-bottom: 20px; line-height: 1.4; }
        .bg-tags { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
        .bg-tag { padding: 8px 16px; background: rgba(0,180,216,0.15); border: 1px solid rgba(0,180,216,0.3); border-radius: 999px; font-size: 13px; color: var(--cyan); font-weight: 500; }
        .info-section { background: #F9FAFB; padding: 80px 32px; }
        .info-inner { max-width: 1280px; margin: 0 auto; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
        .info-table { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; }
        .info-row { display: grid; grid-template-columns: 140px 1fr; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
        .info-row:last-child { border-bottom: none; }
        .info-row dt { font-size: 11px; color: #9CA3AF; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; padding-top: 2px; }
        .info-row dd { font-size: 14px; color: #1A1A1A; line-height: 1.8; }
        .ceo-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 48px; align-items: center; background: #F9FAFB; border-radius: 20px; padding: 48px; }
        .ceo-img { aspect-ratio: 3/4; background: url('/images/generated/ceo_portrait.png') center/cover no-repeat; border-radius: 16px; min-height: 300px; }
        @media (max-width: 900px) {
          .story-grid { grid-template-columns: 1fr; gap: 32px; }
          .values-grid, .info-grid { grid-template-columns: 1fr; }
          .team-intro { padding: 40px 24px; }
          .ceo-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / About</div>
          <div className="page-hero-badge">About mixednuts, Inc.</div>
          <h1>才能が"<span className="accent">ミックス</span>"する瞬間、<br />事業は動き始める。</h1>
          <p className="lead">
            広告代理店、事業会社マーケ責任者、戦略コンサル、外資系ビッグテック、SNSクリエイター——多様なバックグラウンドのプロフェッショナルが交差するファーム。戦略・AI・マーケティングの3軸で、クライアントの事業に"成長エンジン"を実装します。
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="section">
        <div className="section-inner">
          <div className="story-grid">
            <div className="story-text">
              <div className="story-num">MISSION</div>
              <h3>"ミックス"で、事業の未来に必然性を。</h3>
              <p>私たちは、異なる領域のプロフェッショナルを "ミックス" することで、単一の視座では生まれ得ない事業価値を創り出します。戦略は現場に届かなければ絵に描いた餅。AIは業務に溶け込まなければただのツール。マーケは戦略なしには一過性。</p>
              <p>3つを断絶させず、有機的に繋ぐ仕組みを、クライアントの事業に実装する。それが私たちのミッションです。</p>
            </div>
            <div className="story-visual" style={{background: `url('/images/generated/strategy_hero.png') center/cover no-repeat`}} />
          </div>
          <div className="story-grid">
            <div className="story-text">
              <div className="story-num">VISION</div>
              <h3>日本の事業成長に、"再現性"を持ち込む。</h3>
              <p>たまたま成功した、ではなく、意図して成功させる。勘と経験ではなく、データとAIで。個人の能力依存ではなく、組織の仕組みで。</p>
              <p>私たちは、事業成長を科学する会社です。AI-firstのコンサルティングファームとして、日本企業の "勝ち筋" を再現可能にする。この営みを通じて、国内事業の競争力そのものを底上げしていきます。</p>
            </div>
            <div className="story-visual" style={{background: `url('/images/generated/ai_hero.png') center/cover no-repeat`}} />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section" style={{background: '#F9FAFB'}}>
        <div className="section-inner">
          <span className="section-label">Our Values</span>
          <h2 className="section-title">私たちの行動原則。</h2>
          <p className="section-lead">多様な人材が同じ方向を向くための、5つの指針。日々の判断と振る舞いの中に、これらを埋め込んでいます。</p>
          <div className="values-grid">
            {[
              { num: "01", title: "Mix, Don't Divide", desc: "領域を分断しない。戦略・AI・マーケを断絶させず、3つが常に連動する設計で仕事を組み立てる。" },
              { num: "02", title: "On the Ground", desc: "評論家にならない。現場の最前線に飛び込み、実装・運用・改善までハンズオンで伴走する。" },
              { num: "03", title: "Data-Driven", desc: "勘と経験で語らない。意思決定の全段階でデータを起点にし、AIで仮説検証を高速化する。" },
              { num: "04", title: "Calibrated Honesty", desc: "ドラマ化しない。異常値を見たらまず実害を計算し、断定せず、仮説と事実を分離して報告する。" },
              { num: "05", title: "AI-First, Human-Led", desc: "AIに任せる領域と人間が握る領域を意図的に設計する。AI導入で終わらせず、AIと共に働く組織をつくる。" },
            ].map((v) => (
              <div key={v.num} className="value-card">
                <div className="value-num">{v.num}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section">
        <div className="section-inner">
          <span className="section-label">Our People</span>
          <h2 className="section-title">多様な才能の"ミックス"。</h2>
          <p className="section-lead">ミックスナッツの強みは、単一のバックグラウンドに依存しないこと。異なる業界・異なる役職を経験してきたプロフェッショナルが、一つのプロジェクトで視座を重ねます。</p>

          <div className="team-intro">
            <div className="team-intro-inner">
              <h3>広告・マーケ・戦略・ビッグテック・クリエイター。<br />異なるバックグラウンドが、一つのファームに集結。</h3>
              <p style={{color: 'rgba(255,255,255,0.85)', lineHeight: 1.9}}>大手広告代理店でアカウントを動かしてきたマーケター、事業会社のマーケ責任者として現場を率いてきたリーダー、戦略ファーム出身のコンサルタント、外資系ビッグテックでプロダクトを作ってきたエンジニア、SNSで実績を出してきたクリエイター。それぞれの領域で磨いた専門性を、ひとつのチームで掛け合わせます。</p>
              <div className="bg-tags">
                {["国内大手広告代理店", "事業会社マーケ責任者", "戦略コンサルティングファーム", "外資系ビッグテック", "AI / MLエンジニア", "SNS クリエイター", "財務・経営企画"].map((tag) => (
                  <span key={tag} className="bg-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* CEO Highlight */}
          <div className="ceo-grid">
            <div className="ceo-img" />
            <div>
              <h3 style={{fontFamily: 'var(--font-serif-jp)', fontSize: 28, color: 'var(--navy)', marginBottom: 8, fontWeight: 700}}>
                N.I. <span style={{fontFamily: 'var(--font-serif-en)', color: '#9CA3AF', fontSize: 18, fontWeight: 400}}>/ Founder & CEO</span>
              </h3>
              <div style={{color: 'var(--cyan)', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 20}}>CEO / Founder</div>
              <p style={{color: '#4B5563', fontSize: 15, lineHeight: 1.9, marginBottom: 16}}>国内大手デジタル広告代理店でアカウントプランナーを務めた後、グローバル大手IT企業で広告事業のアカウントストラテジスト（年間40億円超のポートフォリオ運用）。その後、国内大手IT企業の経営企画に転じ、ライブストリーミング事業・エンタメ事業において、事業計画・投資評価・中期戦略まで、経営判断の中枢で意思決定を支援。</p>
              <p style={{color: '#4B5563', fontSize: 15, lineHeight: 1.9, marginBottom: 24}}>2021年、ミックスナッツ株式会社を創業。AI-firstファームを率い、戦略・AI・マーケティングの統合提供を牽引。早稲田大学大学院経営管理研究科（MBA）修了。</p>
              <Link href="/team/ceo" className="btn-dark">詳細プロフィールを見る →</Link>
            </div>
          </div>

          <div style={{textAlign: 'center', marginTop: 64}}>
            <Link href="/team" className="btn-dark">メンバー一覧を見る →</Link>
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="info-section">
        <div className="info-inner">
          <span className="section-label">Company Information</span>
          <h2 className="section-title" style={{marginBottom: 48}}>会社概要</h2>
          <div className="info-grid">
            <dl className="info-table">
              <div className="info-row"><dt>Name</dt><dd>ミックスナッツ株式会社<br />(mixednuts, Inc.)</dd></div>
              <div className="info-row"><dt>Founded</dt><dd>2021年4月19日</dd></div>
              <div className="info-row"><dt>CEO</dt><dd>N.I.</dd></div>
              <div className="info-row"><dt>Business</dt><dd>戦略コンサルティング事業<br />AI実装支援事業<br />マーケティング成長支援事業</dd></div>
            </dl>
            <dl className="info-table">
              <div className="info-row"><dt>Address</dt><dd>〒107-0062<br />東京都港区南青山3-8-40</dd></div>
              <div className="info-row"><dt>Contact</dt><dd><a href="mailto:hello@mixednuts-inc.com" style={{color: 'var(--navy)', textDecoration: 'underline'}}>hello@mixednuts-inc.com</a></dd></div>
              <div className="info-row"><dt>Legal Advisor</dt><dd>弁護士法人クレア法律事務所</dd></div>
              <div className="info-row"><dt>Tax Advisor</dt><dd>関野会計事務所</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <h2>一緒に、事業の次の章を<br />書き始めませんか。</h2>
          <p>初回無料相談（60分）で貴社の課題をヒアリングし、最適なご提案をいたします。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
