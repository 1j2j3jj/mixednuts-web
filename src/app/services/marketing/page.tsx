import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Marketing — グロースマーケティングと統合広告運用",
  description: "広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。LTV/CAC最適化、SEO/AIO、クリエイティブ戦略まで。",
};

const marketingWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden && w.services.includes("marketing")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/marketing#service",
  name: "Marketing & Growth",
  serviceType: "Growth Marketing / Ad Operations",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description:
    "広告運用（Google/Meta/TikTok）、グロースマーケ設計、SEO/AIO戦略、LTV/CAC最適化、コンテンツマーケ、ブランド戦略まで統合提供。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/marketing",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Marketing", path: "/services/marketing" },
]);

export default function ServiceMarketingPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumb} />
      <style>{`
        .page-hero-marketing { background: var(--off-white); }
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
        .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .case-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; transition: all 0.3s; text-decoration: none; color: inherit; display: block; }
        .case-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); border-color: var(--navy); }
        .case-header { margin-bottom: 16px; }
        .case-sector { padding: 4px 10px; background: var(--navy); color: #fff; font-size: 11px; border-radius: 4px; font-weight: 600; }
        .case-title { font-family: var(--font-serif-jp); font-size: 17px; font-weight: 700; margin-bottom: 16px; line-height: 1.5; margin-top: 12px; }
        .case-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px; }
        .case-metric-label { font-size: 10px; color: #9CA3AF; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; }
        .case-metric-value { font-family: var(--font-serif-en); font-size: 22px; font-weight: 700; color: var(--navy); line-height: 1; }
        .case-metric-value.gain { color: var(--success); }
        .ai-marketing { background: #F9FAFB; }
        .ai-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .ai-feature { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; }
        .ai-feature .icon { font-size: 36px; margin-bottom: 16px; }
        .ai-feature h3 { font-family: var(--font-serif-jp); font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
        .ai-feature p { font-size: 13px; color: #4B5563; line-height: 1.7; }
        @media (max-width: 900px) {
          .proof-bar-inner, .service-menu, .cases-grid, .ai-features { grid-template-columns: 1fr; }
          .proof-bar-inner { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <section className="page-hero page-hero-marketing">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/services">Services</Link> / Marketing</div>
          <div className="page-hero-badge">Marketing & Growth</div>
          <h1>評論家ではなく、<br /><span className="accent">現場で実行する</span>チーム。</h1>
          <p className="lead">
            広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ、再現性のある成長設計です。
          </p>
        </div>
      </section>

      {/* Proof bar */}
      <section className="proof-bar">
        <div className="proof-bar-inner">
          <div className="proof-stat"><div className="num">+170%</div><div className="label">ROAS 改善の実例</div></div>
          <div className="proof-stat"><div className="num">-60%</div><div className="label">CPA 削減の実例</div></div>
          <div className="proof-stat"><div className="num">+340%</div><div className="label">AI Overviews 引用率</div></div>
          <div className="proof-stat"><div className="num">3媒体</div><div className="label">Google / Meta / TikTok 対応</div></div>
        </div>
      </section>

      {/* Service menu */}
      <section className="section">
        <div className="section-inner">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">グロースマーケティングの6領域。</h2>
          <p className="section-lead">「やってみます」ではなく、「これをやります、なぜなら〜」。数字を起点に、実行します。</p>
          <div className="service-menu">
            {[
              { num: "01", title: "広告運用（Google / Meta / TikTok）", desc: "キャンペーン構造の設計から入札戦略、クリエイティブ最適化まで。AIを活用した自動入札設定と、人間の目によるCV品質管理を組み合わせ、ROASとCPAの両立を実現します。" },
              { num: "02", title: "SEO / AIO 戦略", desc: "Google AI Overviews 対応の構造化データ実装、E-E-A-T強化、LLMO対策を包括的に実行。検索意図分析からコンテンツ設計、内部リンク最適化まで一気通貫で支援します。" },
              { num: "03", title: "グロースマーケティング設計", desc: "ICP再定義、ファネル設計、CAC/LTV計算、コホート分析、グロースモデル構築。マーケ投資の最適な配分と、再現性ある成長のエンジンを設計します。" },
              { num: "04", title: "LTV / CAC 最適化", desc: "顧客ライフタイムバリューと獲得コストのバランスを最適化。サブスク型ビジネス、D2C、SaaSに対応したユニットエコノミクス分析と施策立案。" },
              { num: "05", title: "コンテンツマーケティング", desc: "SNSコンテンツ戦略、ブログ・メディア設計、動画広告クリエイティブ制作。AIで量を確保し、人間が品質をコントロールする2段階プロセスで効率と効果を両立。" },
              { num: "06", title: "計測・分析基盤", desc: "GA4設定、GTM最適化、拡張コンバージョン実装、アトリビューション設計。「データが信頼できる」状態を作ることで、意思決定の精度を上げます。" },
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

      {/* AI × Marketing */}
      <section className="section ai-marketing">
        <div className="section-inner">
          <span className="section-label">AI × Marketing</span>
          <h2 className="section-title">AIで、マーケの生産性を3倍に。</h2>
          <p className="section-lead">クリエイティブ制作、データ分析、レポーティング——AIで自動化できる工程を徹底的に効率化し、人間はより高度な判断に集中します。</p>
          <div className="ai-features">
            <div className="ai-feature">
              <div className="icon">02</div>
              <h3>AI クリエイティブ生成</h3>
              <p>画像・動画・テキストのクリエイティブ生成をAIで自動化。週20本以上の広告クリエイティブを低コストで量産し、勝ちパターンを素早く特定。</p>
            </div>
            <div className="ai-feature">
              <div className="icon">01</div>
              <h3>自動分析・レポーティング</h3>
              <p>Google Ads、Meta Ads、GA4のデータを自動収集・分析し、週次レポートを自動生成。分析にかかる時間を90%削減。</p>
            </div>
            <div className="ai-feature">
              <div className="icon">03</div>
              <h3>検索意図・SEO 分析</h3>
              <p>膨大なキーワードの検索意図分類、競合コンテンツ分析、構造化データ最適化をAIで自動化。人間は戦略判断に集中。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cases */}
      {marketingWorks.length > 0 && (
        <section className="section">
          <div className="section-inner">
            <span className="section-label">Case Studies</span>
            <h2 className="section-title">マーケティング支援の実績。</h2>
            <div className="cases-grid">
              {marketingWorks.map((w) => (
                <Link key={w.slug} href={`/works/${w.slug}`} className="case-card">
                  <div className="case-header">
                    <span className="case-sector">{w.industry}</span>
                  </div>
                  <div className="case-title">{w.title}</div>
                  <div className="case-metrics">
                    {w.metric.slice(0, 2).map((m) => (
                      <div key={m.label}>
                        <div className="case-metric-label">{m.label}</div>
                        <div className={`case-metric-value ${m.value.startsWith('+') ? 'gain' : ''}`}>{m.value}</div>
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
          <h2>成長の再現性を、<br />一緒に設計しましょう。</h2>
          <p>広告費の無駄をなくし、LTVを高め、オーガニックを育てる。60分の無料相談から始めましょう。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
