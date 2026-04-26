import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import WorksList from "./WorksList";

const visibleWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden);

export const metadata: Metadata = {
  title: "Works — 数字で語る、実績ケース",
  description:
    "上場企業の経営管理から D2C のグロースまで、戦略・AI・マーケティングを横断したクライアントワーク。個別社名は守秘義務により非公開。NDA 締結後に類似案件の事例を共有。",
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
            <span style={{ display: "block" }}>数字で語る、</span>
            <span style={{ display: "block" }}><span className="accent">実績ケース</span>。</span>
          </h1>
          <p className="lead">
            上場企業の経営管理から D2C のグロースまで、戦略・AI・マーケティングを横断して関与してきました。個別社名は守秘義務のため伏せていますが、領域・規模・関与の深さは下記のとおりです。詳細ケースは NDA 締結後に個別共有します。
          </p>
        </div>
      </section>

      {CASES_COMING_SOON ? (
        <section style={{ padding: "80px 32px 120px", background: "var(--off-white)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{
              fontFamily: "var(--font-sans-en)", fontSize: 11, letterSpacing: "0.2em",
              color: "var(--gray-400)", fontWeight: 700, marginBottom: 16, textAlign: "center"
            }}>
              ENGAGEMENT AREAS · 主な関与領域
            </div>
            <h2 style={{
              fontFamily: "var(--font-sans-jp)", fontSize: "clamp(26px, 3.5vw, 36px)",
              fontWeight: 900, color: "var(--charcoal)", lineHeight: 1.4,
              marginBottom: 56, wordBreak: "keep-all", textAlign: "center"
            }}>
              何をやってきたか、を先に。
            </h2>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginBottom: 56
            }}>
              {[
                {
                  label: "Strategy & FP&A",
                  jp: "経営管理・財務戦略",
                  items: [
                    "上場企業の取締役会資料・月次定例",
                    "予実管理・事業計画・KPI 設計",
                    "投資判断・M&A デューデリジェンス",
                    "IR・エクイティストーリー支援",
                  ],
                  scale: "上場企業（時価総額 100 億〜数兆円）",
                },
                {
                  label: "AI & Organization",
                  jp: "AI・組織設計",
                  items: [
                    "AI エージェント組織の設計・運用",
                    "業務自動化（経理・レポート・分析）",
                    "Claude / Gemini / OpenAI 統合基盤",
                    "MCP・ノーコード連携の内製化",
                  ],
                  scale: "スタートアップ〜上場企業",
                },
                {
                  label: "Marketing & Growth",
                  jp: "マーケティング・グロース",
                  items: [
                    "Google Ads / Meta Ads 運用設計",
                    "計測基盤（GTM / GA4）整備",
                    "SEO・AIO・LLMO・構造化データ",
                    "CVR 改善・LP / フォーム最適化",
                  ],
                  scale: "月予算 数百万〜数千万円",
                },
              ].map((col) => (
                <div key={col.label} style={{
                  background: "#FFFFFF", border: "1px solid rgba(10,10,10,0.08)",
                  borderRadius: 16, padding: 28
                }}>
                  <div style={{
                    fontFamily: "var(--font-sans-en)", fontSize: 11, letterSpacing: "0.15em",
                    fontWeight: 700, color: "var(--gray-400)", marginBottom: 6
                  }}>{col.label}</div>
                  <div style={{
                    fontFamily: "var(--font-sans-jp)", fontSize: 18, fontWeight: 900,
                    color: "var(--charcoal)", marginBottom: 20, lineHeight: 1.4
                  }}>{col.jp}</div>
                  <ul style={{
                    listStyle: "none", padding: 0, margin: 0, marginBottom: 20,
                    fontSize: 13, lineHeight: 1.9, color: "#4B5563"
                  }}>
                    {col.items.map((it) => (
                      <li key={it} style={{
                        position: "relative", paddingLeft: 16, wordBreak: "keep-all"
                      }}>
                        <span style={{
                          position: "absolute", left: 0, top: "0.7em", width: 6, height: 1,
                          background: "var(--charcoal)"
                        }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div style={{
                    fontSize: 11, color: "var(--gray-400)", letterSpacing: "0.05em",
                    paddingTop: 14, borderTop: "1px solid rgba(10,10,10,0.06)"
                  }}>
                    対象規模：{col.scale}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{
                color: "#4B5563", fontSize: 14, lineHeight: 1.9, maxWidth: 680,
                margin: "0 auto 28px", wordBreak: "keep-all"
              }}>
                個別ケースは守秘義務のためサイト上では公開していません。<br />
                類似案件の関与内容・成果は NDA 締結後に共有しています。
              </p>
              <Link href="/contact" className="btn-primary">課題を相談する →</Link>
            </div>
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
