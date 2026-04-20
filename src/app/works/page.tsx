import type { Metadata } from "next";
import Link from "next/link";
import { works } from "@/data/works";

export const metadata: Metadata = {
  title: "Works — 数字で語る、15+ の成功事例",
  description: "戦略・AI・マーケティングの実績一覧。業種・規模・課題別に12+ケースを掲載。全て匿名化済み。",
};

const bgClasses: Record<string, string> = {
  ai: "case-bg-ai",
  strategy: "case-bg-strategy",
  marketing: "case-bg-marketing",
};

const serviceLabels: Record<string, string> = {
  ai: "AI",
  strategy: "Strategy",
  marketing: "Marketing",
};

export default function WorksPage() {
  return (
    <>
      <style>{`
        .works-filters {
          background: #fff; padding: 32px 32px 0;
          border-bottom: 1px solid #E5E7EB;
        }
        .works-filters-inner { max-width: 1280px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-bottom: 24px; }
        .filter-label { font-size: 11px; color: #9CA3AF; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-right: 8px; }
        .filter-tag { padding: 8px 16px; background: #fff; border: 1px solid #D1D5DB; border-radius: 999px; font-size: 13px; color: #4B5563; }
        .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .case-card {
          background: #fff; border: 1px solid #E5E7EB; border-radius: 20px;
          overflow: hidden; transition: all 0.3s; text-decoration: none; color: inherit; display: block;
        }
        .case-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(11,22,52,0.08); border-color: var(--navy); }
        .case-image { aspect-ratio: 16/9; position: relative; display: flex; align-items: center; justify-content: center; font-size: 64px; color: rgba(255,255,255,0.15); overflow: hidden; }
        .case-bg-ai { background: linear-gradient(135deg, #064A5C 0%, var(--navy) 100%); }
        .case-bg-strategy { background: linear-gradient(135deg, var(--navy) 0%, var(--burgundy) 100%); }
        .case-bg-marketing { background: linear-gradient(135deg, var(--burgundy) 0%, #A67B47 100%); }
        .case-image img { width: 100%; height: 100%; object-fit: cover; opacity: 0.4; position: absolute; inset: 0; }
        .case-tag-badge {
          position: absolute; top: 16px; left: 16px;
          background: rgba(255,255,255,0.95); color: var(--navy);
          padding: 4px 10px; border-radius: 4px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
        }
        .case-body { padding: 28px; }
        .case-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #9CA3AF; }
        .case-industry { padding: 3px 10px; background: #F9FAFB; color: #4B5563; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .case-title { font-family: var(--font-serif-jp); font-size: 18px; font-weight: 700; margin-bottom: 14px; line-height: 1.5; min-height: 54px; color: #1A1A1A; }
        .case-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-bottom: 14px; }
        .case-metric-label { font-size: 10px; color: #9CA3AF; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        .case-metric-value { font-family: var(--font-serif-en); font-size: 22px; font-weight: 700; color: var(--navy); line-height: 1; }
        .case-metric-value.gain { color: var(--success); }
        .case-desc { font-size: 12px; color: #4B5563; line-height: 1.7; }
        @media (max-width: 900px) {
          .cases-grid { grid-template-columns: 1fr; }
          .works-filters { display: none; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / Works</div>
          <div className="page-hero-badge">Case Studies</div>
          <h1>数字で語る、<br /><span className="accent">15+ の成功事例</span>。</h1>
          <p className="lead">
            業種・規模・フェーズを問わず、戦略×AI×マーケで成果を出してきました。守秘義務のため全て匿名化していますが、業種・期間・定量指標で具体性を担保しています。
          </p>
        </div>
      </section>

      <div className="works-filters">
        <div className="works-filters-inner">
          <span className="filter-label">Service</span>
          <span className="filter-tag">All</span>
          <span className="filter-tag">Strategy</span>
          <span className="filter-tag">AI Implementation</span>
          <span className="filter-tag">Marketing &amp; Growth</span>
        </div>
      </div>

      <section className="section" style={{background: '#F9FAFB'}}>
        <div className="section-inner">
          <div className="cases-grid">
            {works.map((work) => {
              const primaryService = work.services[0];
              const bgClass = bgClasses[primaryService] || "case-bg-strategy";
              const serviceLabel = work.services.map((s) => serviceLabels[s]).join(" × ");

              return (
                <Link key={work.slug} href={`/works/${work.slug}`} className="case-card">
                  <div className={`case-image ${bgClass}`}>
                    <img src={work.image} alt={work.title} />
                    <span className="case-tag-badge">{serviceLabel}</span>
                  </div>
                  <div className="case-body">
                    <div className="case-header">
                      <span className="case-industry">{work.industry}</span>
                    </div>
                    <div className="case-title">{work.title}</div>
                    <div className="case-metrics">
                      {work.metric.slice(0, 2).map((m) => (
                        <div key={m.label}>
                          <div className="case-metric-label">{m.label}</div>
                          <div className={`case-metric-value ${m.value.startsWith('+') || m.value.includes('x') ? 'gain' : ''}`}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="case-desc">{work.summary}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <h2>次の成功事例を、<br />あなたと一緒につくりたい。</h2>
          <p>まずは課題をお聞かせください。60分の無料相談で、最適なアプローチをご提案します。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
