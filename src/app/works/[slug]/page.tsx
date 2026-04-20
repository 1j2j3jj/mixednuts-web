import type { Metadata } from "next";
import Link from "next/link";
import { works, type Work } from "@/data/works";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);
  if (!work) return {};
  return {
    title: `Case: ${work.title}`,
    description: work.summary,
  };
}

const serviceLabels: Record<string, string> = { ai: "AI", strategy: "Strategy", marketing: "Marketing" };
const bgMap: Record<string, string> = {
  ai: "linear-gradient(135deg, rgba(245,241,232,0.75) 0%, rgba(245,241,232,0.92) 100%)",
  strategy: "linear-gradient(135deg, rgba(245,241,232,0.75) 0%, rgba(245,241,232,0.92) 100%)",
  marketing: "linear-gradient(135deg, rgba(245,241,232,0.75) 0%, rgba(245,241,232,0.92) 100%)",
};

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);
  if (!work) notFound();

  const primaryService = work.services[0];
  const heroBg = bgMap[primaryService] || bgMap.strategy;
  const relatedWorks = works.filter((w) => w.slug !== slug && w.services.some((s) => work.services.includes(s))).slice(0, 3);

  return (
    <>
      <style>{`
        .case-hero {
          background: var(--off-white);
          color: var(--charcoal); padding: 140px 32px 80px;
          position: relative; overflow: hidden;
        }
        .case-hero-inner { position: relative; z-index: 2; max-width: 1280px; margin: 0 auto; }
        .case-tags-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
        .case-tag-pill { padding: 6px 14px; background: rgba(10,10,10,0.08); border-radius: 999px; font-size: 11px; letter-spacing: 0.12em; color: var(--charcoal); font-weight: 700; text-transform: uppercase; }
        .case-hero h1 { font-family: var(--font-sans-jp); font-size: clamp(36px, 5vw, 64px); line-height: 1.15; font-weight: 900; margin-bottom: 24px; max-width: 1100px; letter-spacing: -0.02em; color: var(--charcoal); }
        .case-hero .lead { color: #4B5563; font-size: 17px; line-height: 1.85; max-width: 720px; }
        .facts { background: var(--navy); color: #fff; padding: 40px 32px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .facts-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        .fact-label { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; }
        .fact-value { font-family: var(--font-serif-jp); font-size: 17px; font-weight: 700; color: #fff; line-height: 1.5; }
        .content-section { background: #fff; padding: 120px 32px; }
        .content-section.alt { background: #F9FAFB; }
        .content-inner { max-width: 900px; margin: 0 auto; }
        .content-section h2 { font-family: var(--font-serif-jp); font-size: clamp(28px, 4vw, 40px); line-height: 1.3; font-weight: 700; color: var(--navy); margin-bottom: 32px; }
        .content-section p { font-size: 16px; line-height: 2.0; color: #4B5563; margin-bottom: 20px; }
        .content-section ul { list-style: none; margin: 20px 0 32px; padding: 0; }
        .content-section ul li { padding: 12px 0 12px 28px; font-size: 15px; line-height: 1.8; color: #4B5563; position: relative; border-bottom: 1px solid #E5E7EB; }
        .content-section ul li::before { content: '▸'; position: absolute; left: 6px; color: var(--cyan); font-weight: 700; }
        .content-section ul li:last-child { border-bottom: none; }
        .metrics { background: #fff; padding: 120px 32px; }
        .metrics-inner { max-width: 1280px; margin: 0 auto; }
        .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px; }
        .metric-card { background: linear-gradient(135deg, var(--navy) 0%, #13224E 100%); color: #fff; border-radius: 20px; padding: 48px 32px; position: relative; overflow: hidden; }
        .metric-card::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 80% 80%, rgba(0,180,216,0.2) 0%, transparent 60%); }
        .metric-card-inner { position: relative; z-index: 2; }
        .metric-label { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px; }
        .metric-value { font-family: var(--font-serif-en); font-size: 72px; font-weight: 900; line-height: 1; margin-bottom: 16px; letter-spacing: -0.03em; }
        .metric-desc { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.7; }
        .quote-box { background: #F9FAFB; border: 1px solid var(--border, #E5E7EB); padding: 32px; border-radius: 4px; margin: 40px 0; font-family: var(--font-serif-jp); font-size: 17px; line-height: 1.9; color: var(--navy); font-style: italic; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .related-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: all 0.3s; }
        .related-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); border-color: var(--navy); }
        .related-visual { aspect-ratio: 16/9; position: relative; }
        .related-body { padding: 24px; }
        .related-title { font-family: var(--font-serif-jp); font-size: 17px; font-weight: 700; color: #1A1A1A; line-height: 1.5; margin-bottom: 8px; }
        .related-metric { font-family: var(--font-serif-en); font-size: 20px; font-weight: 700; color: var(--success); }
        @media (max-width: 900px) {
          .facts-inner { grid-template-columns: 1fr 1fr; }
          .metrics-grid { grid-template-columns: 1fr; }
          .related-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="case-hero">
        <div className="case-hero-inner">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / <Link href="/works">Works</Link> / {work.industry}
          </div>
          <div className="case-tags-row">
            {work.services.map((s) => (
              <span key={s} className="case-tag-pill">{serviceLabels[s]}</span>
            ))}
            <span className="case-tag-pill">{work.industry}</span>
          </div>
          <h1>{work.title}</h1>
          <p className="lead">{work.summary}</p>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="facts">
        <div className="facts-inner">
          <div><div className="fact-label">Industry</div><div className="fact-value">{work.industry}</div></div>
          <div><div className="fact-label">Client</div><div className="fact-value">{work.client}</div></div>
          <div><div className="fact-label">Services</div><div className="fact-value">{work.services.map((s) => serviceLabels[s]).join(" × ")}</div></div>
          <div><div className="fact-label">Key Result</div><div className="fact-value">{work.metric[0].label}: {work.metric[0].value}</div></div>
        </div>
      </section>

      {/* Metrics */}
      <section className="metrics">
        <div className="metrics-inner">
          <span className="section-label">Results</span>
          <h2 className="section-title">定量的な成果。</h2>
          <div className="metrics-grid">
            {work.metric.map((m) => (
              <div key={m.label} className="metric-card">
                <div className="metric-card-inner">
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value}</div>
                  <div className="metric-desc">プロジェクト期間中の達成値</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Challenge */}
      <section className="content-section alt">
        <div className="content-inner">
          <h2>課題と背景</h2>
          <p>
            クライアントは既存の業務プロセスに課題を抱えており、手作業・属人化・データ分散が複合的に絡み合っていました。意思決定に必要な情報が適時に届かず、経営判断の精度と速度に影響が出ている状況でした。
          </p>
          <p>
            また、競合環境の変化スピードに対応するため、従来の月次サイクルでの振り返りだけでなく、リアルタイムに近い粒度での数値把握が求められていました。
          </p>
          <div className="quote-box">
            「毎月の締め作業に追われ、本来やるべき分析と提言に時間を使えていない。その構造を変えてほしい」— クライアント担当者
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="content-section">
        <div className="content-inner">
          <h2>mixednuts のアプローチ</h2>
          <p>
            単なる「ツール導入」ではなく、業務プロセスの再設計から着手しました。まず現状の業務フローを全て可視化し、どこに工数が集中しているか、どこがボトルネックになっているかを特定。そのうえで、AIで自動化すべき工程と、人間が判断・介在すべき工程を明確に分離しました。
          </p>
          <ul>
            <li>Phase 1（1-2ヶ月）: 現状業務のAS-ISマッピングと工数計測</li>
            <li>Phase 2（3-4ヶ月）: TO-BE設計とAIエージェントのプロトタイプ構築</li>
            <li>Phase 3（5-8ヶ月）: 段階的な本番移行と品質検証</li>
            <li>Phase 4（9-12ヶ月）: 安定運用と継続的な改善サイクル確立</li>
          </ul>
          <p>
            実装にあたっては、クライアントの既存システム（ERP、スプレッドシート、データウェアハウス）との統合を最優先し、既存の業務習慣を尊重した設計を心がけました。
          </p>
        </div>
      </section>

      {/* Related */}
      {relatedWorks.length > 0 && (
        <section className="content-section alt" style={{padding: '120px 32px'}}>
          <div style={{maxWidth: 1280, margin: '0 auto'}}>
            <span className="section-label">Related Cases</span>
            <h2 className="section-title">関連する事例。</h2>
            <div className="related-grid">
              {relatedWorks.map((rw) => (
                <Link key={rw.slug} href={`/works/${rw.slug}`} className="related-card">
                  <div className="related-visual" style={{background: `linear-gradient(135deg, rgba(11,22,52,0.7), rgba(19,34,78,0.9)), url('${rw.image}') center/cover no-repeat`}} />
                  <div className="related-body">
                    <div className="related-title">{rw.title}</div>
                    <div className="related-metric">{rw.metric[0].label}: {rw.metric[0].value}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cta">
        <div className="cta-inner">
          <h2>同様の成果を、<br />あなたの事業でも。</h2>
          <p>事例についての詳細や、貴社での適用可能性について、まずはお気軽にご相談ください。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
