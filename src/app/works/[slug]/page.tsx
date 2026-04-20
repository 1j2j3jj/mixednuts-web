import type { Metadata } from "next";
import Link from "next/link";
import { works, type Work } from "@/data/works";
import { notFound } from "next/navigation";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return works.filter((w) => !w.hidden).map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);
  if (!work || work.hidden) return {};
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
  if (!work || work.hidden) notFound();

  const primaryService = work.services[0];
  const heroBg = bgMap[primaryService] || bgMap.strategy;
  const relatedWorks = works
    .filter((w) => !w.hidden && w.slug !== slug && w.services.some((s) => work.services.includes(s)))
    .slice(0, 3);

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `https://mixednuts-inc.com/works/${work.slug}#case`,
    name: work.title,
    description: work.summary,
    about: work.industry,
    creator: { "@id": "https://mixednuts-inc.com/#organization" },
    inLanguage: "ja-JP",
    keywords: work.services.join(", "),
    image: `https://mixednuts-inc.com${work.image}`,
    url: `https://mixednuts-inc.com/works/${work.slug}`,
  };

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Works", path: "/works" },
    { name: work.title, path: `/works/${work.slug}` },
  ]);

  return (
    <>
      <JsonLd data={creativeWorkSchema} />
      <JsonLd data={breadcrumb} />
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
        .phase-list { display: grid; gap: 20px; margin-top: 32px; }
        .phase-item { background: var(--off-white); border: 1px solid rgba(10,10,10,0.08); border-radius: 16px; padding: 28px 32px; }
        .phase-item .phase-tag { display: inline-block; font-family: var(--font-sans-en); font-size: 11px; letter-spacing: 0.2em; font-weight: 700; color: var(--cyan); margin-bottom: 10px; }
        .phase-item h3 { font-family: 'Noto Sans JP', sans-serif; font-size: 17px; font-weight: 900; color: var(--charcoal); margin-bottom: 10px; line-height: 1.4; word-break: keep-all; }
        .phase-item p { font-size: 14px; line-height: 1.8; color: #4B5563; margin: 0; }
        .content-section ul { margin: 16px 0 28px; padding: 0; list-style: none; }
        .content-section ul li { padding: 12px 0 12px 28px; font-size: 15px; line-height: 1.85; color: #4B5563; position: relative; border-bottom: 1px solid rgba(10,10,10,0.06); }
        .content-section ul li:last-child { border-bottom: none; }
        .content-section ul li::before { content: '▸'; position: absolute; left: 6px; color: var(--cyan); font-weight: 700; }
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

      {/* 背景 */}
      <section className="content-section alt">
        <div className="content-inner">
          <span className="section-label">Background</span>
          <h2>業界背景</h2>
          <p>{work.background}</p>
        </div>
      </section>

      {/* 課題 */}
      <section className="content-section">
        <div className="content-inner">
          <span className="section-label">Challenge</span>
          <h2>どういう課題があったか</h2>
          <p>{work.challenge}</p>
          {work.challengeDetail && work.challengeDetail.length > 0 && (
            <ul>
              {work.challengeDetail.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {work.quote && <div className="quote-box">{work.quote}</div>}
        </div>
      </section>

      {/* 立場 */}
      {work.role && (
        <section className="content-section alt">
          <div className="content-inner">
            <span className="section-label">Role</span>
            <h2>どういう立場で関わったか</h2>
            <p>{work.role}</p>
          </div>
        </section>
      )}

      {/* 取組 */}
      <section className="content-section">
        <div className="content-inner">
          <span className="section-label">Approach</span>
          <h2>どう取り組んだか</h2>
          <p>{work.approach}</p>
          {work.approachPhases && work.approachPhases.length > 0 && (
            <div className="phase-list">
              {work.approachPhases.map((ph) => (
                <div className="phase-item" key={ph.phase}>
                  <div className="phase-tag">{ph.phase}</div>
                  <h3>{ph.title}</h3>
                  <p>{ph.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 解決・成果 */}
      {(work.resolution || (work.outcomes && work.outcomes.length > 0)) && (
        <section className="content-section alt">
          <div className="content-inner">
            <span className="section-label">Resolution</span>
            <h2>どう解決したか</h2>
            {work.resolution && <p>{work.resolution}</p>}
            {work.outcomes && work.outcomes.length > 0 && (
              <ul>
                {work.outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* 提供価値 */}
      {work.deliverables && work.deliverables.length > 0 && (
        <section className="content-section">
          <div className="content-inner">
            <span className="section-label">Deliverables</span>
            <h2>提供価値</h2>
            <ul>
              {work.deliverables.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 学び */}
      {work.keyLearnings && work.keyLearnings.length > 0 && (
        <section className="content-section alt">
          <div className="content-inner">
            <span className="section-label">Key Learnings</span>
            <h2>得られた学び</h2>
            <ul>
              {work.keyLearnings.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 応用可能性 */}
      {work.applicableTo && (
        <section className="content-section">
          <div className="content-inner">
            <span className="section-label">Applicable To</span>
            <h2>類似ケースへの応用</h2>
            <p>{work.applicableTo}</p>
          </div>
        </section>
      )}

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
