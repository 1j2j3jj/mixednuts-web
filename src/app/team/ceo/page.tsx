import type { Metadata } from "next";
import Link from "next/link";
import { members } from "@/data/members";

export const metadata: Metadata = {
  title: "CEO Profile — N.I.",
  description: "mixednuts 代表取締役 N.I. の詳細プロフィール。国内大手IT企業経営企画、グローバル大手IT企業を経て2021年に創業。",
};

export default function CeoPage() {
  const ceo = members.find((m) => m.division === "leadership")!;

  return (
    <>
      <style>{`
        .ceo-wrap { display: grid; grid-template-columns: 1fr 2fr; gap: 80px; align-items: start; }
        .ceo-sidebar { position: sticky; top: 100px; }
        .ceo-portrait { aspect-ratio: 3/4; background: url('/images/generated/ceo_portrait.jpg') center/cover no-repeat; border-radius: 20px; min-height: 320px; margin-bottom: 32px; }
        .ceo-sidebar-meta { display: flex; flex-direction: column; gap: 16px; }
        .ceo-meta-item { padding: 16px; background: #F9FAFB; border-radius: 12px; border-left: 3px solid var(--cyan); }
        .ceo-meta-label { font-size: 10px; color: #9CA3AF; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
        .ceo-meta-value { font-size: 13px; color: #1A1A1A; line-height: 1.5; }
        .ceo-content h2 { font-family: var(--font-serif-jp); font-size: 28px; font-weight: 700; color: var(--navy); margin: 48px 0 20px; padding-bottom: 12px; border-bottom: 2px solid #E5E7EB; }
        .ceo-content h2:first-child { margin-top: 0; }
        .ceo-content p { font-size: 15px; line-height: 1.95; color: #1A1A1A; margin-bottom: 20px; }
        .career-item { display: grid; grid-template-columns: 120px 1fr; gap: 24px; padding: 24px 0; border-bottom: 1px solid #E5E7EB; }
        .career-period { font-size: 12px; color: #9CA3AF; letter-spacing: 0.05em; padding-top: 2px; }
        .career-detail h4 { font-family: var(--font-serif-jp); font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
        .career-detail .company { font-size: 12px; color: var(--cyan); font-weight: 600; letter-spacing: 0.05em; margin-bottom: 8px; }
        .career-detail p { font-size: 13px; color: #4B5563; line-height: 1.7; margin: 0; }
        .skill-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .skill-tag { padding: 6px 14px; background: #F0F9FF; border: 1px solid rgba(0,180,216,0.2); color: #0891B2; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .quote-block { background: var(--navy); color: #fff; border-radius: 16px; padding: 40px 48px; margin: 40px 0; position: relative; }
        .quote-block::before { content: '"'; font-family: var(--font-serif-en); font-size: 120px; color: rgba(0,180,216,0.2); position: absolute; top: -20px; left: 24px; line-height: 1; }
        .quote-block p { font-family: var(--font-serif-jp); font-size: 20px; line-height: 1.8; position: relative; z-index: 2; margin: 0; }
        @media (max-width: 900px) {
          .ceo-wrap { grid-template-columns: 1fr; }
          .ceo-sidebar { position: static; }
          .career-item { grid-template-columns: 1fr; gap: 8px; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / <Link href="/team">Team</Link> / CEO
          </div>
          <div className="page-hero-badge">Founder & CEO</div>
          <h1><span className="accent">{ceo.initial}</span></h1>
          <p className="lead">{ceo.role} — mixednuts, Inc. Founder</p>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="ceo-wrap">
            <div className="ceo-sidebar">
              <div className="ceo-portrait" />
              <div className="ceo-sidebar-meta">
                <div className="ceo-meta-item">
                  <div className="ceo-meta-label">Role</div>
                  <div className="ceo-meta-value">Founder & CEO<br />mixednuts, Inc.</div>
                </div>
                <div className="ceo-meta-item">
                  <div className="ceo-meta-label">Education</div>
                  <div className="ceo-meta-value">早稲田大学大学院<br />経営管理研究科（MBA）</div>
                </div>
                <div className="ceo-meta-item">
                  <div className="ceo-meta-label">Base</div>
                  <div className="ceo-meta-value">Tokyo, Japan</div>
                </div>
                <div className="ceo-meta-item">
                  <div className="ceo-meta-label">Languages</div>
                  <div className="ceo-meta-value">日本語（ネイティブ）<br />英語（ビジネス）</div>
                </div>
              </div>
            </div>

            <div className="ceo-content">
              <h2>Overview</h2>
              <p>
                国内大手デジタル広告代理店でアカウントプランナーとしてキャリアをスタート。その後グローバル大手IT企業に転じ、広告事業のアカウントストラテジストとして年間40億円超の広告ポートフォリオを運用。
              </p>
              <p>
                その後、国内大手IT企業の経営企画本部へ。ライブストリーミング事業・エンタメIP事業において、事業計画策定・投資評価・取締役会付議・中期戦略立案まで、経営判断の中枢に関わる。FP&AとM&Aアドバイザリーの実践経験を持つ。
              </p>
              <p>
                2021年4月、ミックスナッツ株式会社を創業。「戦略 × AI × マーケティング」の統合提供をコンセプトに、多様なバックグラウンドのプロフェッショナルを束ねるAI-firstコンサルティングファームを構築。自社内で120体超のAIエージェント組織を設計・運用し、そのノウハウをクライアントに移植している。
              </p>

              <div className="quote-block">
                <p>
                  戦略だけでは遅い。AIだけでは浅い。マーケだけでは一過性。3つが"ミックス"して初めて、事業は再現性のある成長曲線を描きはじめる。
                </p>
              </div>

              <h2>Career</h2>
              <div>
                {[
                  {
                    period: "2021 — 現在",
                    company: "mixednuts, Inc.",
                    title: "Founder & CEO",
                    desc: "戦略・AI・マーケティングの統合コンサルティングファームを創業。AI-first組織設計、クライアントへの実装支援、社内120体超のAIエージェント組織の構築・運用を統括。",
                  },
                  {
                    period: "2018 — 2021",
                    company: "国内大手IT企業",
                    title: "経営企画 責任者",
                    desc: "ライブストリーミング事業・エンタメIP事業の経営企画責任者。中期経営計画策定、取締役会付議資料作成、M&A案件評価、予実管理の統括。FP&AとDCFバリュエーションの実践。",
                  },
                  {
                    period: "2015 — 2018",
                    company: "グローバル大手IT企業",
                    title: "Account Strategist, Advertising",
                    desc: "大手広告主の広告事業全体を担当するアカウントストラテジスト。年間40億円超の広告ポートフォリオ最適化、クライアント経営層への戦略提案を担当。",
                  },
                  {
                    period: "2012 — 2015",
                    company: "国内大手デジタル広告代理店",
                    title: "アカウントプランナー",
                    desc: "大手クライアントの統合マーケティング戦略立案・実行。Google Ads、Meta Ads、DSP運用から戦略策定まで一気通貫で担当。",
                  },
                ].map((c) => (
                  <div key={c.period} className="career-item">
                    <div className="career-period">{c.period}</div>
                    <div className="career-detail">
                      <h4>{c.title}</h4>
                      <div className="company">{c.company}</div>
                      <p>{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h2>Expertise</h2>
              <div className="skill-tags">
                {["FP&A", "M&A / Valuation", "AI Agent Design", "LLM Implementation", "Google Ads", "Meta Ads", "Growth Marketing", "SEO / AIO", "Corporate Finance", "Business Strategy", "OKR / KPI Design", "Board Deck"].map((skill) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <h2>N.I. と直接、話しましょう。</h2>
          <p>初回相談は無料です。60分で、貴社の課題に最適なアプローチを一緒に設計します。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
