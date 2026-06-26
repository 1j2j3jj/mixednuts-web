import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Marketing — グロースマーケティングと統合広告運用",
  description: "広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。LTV/CAC最適化、SEO/AIO、クリエイティブ戦略まで。",
  alternates: { canonical: "/services/marketing" },
};

const marketingWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden && w.services.includes("marketing")).slice(0, 3);

const serviceMenu = [
  { num: "01", title: "広告運用（Google / Meta / TikTok）", desc: "キャンペーン構造の設計から入札戦略、クリエイティブ最適化まで。AIを活用した自動入札設定と、人間の目によるCV品質管理を組み合わせ、ROASとCPAの両立を実現します。" },
  { num: "02", title: "SEO / AIO 戦略", desc: "Google AI Overviews 対応の構造化データ実装、E-E-A-T強化、LLMO対策を包括的に実行。検索意図分析からコンテンツ設計、内部リンク最適化まで一気通貫で支援します。" },
  { num: "03", title: "グロースマーケティング設計", desc: "ICP再定義、ファネル設計、CAC/LTV計算、コホート分析、グロースモデル構築。マーケ投資の最適な配分と、再現性ある成長のエンジンを設計します。" },
  { num: "04", title: "LTV / CAC 最適化", desc: "顧客ライフタイムバリューと獲得コストのバランスを最適化。サブスク型ビジネス、D2C、SaaSに対応したユニットエコノミクス分析と施策立案。" },
  { num: "05", title: "コンテンツマーケティング", desc: "SNSコンテンツ戦略、ブログ・メディア設計、動画広告クリエイティブ制作。AIで量を確保し、人間が品質をコントロールする2段階プロセスで効率と効果を両立。" },
  { num: "06", title: "計測・分析基盤", desc: "GA4設定、GTM最適化、拡張コンバージョン実装、アトリビューション設計。「データが信頼できる」状態を作ることで、意思決定の精度を上げます。" },
];

const aiFeatures = [
  { num: "01", title: "AI クリエイティブ生成", desc: "画像・動画・テキストのクリエイティブ生成をAIで自動化。週20本以上の広告クリエイティブを低コストで量産し、勝ちパターンを素早く特定。" },
  { num: "02", title: "自動分析・レポーティング", desc: "Google Ads、Meta Ads、GA4のデータを自動収集・分析し、週次レポートを自動生成。分析にかかる時間を90%削減。" },
  { num: "03", title: "検索意図・SEO 分析", desc: "膨大なキーワードの検索意図分類、競合コンテンツ分析、構造化データ最適化をAIで自動化。人間は戦略判断に集中。" },
];

const proofStats = [
  { num: "+170%", label: "ROAS 改善の実例" },
  { num: "-60%", label: "CPA 削減の実例" },
  { num: "+340%", label: "AI Overviews 引用率" },
  { num: "3媒体", label: "Google / Meta / TikTok 対応" },
];

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

      {/* ===== HERO ===== */}
      <header className="subhero">
        <canvas className="hero-fx fxgen" data-count="60" data-interactive aria-hidden="true" />
        <div className="hero-orb o1" data-parallax="0.34" data-mouse="0.05" aria-hidden="true" />
        <div className="hero-orb o2" data-parallax="0.22" data-mouse="0.035" aria-hidden="true" />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap subhero-inner">
          <div className="crumb reveal">
            <Link href="/">Home</Link> / <Link href="/services">Services</Link> / Marketing
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Marketing &amp; Growth
          </div>
          <h1 className="big-title-jp reveal">
            評論家ではなく、
            <br />
            <em>現場で実行する</em>チーム。
          </h1>
          <p className="subhero-lead reveal" style={{ marginTop: 18 }}>
            広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ、再現性のある成長設計です。
          </p>
          <div className="subhero-meta reveal">
            {proofStats.map((s) => (
              <div key={s.label}>
                <div className="k">{s.num}</div>
                <div className="l">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ===== INTRO ===== */}
      <section className="sec white">
        <div className="wrap">
          <p className="lead-lg reveal" style={{ maxWidth: 880 }}>
            「やってみます」ではなく、「これをやります、なぜなら〜」。数字を起点に、再現性のある成長を設計します。
          </p>
        </div>
      </section>

      {/* ===== SERVICE MENU ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> What We Offer
            </div>
            <h2 className="title reveal">グロースマーケティングの6領域。</h2>
            <p className="lead-lg reveal" style={{ maxWidth: 760, marginTop: 18 }}>
              数字を起点に、実行します。
            </p>
          </div>
          <div className="vgrid three">
            {serviceMenu.map((s) => (
              <div key={s.num} className="vcard reveal">
                <div className="vn">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI × MARKETING ===== */}
      <section className="sec" style={{ background: "#0A0A0A" }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow reveal">
              <i className="pulse" /> AI × Marketing
            </div>
            <h2 className="title reveal" style={{ color: "#fff" }}>
              AIで、マーケの<em>生産性</em>を3倍に。
            </h2>
          </div>
          <div className="proc">
            {aiFeatures.map((f) => (
              <div key={f.num} className="proc-step reveal">
                <div className="proc-n">{f.num}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CASES ===== */}
      {marketingWorks.length > 0 && (
        <section className="sec white">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Case Studies
              </div>
              <h2 className="title reveal">
                マーケティング支援の<em>実績</em>。
              </h2>
            </div>
            <div className="vgrid three">
              {marketingWorks.map((w) => (
                <Link key={w.slug} href={`/works/${w.slug}`} className="vcard reveal">
                  <div className="vn">{w.industry}</div>
                  <h4>{w.title}</h4>
                  <div className="work-nums" style={{ borderColor: "rgba(10,10,10,.14)", margin: "18px 0" }}>
                    {w.metric.slice(0, 2).map((m) => (
                      <div key={m.label}>
                        <span className="wl" style={{ color: "#9CA3AF" }}>{m.label}</span>
                        <span className="wv">{m.value}</span>
                      </div>
                    ))}
                  </div>
                  <p>{w.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="cta">
        <div className="cta-photo" data-parallax="0.16" aria-hidden="true" />
        <canvas className="cta-fx fxgen" data-count="46" aria-hidden="true" />
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s build together
          </div>
          <h2 className="cta-h reveal">
            成長の再現性を、
            <br />
            <em>一緒に設計しましょう。</em>
          </h2>
          <p className="reveal">
            広告費の無駄をなくし、LTVを高め、オーガニックを育てる。60分の無料相談から始めましょう。
          </p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>無料相談を申し込む</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
