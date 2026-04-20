import type { Metadata } from "next";
import Link from "next/link";
import { members, divisionLabels } from "@/data/members";

export const metadata: Metadata = {
  title: "Team — 多様な才能の「ミックス」",
  description: "広告代理店、事業会社マーケ、戦略コンサル、ビッグテック、クリエイター——多様なバックグラウンドのプロフェッショナルが集結。",
};

const divisionColors: Record<string, string> = {
  leadership: "#0A0A0A",
  strategy: "#1A1A1A",
  ai: "#0A0A0A",
  marketing: "#1A1A1A",
};

export default function TeamPage() {
  const ceo = members.find((m) => m.division === "leadership");
  const restMembers = members.filter((m) => m.division !== "leadership");

  return (
    <>
      <style>{`
        .philosophy { background: #fff; padding: 120px 32px; }
        .philosophy-inner { max-width: 1280px; margin: 0 auto; }
        .philosophy-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 64px; align-items: center; }
        .philosophy-text h2 { font-family: var(--font-serif-jp); font-size: 36px; line-height: 1.35; font-weight: 700; margin-bottom: 24px; color: var(--navy); }
        .philosophy-text p { color: #4B5563; font-size: 15px; line-height: 1.9; margin-bottom: 16px; }
        .backgrounds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .bg-card { padding: 24px; background: #F9FAFB; border-radius: 12px; border: 1px solid var(--border, #E5E7EB); }
        .bg-card-label { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
        .bg-card-value { font-family: var(--font-serif-jp); font-size: 14px; font-weight: 700; color: var(--navy); line-height: 1.5; }
        .leaders { background: #F9FAFB; padding: 120px 32px; }
        .leaders-inner { max-width: 1280px; margin: 0 auto; }
        .leader-hero { display: grid; grid-template-columns: 1fr 1.4fr; gap: 64px; align-items: center; background: #fff; padding: 64px; border-radius: 24px; border: 1px solid #E5E7EB; }
        .leader-avatar { width: 100%; aspect-ratio: 3/4; border-radius: 16px; background: url('/images/generated/ceo_portrait.jpg') center/cover no-repeat; min-height: 280px; }
        .leader-tag { display: inline-block; font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px; }
        .leader-name { font-family: var(--font-serif-jp); font-size: 36px; font-weight: 700; color: var(--navy); margin-bottom: 4px; line-height: 1.2; }
        .leader-role { color: var(--cyan); font-size: 12px; letter-spacing: 0.15em; margin-bottom: 24px; font-weight: 700; text-transform: uppercase; margin-top: 8px; }
        .leader-bio { color: #4B5563; font-size: 15px; line-height: 1.9; margin-bottom: 20px; }
        .leader-meta { display: flex; gap: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; letter-spacing: 0.05em; }
        .members-section { background: #fff; padding: 120px 32px; }
        .members-inner { max-width: 1280px; margin: 0 auto; }
        .members-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px; }
        .member-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 20px; overflow: hidden; transition: all 0.3s; }
        .member-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); border-color: var(--navy); }
        .member-avatar { aspect-ratio: 4/5; display: flex; align-items: center; justify-content: center; position: relative; }
        .member-avatar .initials { font-family: var(--font-serif-en); color: rgba(255,255,255,0.85); font-weight: 900; font-size: 72px; letter-spacing: -0.02em; }
        .member-body { padding: 24px; }
        .member-meta { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .member-dept { padding: 3px 10px; background: var(--navy); color: #fff; font-size: 10px; border-radius: 4px; font-weight: 700; letter-spacing: 0.05em; }
        .member-name { font-family: var(--font-serif-jp); font-size: 20px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
        .member-title { color: #4B5563; font-size: 13px; margin-bottom: 12px; font-weight: 500; }
        .member-bg { font-size: 12px; color: #9CA3AF; line-height: 1.7; letter-spacing: 0.02em; }
        .departments { background: var(--navy); color: #fff; padding: 120px 32px; position: relative; overflow: hidden; }
        .departments::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 80% 30%, rgba(0,180,216,0.15) 0%, transparent 50%); }
        .departments-inner { max-width: 1280px; margin: 0 auto; position: relative; z-index: 2; }
        .dept-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 48px; }
        .dept-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; }
        .dept-icon { font-size: 28px; margin-bottom: 16px; }
        .dept-name { font-family: var(--font-serif-jp); font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #fff; }
        .dept-desc { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.7; }
        .dept-count { color: var(--cyan); font-size: 11px; margin-top: 12px; font-weight: 700; letter-spacing: 0.1em; }
        @media (max-width: 900px) {
          .philosophy-grid { grid-template-columns: 1fr; }
          .backgrounds-grid { grid-template-columns: 1fr; }
          .leader-hero { grid-template-columns: 1fr; padding: 32px; }
          .members-grid { grid-template-columns: 1fr; }
          .dept-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .dept-grid { grid-template-columns: 1fr; gap: 16px; }
          .leader-hero { padding: 28px 20px; }
          .leader-name { font-size: 28px !important; }
          .departments { padding: 80px 20px; }
          .philosophy { padding: 80px 20px; }
          .leaders { padding: 80px 20px; }
          .members-section { padding: 80px 20px; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / Team</div>
          <div className="page-hero-badge">Our People</div>
          <h1>多様な才能が<br />"<span className="accent">ミックス</span>"する場所。</h1>
          <p className="lead">
            単一のバックグラウンドに依存しない。広告代理店、事業会社マーケ責任者、戦略コンサル、ビッグテック、SNSクリエイター——異なる専門性を持つプロフェッショナルが、一つのプロジェクトで視座を重ねます。
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <section className="philosophy">
        <div className="philosophy-inner">
          <div className="philosophy-grid">
            <div className="philosophy-text">
              <span className="section-label">Our Philosophy</span>
              <h2>それぞれのプロが、<br />本来の強さを発揮できる場所。</h2>
              <p>ミックスナッツは、スペシャリストの集合体です。全員が「自分の得意」だけに集中できるよう、チームとAIエージェントが補完し合う設計になっています。</p>
              <p>マネジメントの負荷はAIが吸収し、人間は高付加価値な思考と実行に専念する。それが私たちの「AI-first, Human-led」の実践形です。</p>
            </div>
            <div className="backgrounds-grid">
              {[
                { label: "Strategy", value: "外資系戦略ファーム\n事業会社経営企画・FP&A" },
                { label: "AI", value: "グローバルIT企業 ML\nスタートアップ CTO" },
                { label: "Marketing", value: "国内大手広告代理店\n事業会社マーケ責任者" },
                { label: "Creative", value: "SNSクリエイター\n編集者・コンテンツ制作" },
              ].map((bg) => (
                <div key={bg.label} className="bg-card">
                  <div className="bg-card-label">{bg.label}</div>
                  <div className="bg-card-value" style={{whiteSpace: 'pre-line'}}>{bg.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CEO */}
      {ceo && (
        <section className="leaders">
          <div className="leaders-inner">
            <span className="section-label">Leadership</span>
            <h2 className="section-title" style={{marginBottom: 48}}>Founder & CEO</h2>
            <div className="leader-hero">
              <div className="leader-avatar" />
              <div>
                <div className="leader-tag">Founder & CEO</div>
                <div className="leader-name">{ceo.initial}</div>
                <div className="leader-role">{ceo.role}</div>
                <p className="leader-bio">{ceo.bio}</p>
                <p className="leader-bio" style={{color: '#9CA3AF', fontSize: 13}}>{ceo.background}</p>
                <div className="leader-meta">
                  <span>早稲田大学大学院 MBA</span>
                  <span>·</span>
                  <Link href="/team/ceo" style={{color: 'var(--navy)', textDecoration: 'none', fontWeight: 600}}>詳細プロフィール →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Members Grid */}
      <section className="members-section">
        <div className="members-inner">
          <span className="section-label">Team Members</span>
          <h2 className="section-title">専門家が揃う、3つの部門。</h2>
          <p className="section-lead">Strategy, AI, Marketingの各領域に、確かな実績を持つプロフェッショナルが在籍しています。</p>
          <div className="members-grid">
            {restMembers.map((member) => (
              <div key={member.initial} className="member-card">
                <div
                  className="member-avatar"
                  style={{background: `linear-gradient(135deg, ${divisionColors[member.division] || '#0A0A0A'} 0%, #1A1A1A 100%)`, borderBottom: '2px solid var(--cyan)'}}
                >
                  <span className="initials">{member.initial}</span>
                </div>
                <div className="member-body">
                  <div className="member-meta">
                    <span className="member-dept">{divisionLabels[member.division]}</span>
                  </div>
                  <div className="member-name">{member.initial}</div>
                  <div className="member-title">{member.role}</div>
                  <div className="member-bg">{member.background}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="departments">
        <div className="departments-inner">
          <span className="section-label" style={{color: 'var(--cyan)'}}>Departments</span>
          <h2 className="section-title" style={{color: '#fff'}}>3つの専門部門が連携する。</h2>
          <p className="section-lead" style={{color: 'rgba(255,255,255,0.75)'}}>各部門が独立した専門性を持ちながら、プロジェクトに応じてクロスファンクショナルに動く設計です。</p>
          <div className="dept-grid">
            <div className="dept-card">
              <div className="dept-icon">01</div>
              <div className="dept-name">Strategy</div>
              <div className="dept-desc">中期戦略、M&A、FP&A、新規事業。経営判断の中枢に入り込み、意思決定を支援する。</div>
              <div className="dept-count">3 MEMBERS</div>
            </div>
            <div className="dept-card">
              <div className="dept-icon">02</div>
              <div className="dept-name">AI Implementation</div>
              <div className="dept-desc">エージェント設計、LLM実装、RAG構築。自社で120体超を運用してきた実装ノウハウが強み。</div>
              <div className="dept-count">3 MEMBERS</div>
            </div>
            <div className="dept-card">
              <div className="dept-icon">03</div>
              <div className="dept-name">Marketing & Growth</div>
              <div className="dept-desc">広告運用、SEO/AIO、CVR改善、コンテンツ。代理店出身と事業会社出身が組んで実行する。</div>
              <div className="dept-count">3 MEMBERS</div>
            </div>
            <div className="dept-card">
              <div className="dept-icon">04</div>
              <div className="dept-name">AI Agents</div>
              <div className="dept-desc">120体超のAIエージェントが24時間稼働。人間チームをサポートし、組織全体の処理能力を拡張する。</div>
              <div className="dept-count">120+ AGENTS</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <h2>才能を"ミックス"して、<br />次の事業の章を書こう。</h2>
          <p>私たちのチームに興味がある方、また採用・協業については Careers ページをご覧ください。</p>
          <Link href="/careers" className="btn-primary">採用情報を見る →</Link>
        </div>
      </section>
    </>
  );
}
