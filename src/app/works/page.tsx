import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import { CASES_COMING_SOON, works, type Work } from "@/data/works";
import WorksMotionV6 from "./WorksMotionV6";
import "./v6-works.css";

const engagementWorks = works.filter((work) => !work.hidden);
const schemaWorks = CASES_COMING_SOON ? [] : engagementWorks;

const pageTitle = "Works — 数字で語る、実績ケース";
const pageDescription =
  "上場企業の経営管理から D2C のグロースまで、戦略・AI・マーケティングを横断したクライアントワーク。実績ケースは現在準備中で、匿名化のうえ順次公開していきます。";

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

const collectionPageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://mixednuts-inc.com/works#webpage",
  url: "https://mixednuts-inc.com/works",
  name: pageTitle,
  description: pageDescription,
  inLanguage: "ja-JP",
  isPartOf: { "@id": "https://mixednuts-inc.com/#website" },
  ...(schemaWorks.length > 0
    ? {
        mainEntity: {
          "@type": "ItemList",
          itemListElement: schemaWorks.map((work, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `https://mixednuts-inc.com/works/${work.slug}`,
            name: work.title,
          })),
        },
      }
    : {}),
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Works", path: "/works" },
]);

const engagementAreas = [
  {
    numeral: "I",
    label: "Strategy & FP&A",
    titleLead: "経営管理・",
    titleTail: "財務戦略",
    items: [
      "上場企業の取締役会資料・月次定例",
      "予実管理・事業計画・KPI 設計",
      "投資判断・M&A デューデリジェンス",
      "IR・エクイティストーリー支援",
    ],
    scale: "上場企業（時価総額 100 億〜数兆円）",
  },
  {
    numeral: "II",
    label: "AI & Organization",
    titleLead: "AI・組織設計",
    titleTail: "",
    items: [
      "AI エージェント組織の設計・運用",
      "業務自動化（経理・レポート・分析）",
      "Claude / Gemini / OpenAI 統合基盤",
      "MCP・ノーコード連携の内製化",
    ],
    scale: "スタートアップ〜上場企業",
  },
  {
    numeral: "III",
    label: "Marketing & Growth",
    titleLead: "マーケティング・",
    titleTail: "グロース",
    items: [
      "Google Ads / Meta Ads 運用設計",
      "計測基盤（GTM / GA4）整備",
      "SEO・AIO・LLMO・構造化データ",
      "CVR 改善・LP / フォーム最適化",
    ],
    scale: "月予算 数百万〜数千万円",
  },
];

const serviceLabels: Record<Work["services"][number], string> = {
  strategy: "STRATEGY",
  ai: "AI",
  marketing: "MARKETING",
};

function EngagementRow({ work, index }: { work: Work; index: number }) {
  const content = (
    <>
      <span className="works-v6-index-no">{String(index + 1).padStart(2, "0")}</span>
      <span className="works-v6-client">
        <span className="works-v6-redaction" aria-hidden="true">CONFIDENTIAL ENTITY</span>
        <span>{work.client}</span>
      </span>
      <span className="works-v6-industry">{work.industry}</span>
      <span className="works-v6-services">
        {work.services.map((service) => serviceLabels[service]).join(" · ")}
      </span>
      <span className="works-v6-metrics">
        {work.metric.slice(0, 2).map((metric) => (
          <span key={metric.label}>
            <small>{metric.label}</small>
            <b>{metric.value}</b>
          </span>
        ))}
      </span>
    </>
  );

  return CASES_COMING_SOON ? (
    <div className="v6-index-row works-v6-index-row" role="row" aria-label={`${work.client}、${work.title}`}>
      {content}
    </div>
  ) : (
    <Link className="v6-index-row works-v6-index-row" role="row" href={`/works/${work.slug}`}>
      {content}
    </Link>
  );
}

export default function WorksPage() {
  return (
    <div className="mn-v6 works-v6">
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />
      <WorksMotionV6 />

      <main>
        <section className="v6-scene v6-hero works-v6-hero" data-v6-scene="hero" aria-labelledby="works-v6-title">
          <div className="v6-scene-inner v6-hero-inner">
            <h2 className="v6-kicker v6-hero-overline">Cold Open · Confidential Engagement Index</h2>
            <div className="v6-hero-title-wrap">
              <h1 id="works-v6-title" className="v6-jp-heading v6-hero-title works-v6-hero-title">
                <span className="v6-hero-word">数字で語る、</span><br />
                <span className="v6-hero-word v6-accent">実績ケース。</span>
              </h1>
              <p className="v6-en-display v6-hero-register">Strategy, AI, and Marketing —<br />measured in outcomes.</p>
            </div>
            <div className="v6-hero-bottom">
              <p className="v6-hero-lead">
                上場企業の経営管理から D2C のグロースまで、戦略・AI・マーケティングを横断して関与してきました。<br className="v6-desktop-break" />
                個別ケースは匿名化のうえ、順次公開していきます。
              </p>
              <p className="works-v6-hero-note">FILE STATUS · {CASES_COMING_SOON ? "DISCLOSURE PENDING" : "OPEN"}</p>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene works-v6-ledger" data-v6-scene="engagement-index" aria-labelledby="works-v6-index-heading">
          <div className="v6-scene-inner works-v6-ledger-inner">
            <header className="v6-section-head works-v6-section-head">
              <p className="v6-kicker v6-kicker--paper">Case File 01 · Engagements</p>
              <h2 id="works-v6-index-heading" className="v6-en-display">
                Confidential<br />Engagement<br className="works-v6-index-break-mobile" /> Index
              </h2>
              <p>企業名は非開示。業界、関与領域、成果の輪郭のみを記録しています。</p>
            </header>

            <div className="works-v6-index-key" aria-hidden="true">
              <span>No.</span><span>Client</span><span>Industry</span><span>Service</span><span>Selected metrics</span>
            </div>
            <div className="v6-index works-v6-index" role="table" aria-label="匿名化した支援実績一覧">
              {engagementWorks.map((work, index) => (
                <EngagementRow key={work.slug} work={work} index={index} />
              ))}
            </div>
            <p className="works-v6-disclosure">
              <span>Disclosure note</span>
              個別ケースは現在準備中です。守秘義務と掲載許諾を確認し、匿名化のうえ順次公開します。
            </p>
          </div>
        </section>

        <section className="v6-scene works-v6-areas" data-v6-scene="engagement-areas" aria-labelledby="works-v6-areas-heading">
          <div className="v6-scene-inner works-v6-areas-inner">
            <header className="works-v6-areas-head">
              <p className="v6-kicker">Case File 02 · Engagement Areas</p>
              <h2 id="works-v6-areas-heading" className="v6-jp-heading">何をやってきたか、<br />を先に。</h2>
              <p>成果の詳細公開に先立ち、担ってきた領域と規模を記します。</p>
            </header>
            <div className="works-v6-area-grid">
              {engagementAreas.map((area) => (
                <article className="works-v6-area" key={area.label}>
                  <div className="works-v6-area-number v6-en-display" aria-hidden="true">{area.numeral}</div>
                  <p className="v6-kicker">{area.label}</p>
                  <h3 className="v6-jp-heading">
                    {area.titleLead}{area.titleTail ? <><br />{area.titleTail}</> : null}
                  </h3>
                  <ul>
                    {area.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <p className="works-v6-area-scale"><span>Scale</span>{area.scale}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-end works-v6-end" data-v6-scene="end" aria-labelledby="works-v6-end-heading">
          <div className="v6-scene-inner v6-end-inner">
            <h2 className="v6-kicker">End Credits · Next Engagement</h2>
            <div>
              <p id="works-v6-end-heading" className="v6-jp-heading works-v6-end-title">
                次の成功事例を、<br /><span className="v6-accent">あなたと一緒に<br className="works-v6-end-break-mobile" />つくりたい。</span>
              </p>
              <p className="v6-end-copy">まずは課題をお聞かせください。60分の無料相談で、最適なアプローチを共に設計します。</p>
              <Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
