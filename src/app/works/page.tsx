import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import WorksList from "./WorksList";

const visibleWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden);

export const metadata: Metadata = {
  title: "Works — 数字で語る、実績ケース",
  description:
    "戦略・AI・マーケティングの実績一覧。業種・規模・課題別にケースを掲載。守秘義務のため全て匿名化。",
};

export default function WorksPage() {
  return (
    <>
      <style>{`
        .works-filters {
          background: var(--off-white); padding: 32px 32px 0;
          border-bottom: 1px solid rgba(10,10,10,0.08);
          position: sticky; top: 70px; z-index: 50;
        }
        .works-filters-inner { max-width: 1280px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-bottom: 24px; }
        .filter-label { font-family: var(--font-sans-en); font-size: 11px; color: var(--gray-400); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-right: 8px; }
        .filter-tag {
          padding: 8px 16px; background: var(--off-white); border: 1px solid rgba(10,10,10,0.15);
          border-radius: 999px; font-size: 13px; color: var(--gray-600); font-family: inherit;
          cursor: pointer; transition: all 0.18s ease; display: inline-flex; align-items: center; gap: 8px;
        }
        .filter-tag:hover { border-color: var(--charcoal); color: var(--charcoal); }
        .filter-tag.active { background: var(--charcoal); color: var(--off-white); border-color: var(--charcoal); }
        .filter-count {
          display: inline-block; font-family: var(--font-sans-en); font-size: 11px; font-weight: 700;
          padding: 1px 7px; border-radius: 999px;
          background: rgba(10,10,10,0.08); color: inherit;
        }
        .filter-tag.active .filter-count { background: rgba(245,241,232,0.2); }

        .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .case-card {
          background: var(--off-white); border: 1px solid rgba(10,10,10,0.08); border-radius: 20px;
          overflow: hidden; transition: all 0.3s; text-decoration: none; color: inherit; display: block;
        }
        .case-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(10,10,10,0.08); border-color: var(--charcoal); }
        .case-image { aspect-ratio: 16/9; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .case-bg-ai { background: linear-gradient(135deg, var(--charcoal) 0%, var(--charcoal-soft) 100%); }
        .case-bg-strategy { background: linear-gradient(135deg, var(--charcoal-soft) 0%, var(--charcoal) 100%); }
        .case-bg-marketing { background: linear-gradient(135deg, var(--charcoal) 0%, #141414 100%); }
        .case-tag-badge {
          position: absolute; top: 16px; left: 16px; z-index: 2;
          background: var(--off-white); color: var(--charcoal);
          padding: 4px 10px; border-radius: 4px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em; font-family: var(--font-sans-en);
        }
        .case-body { padding: 28px; }
        .case-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; font-size: 12px; color: var(--gray-400); }
        .case-industry { padding: 3px 10px; background: var(--off-white-alt); color: var(--gray-600); border-radius: 4px; font-size: 11px; font-weight: 600; }
        .case-title { font-family: 'Noto Sans JP', sans-serif; font-size: 17px; font-weight: 700; margin-bottom: 14px; line-height: 1.5; min-height: 54px; color: var(--charcoal); word-break: keep-all; }
        .case-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px 0; border-top: 1px solid rgba(10,10,10,0.08); border-bottom: 1px solid rgba(10,10,10,0.08); margin-bottom: 14px; }
        .case-metric-label { font-size: 10px; color: var(--gray-400); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; font-family: var(--font-sans-en); }
        .case-metric-value { font-family: var(--font-sans-jp); font-size: 18px; font-weight: 900; color: var(--charcoal); line-height: 1.1; }
        .case-metric-value.gain { color: var(--color-success, #10B981); }
        .case-desc { font-size: 12px; color: var(--gray-600); line-height: 1.7; }
        @media (max-width: 900px) {
          .cases-grid { grid-template-columns: 1fr; }
          .works-filters { position: static; padding: 16px 20px 0; }
          .filter-tag { font-size: 12px; padding: 6px 12px; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / Works</div>
          <div className="page-hero-badge">Case Studies</div>
          <h1>
            <span style={{ display: "block" }}>Coming</span>
            <span style={{ display: "block" }}><span className="accent">Soon</span>。</span>
          </h1>
          <p className="lead">
            戦略 × AI × マーケで積み上げてきた実績ケースを、守秘義務に配慮しながら順次公開していきます。近日アップデート予定です。
          </p>
        </div>
      </section>

      {CASES_COMING_SOON ? (
        <section style={{ padding: "80px 32px 120px", background: "var(--off-white)" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-sans-en)", fontSize: 11, letterSpacing: "0.2em",
              color: "var(--gray-400)", fontWeight: 700, marginBottom: 24
            }}>
              UPDATING · 近日公開予定
            </div>
            <h2 style={{
              fontFamily: "var(--font-sans-jp)", fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 900, color: "var(--charcoal)", lineHeight: 1.3,
              marginBottom: 24, wordBreak: "keep-all"
            }}>
              ケース一覧を<br />リニューアル中です。
            </h2>
            <p style={{
              color: "#4B5563", fontSize: 15, lineHeight: 1.9, maxWidth: 640,
              margin: "0 auto 40px", wordBreak: "keep-all"
            }}>
              匿名化と数字の精査を改めて行い、業種・規模・課題別に整理した形で順次公開します。
              特定ケースについてのお問い合わせは、個別にご連絡ください。
            </p>
            <Link href="/contact" className="btn-primary">お問い合わせ →</Link>
          </div>
        </section>
      ) : (
        <WorksList works={visibleWorks} />
      )}

      <section className="cta">
        <div className="cta-inner">
          <h2>
            <span style={{ display: "block" }}>次の成功事例を、</span>
            <span style={{ display: "block" }}>あなたと一緒につくりたい。</span>
          </h2>
          <p>まずは課題をお聞かせください。60分の無料相談で、最適なアプローチをご提案します。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
