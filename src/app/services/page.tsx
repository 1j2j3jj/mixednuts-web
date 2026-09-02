import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import SiteMotionV6 from "@/components/v6/SiteMotionV6";
import { services } from "@/data/services";
import { buildPageOg } from "@/lib/site-metadata";
import "./v6-services.css";

const pageTitle = "Services — Strategy × AI × Marketing";
const pageDescription =
  "戦略コンサルティング・AI実装支援・マーケティング成長支援の3軸を一気通貫で提供。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services" }),
};

const collectionPageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://mixednuts-inc.com/services#webpage",
  url: "https://mixednuts-inc.com/services",
  name: pageTitle,
  description: pageDescription,
  inLanguage: "ja-JP",
  isPartOf: { "@id": "https://mixednuts-inc.com/#website" },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: [
      { name: "Strategy Consulting", path: "/services/strategy" },
      { name: "AI Implementation", path: "/services/ai" },
      { name: "Marketing & Growth", path: "/services/marketing" },
    ].map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://mixednuts-inc.com${service.path}`,
      name: service.name,
    })),
  },
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
]);

const actOrder = ["strategy", "ai", "marketing"] as const;
const actMeta = {
  strategy: { numeral: "I", label: "ACT I · STRATEGY", link: "Explore Strategy", act: 1 },
  ai: { numeral: "II", label: "ACT II · AI", link: "Explore AI", act: 2 },
  marketing: { numeral: "III", label: "ACT III · MARKETING", link: "Explore Marketing", act: 3 },
};

const connections = [
  {
    title: "戦略が AI を加速する",
    body: "「どのプロセスを自動化すべきか」の判断は戦略思考が必要です。戦略家とAIエンジニアが同じチームにいるから、正しいAI投資ができます。",
  },
  {
    title: "AI がマーケを進化させる",
    body: "クリエイティブ生成、入札最適化、データ分析。AIなしのマーケティングは2024年以前の話。AI前提でマーケを設計します。",
  },
  {
    title: "マーケが戦略を検証する",
    body: "顧客の反応は最良の戦略検証です。マーケの実行データを戦略のループに取り込み、仮説検証を高速で回します。",
  },
];

export default function ServicesPage() {
  const acts = actOrder.map((slug) => ({
    ...services.find((service) => service.slug === slug)!,
    ...actMeta[slug],
  }));

  return (
    <div className="mn-v6 mn-v6-services">
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />
      <SiteMotionV6 />

      <main>
        <section className="v6-scene v6-hero sv6-hero" data-v6-scene="services-hero" aria-labelledby="services-title">
          <div className="v6-scene-inner v6-hero-inner">
            <h2 className="v6-kicker v6-hero-overline">Cold Open · Services · Three Acts</h2>
            <div className="v6-hero-title-wrap">
              <h1 id="services-title" className="v6-en-display v6-hero-title">
                <span className="v6-hero-word">THREE</span><br />
                <span className="v6-hero-word">FORCES.</span><br />
                <span className="v6-hero-word v6-accent">ONE ENGINE.</span>
              </h1>
              <p className="v6-en-display v6-hero-register">Strategy, AI, and Marketing—<br />executed as one.</p>
            </div>
            <div className="v6-hero-bottom">
              <p className="v6-hero-lead">
                戦略コンサルティング、AI実装支援、グロースマーケティング。多くのファームが「どれか一つ」しか提供できない領域を、私たちは統合して届けます。断絶させず、有機的に繋ぐのが mixednuts の強みです。
              </p>
              <div className="v6-button-row v6-hero-actions">
                <Link href="/contact" className="v6-button v6-button--paper">Let&apos;s Talk</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-acts" data-v6-scene="services-acts" aria-labelledby="services-acts-title">
          <div className="v6-scene-inner v6-acts-inner">
            <h2 id="services-acts-title" className="v6-kicker v6-acts-kicker">Three Acts · One Growth Engine</h2>
            <div className="v6-act-stage">
              {acts.map((service) => (
                <article className="v6-act" data-v6-act={service.act} key={service.slug}>
                  <div className="v6-act-numeral v6-en-display" aria-hidden="true">{service.numeral}</div>
                  <div className="v6-act-copy sv6-act-copy">
                    <p className="v6-kicker">{service.label}</p>
                    <h3 className="v6-jp-heading">{service.tagline}</h3>
                    <p>{service.description}</p>
                    <ul className="sv6-deliverables" aria-label={`${service.label} deliverables`}>
                      {service.capabilities.slice(0, 4).map((capability) => <li key={capability}>{capability}</li>)}
                    </ul>
                    <Link href={`/services/${service.slug}`}>{service.link} <span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-connect" data-v6-scene="connection" aria-labelledby="connection-title">
          <div className="v6-scene-inner sv6-connect-inner">
            <header className="sv6-connect-intro" data-sv6-reveal>
              <div>
                <p className="v6-kicker v6-kicker--paper">How the Three Connect</p>
                <h2 id="connection-title" className="v6-en-display sv6-connect-title">One continuous<br />growth loop.</h2>
              </div>
              <p className="sv6-connect-lead">3つを別々に依頼しても、断絶が生まれます。mixednuts は、3つが常に連動する設計で動きます。</p>
            </header>
            <div className="sv6-connect-list">
              {connections.map((connection) => (
                <article className="sv6-connect-row" data-sv6-reveal key={connection.title}>
                  <h3 className="v6-jp-heading">{connection.title}</h3>
                  <p>{connection.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-end" data-v6-scene="end" aria-labelledby="services-end-title">
          <div className="v6-scene-inner v6-end-inner">
            <h2 className="v6-kicker">End Credits · Services</h2>
            <div>
              <p id="services-end-title" className="v6-en-display v6-end-title sv6-end-title">CHOOSE<br /><span className="v6-accent">MOMENTUM.</span></p>
              <p className="v6-end-copy">まずは課題をお聞かせください。60分の無料相談で、最適なアプローチをご提案します。</p>
              <Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
