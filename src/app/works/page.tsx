import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { Odometer, SplitWords } from "@/components/v6/KineticText";
import { buildPageOg } from "@/lib/site-metadata";
import { works, CASES_COMING_SOON, type Work } from "@/data/works";
import WorksMotionV6 from "./WorksMotionV6";
import "./v6-works.css";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const indexWorks = works.filter((work) => !work.hidden);
const visibleWorks = CASES_COMING_SOON ? [] : indexWorks;

const pageTitle = "支援実績 — 匿名ケース一覧";
const pageDescription =
  "経営管理・FP&A、投資評価、新規事業、AI実装、広告運用、SEO・AIOなど、戦略・AI・マーケティングを横断して支援した案件を、企業名を伏せた匿名ケースとして紹介します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/works" },
  ...buildPageOg({
    title: pageTitle,
    description: pageDescription,
    path: "/works",
  }),
};

// While the case roster is gated (CASES_COMING_SOON) the page is a plain WebPage — an empty ItemList is invalid.
const collectionPageSchema = buildWebPageSchema({
  type: visibleWorks.length ? "CollectionPage" : "WebPage",
  path: "/works",
  name: pageTitle,
  description: pageDescription,
  ...(visibleWorks.length
    ? {
        mainEntityList: {
          "@type": "ItemList",
          itemListElement: visibleWorks.map((work, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `https://mixednuts-inc.com/works/${work.slug}`,
            name: work.title,
          })),
        },
      }
    : {}),
});

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Works", path: "/works" },
]);

const serviceLabels: Record<Work["services"][number], string> = {
  strategy: "STRATEGY",
  ai: "AI",
  marketing: "MARKETING",
};

const engagementAreas = [
  {
    number: "01",
    label: "Strategy & Management",
    title: "戦略・経営管理",
    items: [
      "事業戦略・新規事業・ポートフォリオ設計",
      "FP&A・予実管理・意思決定支援",
      "海外展開・市場参入・組織変革",
      "取締役会・投資判断のための分析",
    ],
    scale: "スタートアップ〜上場企業",
  },
  {
    number: "02",
    label: "AI Implementation",
    title: "AI 実装・業務変革",
    items: [
      "AI エージェント組織の設計・実装",
      "業務自動化（経理・レポート・分析）",
      "Claude / Gemini / OpenAI 統合基盤",
      "MCP・ノーコード連携の内製化",
    ],
    scale: "スタートアップ〜上場企業",
  },
  {
    number: "03",
    label: "Marketing & Growth",
    title: "マーケティング・グロース",
    items: [
      "Google Ads / Meta Ads 運用設計",
      "計測基盤（GTM / GA4）整備",
      "SEO・AIO・LLMO・構造化データ",
      "CVR 改善・LP / フォーム最適化",
    ],
    scale: "月予算 数百万〜数千万円",
  },
] as const;

function EngagementContent({ work, index }: { work: Work; index: number }) {
  const redactionWidth = Math.min(88, 46 + work.client.length * 1.8);

  return (
    <>
      <span className="engagement-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="engagement-client">
        <span className="client-label">{work.client}</span>
        <span
          className="redaction-bar"
          style={{ "--redaction-width": `${redactionWidth}%` } as CSSProperties}
          aria-hidden="true"
        />
      </span>
      <span className="engagement-industry">{work.industry}</span>
      <span className="engagement-services">
        {work.services.map((service) => serviceLabels[service]).join(" · ")}
      </span>
      <span className="engagement-metrics" data-odometer>
        {work.metric.slice(0, 2).map((metric) => (
          <span className="engagement-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong><Odometer value={metric.value} /></strong>
          </span>
        ))}
      </span>
    </>
  );
}

export default function WorksPage() {
  return (
    <div className="mn-v6 works-v6 works-index-v6" data-v6-motion>
      <WorksMotionV6 />
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />
      <BreadcrumbNav items={[{ name: "Home", path: "/" }, { name: "Works" }]} />

      <main>
        <section className="works-title-card works-title-black" data-nav="dark">
          <p className="works-overline" data-title-reveal><i />Works · Confidential engagement index</p>
          <h1 data-split aria-label="Confidential Engagement Index">
            <SplitWords words={["Confidential"]} />
            <br />
            <SplitWords words={["Engagement"]} />
            <br />
            <SplitWords words={["Index"]} />
          </h1>
          <div className="works-title-copy" data-title-reveal>
            <p className="works-jp-title">数字で語る、<br />実績ケース。</p>
            <p className="works-page-lead">戦略・AI・マーケティングを分断せず、構想から実装まで伴走した支援の記録です。守秘義務を優先し、公開可能な情報だけを匿名化して掲載します。</p>
          </div>
          <p className="works-page-index" data-title-reveal>01 / 04</p>
        </section>

        <section className="engagement-index-scene" data-nav="light">
          <header className="works-scene-head" data-reveal>
            <p className="works-kicker">Engagement index</p>
            <div>
              <h2>成果の輪郭を、<br />匿名のまま。</h2>
              <p>クライアント名は伏せ、業界・関与領域・実績値だけを記録しています。個別ケースは許諾が整い次第、順次公開します。</p>
            </div>
            <p className="index-status">{CASES_COMING_SOON ? "CASE FILES / PREPARING" : `${indexWorks.length} CASE FILES`}</p>
          </header>

          <div className="engagement-columns" aria-hidden="true">
            <span>No.</span><span>Client</span><span>Industry</span><span>Services</span><span>Selected metrics</span>
          </div>

          <ol className="engagement-list">
            {indexWorks.map((work, index) => (
              <li className="engagement-row" data-row-reveal key={work.slug}>
                {CASES_COMING_SOON ? (
                  <div className="engagement-row-inner">
                    <EngagementContent work={work} index={index} />
                  </div>
                ) : (
                  <Link className="engagement-row-inner" href={`/works/${work.slug}`}>
                    <EngagementContent work={work} index={index} />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="engagement-areas-field" data-nav="dark" data-wipe>
          <header data-reveal>
            <p className="works-kicker">Engagement areas</p>
            <h2>What we have<br />done, first.</h2>
            <p>肩書きや業界の前に、実際に担ってきた仕事からお伝えします。</p>
          </header>
          <div className="engagement-area-grid">
            {engagementAreas.map((area) => (
              <article className="engagement-area" data-reveal key={area.number}>
                <p className="area-number">{area.number}</p>
                <p className="area-label">{area.label}</p>
                <h3>{area.title}</h3>
                <ul>
                  {area.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className="area-scale">対象規模：{area.scale}</p>
              </article>
            ))}
          </div>
          <p className="areas-note" data-reveal>類似案件の関与内容・成果は、守秘義務の範囲内で個別にご説明します。</p>
        </section>

        <section className="works-closing-field" data-nav="dark" data-wipe>
          <p className="works-kicker">Build the next case</p>
          <h2>次の成功事例を、<br />あなたと一緒に<br />つくりたい。</h2>
          <div data-reveal>
            <p>60分の無料相談で、事業の現在地と最初に動かすべき論点を整理します。</p>
            <Link className="works-button" href="/contact">無料相談を申し込む</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
