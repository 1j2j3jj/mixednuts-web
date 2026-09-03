import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/data/services";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import { SplitWords } from "@/components/v6/KineticText";
import ServicesMotion from "./ServicesMotion";
import "./v6-services.css";

const pageTitle = "サービス一覧 — 戦略・AI・マーケティング";
const pageDescription =
  "事業戦略と経営管理、AIエージェントの設計・業務実装、広告運用やSEOを含むグロースマーケティングの3領域を、構想から運用改善まで一つのチームで継続支援します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services" },
  ...buildPageOg({
    title: pageTitle,
    description: pageDescription,
    path: "/services",
  }),
};

const collectionPageSchema = buildWebPageSchema({
  type: "CollectionPage",
  path: "/services",
  name: pageTitle,
  description: pageDescription,
  mainEntityList: {
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
});

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
]);

const actConfig = [
  { slug: "strategy", act: "ACT I", color: "c-navy", side: "l", title: "戦略・経営管理" },
  { slug: "ai", act: "ACT II", color: "c-enji", side: "r", title: "AI 実装・エージェント組織" },
  { slug: "marketing", act: "ACT III", color: "c-black", side: "l", title: "マーケティング成長支援" },
] as const;

const connections = [
  {
    title: "戦略が AI を加速する",
    body: "「どのプロセスを自動化すべきか」の判断には戦略思考が必要です。戦略と AI 実装を同じチームで扱い、投資の優先順位を定めます。",
  },
  {
    title: "AI がマーケを進化させる",
    body: "クリエイティブ生成、入札最適化、データ分析。AI を前提に、マーケティングの実行と改善を設計します。",
  },
  {
    title: "マーケが戦略を検証する",
    body: "顧客の反応を戦略検証の材料として取り込み、実行データから次の仮説へつなげます。",
  },
];

export default function ServicesPage() {
  return (
    <div className="mn-v6 services-v6 services-showpiece">
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />
      <ServicesMotion />
      <main>
        <section className="services-title" data-nav="dark">
          <nav className="service-crumb" aria-label="パンくずリスト" data-hero-copy><ol style={{ display: "contents" }}><li style={{ display: "contents" }}><Link href="/">Home</Link></li><li style={{ display: "contents" }}> / Services</li></ol></nav>
          <p className="act-label" data-hero-copy>Our services · one operating system</p>
          <h1 data-service-title data-split aria-label="Three Acts."><SplitWords words={["Three"]} /><br /><SplitWords words={["Acts."]} /></h1>
          <div className="services-title-copy">
            <h2 data-hero-copy><span>3つの専門性を、</span><br /><span>1つのチームで。</span></h2>
            <p data-hero-copy>
              戦略コンサルティング、AI実装支援、グロースマーケティング。多くのファームが「どれか一つ」しか提供できない領域を、私たちは統合して届けます。断絶させず、有機的に繋ぐのが mixednuts の強みです。
            </p>
          </div>
        </section>

        <section className="acts-head" data-nav="light">
          <h2 data-reveal>Three<br />forces.<br />One engine.</h2>
          <p data-reveal>戦略が AI を加速し、AI がマーケを進化させ、マーケが戦略を検証する。3つを一つのチームで回すから、施策が翌日から動きます。</p>
        </section>

        <section className="acts">
          {actConfig.map((config) => {
            const service = services.find((item) => item.slug === config.slug);
            if (!service) return null;
            return (
              <article className={`force ${config.color}`} data-nav="dark" data-side={config.side} key={service.slug}>
                <p className="word vs"><span className="wi">{service.label.replace(" Solutions", "")}</span></p>
                <div className="act-copy">
                  <p className="act-label">{config.act} · {service.label}</p>
                  <h3>{config.title}</h3>
                  <p>{service.description}</p>
                  <ul>{service.capabilities.slice(0, 4).map((capability) => <li key={capability}>{capability}</li>)}</ul>
                  <Link className="go" href={`/services/${service.slug}`}>Explore {service.slug}</Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="connections" data-nav="light">
          <div className="connections-head">
            <h2 data-reveal>How the<br />three<br />connect.</h2>
            <p data-reveal>3つを別々に依頼すると、判断と実行の間に断絶が生まれます。mixednuts は、それぞれの専門性が常に次のアクトへ情報を返す設計で動きます。</p>
          </div>
          <div data-wipe>
            {connections.map((connection, index) => (
              <article className="connection-row" data-reveal key={connection.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{connection.title}</h3>
                <p>{connection.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="service-end" data-nav="dark">
          <h2 data-split aria-label="Let’s build growth."><SplitWords words={["Let’s"]} /><br /><SplitWords words={["build"]} /><br /><SplitWords words={["growth."]} /></h2>
          <div data-reveal>
            <p>どのサービスから始めるべきかも含めて、一緒に考えます。まずは課題をお聞かせください。</p>
            <Link className="btn" href="/contact">無料相談を申し込む</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
