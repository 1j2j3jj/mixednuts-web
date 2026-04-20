import type { Metadata } from "next";
import Link from "next/link";
import { works } from "@/data/works";

export const metadata: Metadata = {
  title: "Strategy — 事業計画・投資評価・中期戦略",
  description: "戦略ファーム出身者と事業会社経営企画経験者が、経営判断の中枢で意思決定を支援。FP&A、M&A、新規事業、組織設計まで一気通貫。",
};

const strategyWorks = works.filter((w) => w.services.includes("strategy")).slice(0, 3);

export default function ServiceStrategyPage() {
  return (
    <>
      <style>{`
        .page-hero-strategy { background: linear-gradient(135deg, rgba(11,22,52,0.88) 0%, rgba(139,44,62,0.7) 100%), url('/images/generated/strategy_hero.png') center/cover no-repeat; }
        .proof-bar { background: var(--navy); color: #fff; padding: 48px 32px; }
        .proof-bar-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        .proof-stat { text-align: center; }
        .proof-stat .num { font-family: var(--font-serif-en); font-size: 42px; font-weight: 700; color: var(--cyan); line-height: 1; margin-bottom: 8px; }
        .proof-stat .label { font-size: 12px; color: rgba(255,255,255,0.7); }
        .service-menu { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .service-menu-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 36px 32px; transition: all 0.3s; }
        .service-menu-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(11,22,52,0.08); border-color: var(--cyan); }
        .service-menu-card .s-num { font-family: var(--font-serif-en); font-size: 32px; font-weight: 900; color: var(--cyan); line-height: 1; margin-bottom: 16px; }
        .service-menu-card h3 { font-family: var(--font-serif-jp); font-size: 20px; font-weight: 700; color: var(--navy); margin-bottom: 12px; }
        .service-menu-card p { font-size: 14px; color: #4B5563; line-height: 1.9; }
        .team-section { background: #F9FAFB; }
        .team-profiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .team-profile { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; }
        .team-profile-initial { width: 64px; height: 64px; background: linear-gradient(135deg, var(--navy), var(--burgundy)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: var(--font-serif-en); font-size: 20px; font-weight: 700; margin-bottom: 16px; }
        .team-profile h3 { font-family: var(--font-serif-jp); font-size: 17px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
        .team-profile .role { font-size: 12px; color: var(--cyan); font-weight: 600; letter-spacing: 0.05em; margin-bottom: 12px; }
        .team-profile p { font-size: 13px; color: #4B5563; line-height: 1.7; }
        .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .case-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; transition: all 0.3s; text-decoration: none; color: inherit; display: block; }
        .case-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); border-color: var(--navy); }
        .case-header { display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px; }
        .case-sector { padding: 4px 10px; background: var(--navy); color: #fff; font-size: 11px; border-radius: 4px; font-weight: 600; }
        .case-title { font-family: var(--font-serif-jp); font-size: 17px; font-weight: 700; margin-bottom: 16px; line-height: 1.5; }
        .case-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px; }
        .case-metric-label { font-size: 10px; color: #9CA3AF; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; }
        .case-metric-value { font-family: var(--font-serif-en); font-size: 22px; font-weight: 700; color: var(--navy); line-height: 1; }
        @media (max-width: 900px) {
          .proof-bar-inner, .service-menu, .team-profiles, .cases-grid { grid-template-columns: 1fr; }
          .proof-bar-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <section className="page-hero page-hero-strategy">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/services">Services</Link> / Strategy</div>
          <div className="page-hero-badge">Strategy Consulting</div>
          <h1>意思決定の質を、<br /><span className="accent">数倍に引き上げる</span>。</h1>
          <p className="lead">
            事業戦略、新規事業、M&A、経営管理まで。"分厚い報告書"ではなく、明日からの行動に変換するロードマップ。戦略ファーム出身者と事業会社経営企画経験者が、経営判断の中枢に入り込みます。
          </p>
        </div>
      </section>

      {/* Proof bar */}
      <section className="proof-bar">
        <div className="proof-bar-inner">
          <div className="proof-stat"><div className="num">15+</div><div className="label">戦略支援実績</div></div>
          <div className="proof-stat"><div className="num">5+</div><div className="label">M&A案件サポート</div></div>
          <div className="proof-stat"><div className="num">10+</div><div className="label">新規事業立ち上げ</div></div>
          <div className="proof-stat"><div className="num">MBA</div><div className="label">早稲田 / 外資系ファーム出身</div></div>
        </div>
      </section>

      {/* Service menu */}
      <section className="section">
        <div className="section-inner">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">戦略コンサルティングの6領域。</h2>
          <p className="section-lead">経営判断の全段階で、データとAIを使った意思決定支援を提供します。</p>
          <div className="service-menu">
            {[
              { num: "01", title: "中期経営計画・事業戦略", desc: "3-5年の中期経営計画策定から単年度事業計画まで。市場分析、競合マッピング、ポジショニング設計、成長ドライバーの特定まで、数字に落としたロードマップを作ります。" },
              { num: "02", title: "FP&A / 予実管理設計", desc: "財務計画・予実分析の仕組みを設計・構築します。月次締め、取締役会付議、KPI設計、AIを使った自動化まで。CFO機能を外部から提供します。" },
              { num: "03", title: "M&A 戦略・デューデリジェンス", desc: "買収候補の発掘から財務DD、法務DD連携、バリュエーション（DCF・マルチプル）、意思決定支援まで。PEファンド・投資銀行出身メンバーが主導します。" },
              { num: "04", title: "投資評価・バリュエーション", desc: "DCF、コンパラブル分析、フットボールチャート、シナリオ感応度分析。投資判断の根拠を多角的に構築します。上場・未上場の双方に対応。" },
              { num: "05", title: "新規事業立ち上げ支援", desc: "ICP定義、仮説検証設計、MVP策定、Gate Review、ピボット判断まで。PMF達成後の本格投入準備まで伴走します。AI活用でリサーチ工程を大幅短縮。" },
              { num: "06", title: "組織設計・PMO", desc: "事業の成長フェーズに合わせた組織設計、KPI体系の再構築、プロジェクト管理体制の整備。複数部門の横串調整も担います。" },
            ].map((s) => (
              <div key={s.num} className="service-menu-card">
                <div className="s-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section team-section">
        <div className="section-inner">
          <span className="section-label">Strategy Team</span>
          <h2 className="section-title">戦略チームを紹介。</h2>
          <p className="section-lead">外資系戦略ファーム・投資銀行・事業会社経営企画出身のプロフェッショナルが揃っています。</p>
          <div className="team-profiles">
            {[
              { initial: "N.I.", role: "Founder & CEO", bg: "戦略コンサルティング → 大手IT企業 経営企画・FP&A → 投資", bio: "国内大手IT企業の経営企画責任者として取締役会付議・中期戦略を統括。mixednuts創業後は戦略×AI×マーケの統合提供を牽引。早稲田大学院MBA。" },
              { initial: "K.T.", role: "Head of Strategy", bg: "外資系戦略コンサルファーム出身", bio: "外資系戦略ファームで通信・メディア・ヘルスケア業界の中期戦略立案をリード。M&A PMI、新規事業立ち上げ、組織変革の経験多数。" },
              { initial: "Y.M.", role: "Principal, M&A / Investment", bg: "投資銀行 → PEファンド", bio: "投資銀行のM&Aアドバイザリー部門を経てPEファンドへ。DCF・フットボールチャート・DD実行を多数経験。バリュエーションが専門。" },
            ].map((m) => (
              <div key={m.initial} className="team-profile">
                <div className="team-profile-initial">{m.initial}</div>
                <h3>{m.initial}</h3>
                <div className="role">{m.role}</div>
                <p>{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cases */}
      {strategyWorks.length > 0 && (
        <section className="section">
          <div className="section-inner">
            <span className="section-label">Case Studies</span>
            <h2 className="section-title">戦略支援の実績。</h2>
            <div className="cases-grid">
              {strategyWorks.map((w) => (
                <Link key={w.slug} href={`/works/${w.slug}`} className="case-card">
                  <div className="case-header">
                    <span className="case-sector">{w.industry}</span>
                  </div>
                  <div className="case-title">{w.title}</div>
                  <div className="case-metrics">
                    {w.metric.slice(0, 2).map((m) => (
                      <div key={m.label}>
                        <div className="case-metric-label">{m.label}</div>
                        <div className="case-metric-value">{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{fontSize: 12, color: '#4B5563', lineHeight: 1.7}}>{w.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cta">
        <div className="cta-inner">
          <h2>経営判断を、<br />もっと確信を持って行いたい。</h2>
          <p>初回無料相談（60分）で、貴社の経営課題をヒアリングします。まずは話すことから始めましょう。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
