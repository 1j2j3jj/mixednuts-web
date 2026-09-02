import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { works, CASES_COMING_SOON } from "@/data/works";
import { buildPageOg } from "@/lib/site-metadata";
import ServiceDetailMotion from "../ServiceDetailMotion";
import "../v6-services.css";

const pageTitle = "Marketing — グロースマーケティングと統合広告運用";
const pageDescription =
  "広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。LTV/CAC最適化、SEO/AIO、クリエイティブ戦略まで。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services/marketing" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services/marketing" }),
};

const marketingWorks = CASES_COMING_SOON
  ? []
  : works.filter((work) => !work.hidden && work.services.includes("marketing")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/marketing#service",
  name: "Marketing & Growth",
  serviceType: "Growth Marketing / Ad Operations",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description: "広告運用（Google/Meta/TikTok）、グロースマーケ設計、SEO/AIO戦略、LTV/CAC最適化、コンテンツマーケ、ブランド戦略まで統合提供。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/marketing",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Marketing", path: "/services/marketing" },
]);

const proof = [["+170%", "ROAS 改善の実例"], ["-60%", "CPA 削減の実例"], ["+340%", "AI Overviews 引用率"], ["3媒体", "Google / Meta / TikTok 対応"]];

const offerings = [
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

export default function ServiceMarketingPage() {
  return (
    <div className="mn-v6 mn-v6-services">
      <JsonLd data={serviceSchema} /><JsonLd data={breadcrumb} />
      <ServiceDetailMotion act={3} />
      <main>
        <section className="v6-scene sv6-detail-hero" aria-labelledby="marketing-title">
          <div className="v6-scene-inner sv6-detail-hero-inner">
            <p className="v6-kicker sv6-detail-overline">Act III · Marketing &amp; Growth</p>
            <h1 id="marketing-title" className="v6-en-display sv6-detail-title"><span>MAKE</span><br /><span>GROWTH</span><br /><span className="v6-accent">REPEAT.</span></h1>
            <div className="sv6-detail-bottom"><p className="sv6-detail-lead v6-jp-heading">評論家ではなく、<br />現場で実行するチーム。</p><p className="sv6-detail-meta">Growth / Ads / SEO &amp; AIO</p></div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="marketing-intro-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker v6-kicker--paper">Mandate · Repeatable Growth</p><h2 id="marketing-intro-title" className="v6-jp-heading">数字を起点に、<br />現場で実行する。</h2><p>広告代理店シニアディレクターと事業会社マーケ責任者が、広告運用とグロース戦略を統合提供。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ、再現性のある成長設計です。</p></header>
            <div className="sv6-rows">{proof.map(([value, label], index) => <div className="sv6-row" data-sv6-reveal key={label}><span className="sv6-row-no">0{index + 1}</span><h3 className="v6-en-display">{value}</h3><div className="sv6-row-copy"><p>{label}</p></div></div>)}</div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="marketing-offer-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker v6-kicker--paper">What We Offer · Six Fields</p><h2 id="marketing-offer-title" className="v6-jp-heading">グロースマーケティングの<br />6領域。</h2><p>「やってみます」ではなく、「これをやります、なぜなら〜」。数字を起点に、実行します。</p></header>
            <ol className="sv6-rows">{offerings.map((offering) => <li className="sv6-row" data-sv6-reveal key={offering.num}><span className="sv6-row-no">{offering.num}</span><h3 className="v6-jp-heading">{offering.title}</h3><div className="sv6-row-copy"><p>{offering.desc}</p></div></li>)}</ol>
          </div>
        </section>

        <section className="v6-scene sv6-editorial sv6-ink-editorial" aria-labelledby="marketing-ai-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker">AI × Marketing</p><h2 id="marketing-ai-title" className="v6-jp-heading">AIで、マーケの<br />生産性を3倍に。</h2><p>クリエイティブ制作、データ分析、レポーティング——AIで自動化できる工程を徹底的に効率化し、人間はより高度な判断に集中します。</p></header>
            <div className="sv6-rows">{aiFeatures.map((feature) => <article className="sv6-row" data-sv6-reveal key={feature.num}><span className="sv6-row-no">{feature.num}</span><h3 className="v6-jp-heading">{feature.title}</h3><div className="sv6-row-copy"><p>{feature.desc}</p></div></article>)}</div>
          </div>
        </section>

        {marketingWorks.length > 0 && <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="marketing-cases-title"><div className="v6-scene-inner sv6-editorial-inner"><header className="sv6-section-head"><p className="v6-kicker v6-kicker--paper">Case Studies</p><h2 id="marketing-cases-title" className="v6-jp-heading">マーケティング支援の実績。</h2></header><div className="sv6-rows">{marketingWorks.map((work, index) => <Link className="sv6-row sv6-case-link" href={`/works/${work.slug}`} key={work.slug}><span className="sv6-row-no">0{index + 1}</span><h3 className="v6-jp-heading">{work.title}</h3><div className="sv6-row-copy"><p>{work.industry} · {work.summary}</p></div></Link>)}</div></div></section>}

        <section className="v6-scene v6-end" aria-labelledby="marketing-end-title"><div className="v6-scene-inner v6-end-inner"><h2 className="v6-kicker">End Credits · Marketing</h2><div><p id="marketing-end-title" className="v6-en-display v6-end-title">BUILD<br /><span className="v6-accent">REPEATABILITY.</span></p><p className="v6-end-copy">広告費の無駄をなくし、LTVを高め、オーガニックを育てる。60分の無料相談から始めましょう。</p><Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link></div></div></section>
      </main>
    </div>
  );
}
