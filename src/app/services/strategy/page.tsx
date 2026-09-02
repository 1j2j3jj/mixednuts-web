import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { works, CASES_COMING_SOON } from "@/data/works";
import { buildPageOg } from "@/lib/site-metadata";
import ServiceDetailMotion from "../ServiceDetailMotion";
import "../v6-services.css";

const pageTitle = "Strategy — 事業計画・投資評価・中期戦略";
const pageDescription =
  "事業会社の経営企画・FP&A と、広告・グロースの最前線を経験したメンバーが、経営判断の中枢で意思決定を支援。FP&A、M&A、新規事業、組織設計まで一気通貫。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services/strategy" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services/strategy" }),
};

const strategyWorks = CASES_COMING_SOON
  ? []
  : works.filter((work) => !work.hidden && work.services.includes("strategy")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/strategy#service",
  name: "Strategy Consulting",
  serviceType: "Strategy / FP&A / M&A",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description: "中期経営計画、FP&A/予実管理、M&A戦略・デューデリジェンス、新規事業立上げ、取締役会付議支援まで統合提供。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/strategy",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Strategy", path: "/services/strategy" },
]);

const proof = [
  ["15+", "戦略支援実績"],
  ["5+", "M&A案件サポート"],
  ["10+", "新規事業立ち上げ"],
  ["MBA", "早稲田 / 外資系ファーム出身"],
];

const offerings = [
  { num: "01", title: "中期経営計画・事業戦略", desc: "3-5年の中期経営計画策定から単年度事業計画まで。市場分析、競合マッピング、ポジショニング設計、成長ドライバーの特定まで、数字に落としたロードマップを作ります。" },
  { num: "02", title: "FP&A / 予実管理設計", desc: "財務計画・予実分析の仕組みを設計・構築します。月次締め、取締役会付議、KPI設計、AIを使った自動化まで。CFO機能を外部から提供します。" },
  { num: "03", title: "M&A 戦略・デューデリジェンス", desc: "買収候補の発掘から財務DD、法務DD連携、バリュエーション（DCF・マルチプル）、意思決定支援まで。PEファンド・投資銀行出身メンバーが主導します。" },
  { num: "04", title: "投資評価・バリュエーション", desc: "DCF、コンパラブル分析、フットボールチャート、シナリオ感応度分析。投資判断の根拠を多角的に構築します。上場・未上場の双方に対応。" },
  { num: "05", title: "新規事業立ち上げ支援", desc: "ICP定義、仮説検証設計、MVP策定、Gate Review、ピボット判断まで。PMF達成後の本格投入準備まで伴走します。AI活用でリサーチ工程を大幅短縮。" },
  { num: "06", title: "組織設計・PMO", desc: "事業の成長フェーズに合わせた組織設計、KPI体系の再構築、プロジェクト管理体制の整備。複数部門の横串調整も担います。" },
];

export default function ServiceStrategyPage() {
  return (
    <div className="mn-v6 mn-v6-services">
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumb} />
      <ServiceDetailMotion act={1} />

      <main>
        <section className="v6-scene sv6-detail-hero" aria-labelledby="strategy-title">
          <div className="v6-scene-inner sv6-detail-hero-inner">
            <p className="v6-kicker sv6-detail-overline">Act I · Strategy Consulting</p>
            <h1 id="strategy-title" className="v6-en-display sv6-detail-title"><span>DECIDE.</span><br /><span className="v6-accent">THEN MOVE.</span></h1>
            <div className="sv6-detail-bottom">
              <p className="sv6-detail-lead v6-jp-heading">意思決定の質を、<br />数倍に引き上げる。</p>
              <p className="sv6-detail-meta">Strategy / FP&amp;A / M&amp;A</p>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="strategy-intro-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal>
              <p className="v6-kicker v6-kicker--paper">Mandate · Decision Quality</p>
              <h2 id="strategy-intro-title" className="v6-jp-heading">明日からの行動に変換する、<br />経営のロードマップ。</h2>
              <p>事業戦略、新規事業、M&amp;A、経営管理まで。&quot;分厚い報告書&quot;ではなく、明日からの行動に変換するロードマップ。事業会社の経営企画・FP&amp;A と、広告・グロースの最前線を経験したメンバーが、経営判断の中枢に入り込みます。</p>
            </header>
            <div className="sv6-rows" aria-label="Strategy proof points">
              {proof.map(([value, label], index) => (
                <div className="sv6-row" data-sv6-reveal key={label}>
                  <span className="sv6-row-no">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="v6-en-display">{value}</h3>
                  <div className="sv6-row-copy"><p>{label}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="strategy-offer-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal>
              <p className="v6-kicker v6-kicker--paper">What We Offer · Six Fields</p>
              <h2 id="strategy-offer-title" className="v6-jp-heading">戦略コンサルティングの<br />6領域。</h2>
              <p>経営判断の全段階で、データとAIを使った意思決定支援を提供します。</p>
            </header>
            <ol className="sv6-rows">
              {offerings.map((offering) => (
                <li className="sv6-row" data-sv6-reveal key={offering.num}>
                  <span className="sv6-row-no">{offering.num}</span>
                  <h3 className="v6-jp-heading">{offering.title}</h3>
                  <div className="sv6-row-copy"><p>{offering.desc}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {false && <section aria-label="Strategy Team" />}

        {strategyWorks.length > 0 && (
          <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="strategy-cases-title">
            <div className="v6-scene-inner sv6-editorial-inner">
              <header className="sv6-section-head"><p className="v6-kicker v6-kicker--paper">Case Studies</p><h2 id="strategy-cases-title" className="v6-jp-heading">戦略支援の実績。</h2></header>
              <div className="sv6-rows">{strategyWorks.map((work, index) => <Link className="sv6-row sv6-case-link" href={`/works/${work.slug}`} key={work.slug}><span className="sv6-row-no">0{index + 1}</span><h3 className="v6-jp-heading">{work.title}</h3><div className="sv6-row-copy"><p>{work.industry} · {work.summary}</p></div></Link>)}</div>
            </div>
          </section>
        )}

        <section className="v6-scene v6-end" aria-labelledby="strategy-end-title">
          <div className="v6-scene-inner v6-end-inner">
            <h2 className="v6-kicker">End Credits · Strategy</h2>
            <div>
              <p id="strategy-end-title" className="v6-en-display v6-end-title">DECIDE<br /><span className="v6-accent">WITH CLARITY.</span></p>
              <p className="v6-end-copy">初回無料相談（60分）で、貴社の経営課題をヒアリングします。まずは話すことから始めましょう。</p>
              <Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
