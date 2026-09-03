import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { MetricValue, Odometer, Phrases } from "@/components/v6/KineticText";
import { buildPageOg } from "@/lib/site-metadata";
import { works, workThemes, CASES_COMING_SOON, type Work } from "@/data/works";
import WorksMotionV6 from "./WorksMotionV6";
import "./v6-works.css";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const indexWorks = works.filter((work) => !work.hidden);
const visibleWorks = CASES_COMING_SOON ? [] : indexWorks;
const themeGroups = workThemes
  .map((theme) => ({ ...theme, works: visibleWorks.filter((work) => work.theme === theme.id) }))
  .filter((theme) => theme.works.length > 0);

const pageTitle = "課題からたどる匿名事例";
const pageDescription =
  "クライアント名を伏せ、どんな課題にどう向き合い、何が変わったかを課題テーマ別に紹介する mixednuts の匿名事例集です。業界や案件名ではなく、いま直面している問題から近いケースを探せます。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/works" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/works" }),
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
            name: work.problem,
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
    items: ["事業戦略・新規事業・ポートフォリオ設計", "FP&A・予実管理・意思決定支援", "海外展開・市場参入・組織変革", "取締役会・投資判断のための分析"],
    scale: "スタートアップ〜上場企業",
  },
  {
    number: "02",
    label: "AI Implementation",
    title: "AI 実装・業務変革",
    items: ["AI エージェント組織の設計・実装", "業務自動化（経理・レポート・分析）", "Claude / Gemini / OpenAI 統合基盤", "MCP・ノーコード連携の内製化"],
    scale: "スタートアップ〜上場企業",
  },
  {
    number: "03",
    label: "Marketing & Growth",
    title: "マーケティング・グロース",
    items: ["Google Ads / Meta Ads 運用設計", "計測基盤（GTM / GA4）整備", "SEO・AIO・LLMO・構造化データ", "CVR 改善・LP / フォーム最適化"],
    scale: "月予算 数百万〜数千万円",
  },
] as const;

function SplitCharacters({ text }: { text: string }) {
  return Array.from(text).map((character, index) => (
    <span className="c" aria-hidden="true" key={`${character}-${index}`}>{character}</span>
  ));
}

function CaseRow({ work, index }: { work: Work; index: number }) {
  return (
    <Link className="problem-case-row" href={`/works/${work.slug}`} data-row-reveal>
      <span className="problem-case-number">{String(index + 1).padStart(2, "0")}</span>
      <h3 className="case-problem"><Phrases text={work.problem} /></h3>
      <div className="case-move-column">
        <p className="case-move">{work.move}</p>
        {work.metric.length > 0 && (
          <div className="problem-case-metrics" data-odometer>
            {work.metric.slice(0, 3).map((metric) => (
              <span key={metric.label}><small>{metric.label}</small><strong><MetricValue value={metric.value} /></strong></span>
            ))}
          </div>
        )}
        <p className="problem-case-tags">{work.industry} · {work.services.map((service) => serviceLabels[service]).join(" · ")}</p>
      </div>
    </Link>
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
          <p className="works-overline" data-title-reveal><i />CASE FILES · BY PROBLEM, NOT BY CLIENT</p>
          <h1 data-split aria-label="課題から、たどる。"><span className="w"><SplitCharacters text="課題から、" /></span><span className="w"><SplitCharacters text="たどる。" /></span></h1>
          <div className="works-title-copy" data-title-reveal>
            <p className="works-jp-title">案件ではなく、<br />課題から。</p>
            <p className="works-page-lead">クライアント名は伏せています。どんな課題に、どう向き合い、何が変わったか。その型だけを記録しています。</p>
          </div>
          <p className="works-page-index" data-title-reveal>01 / 04</p>
        </section>

        {CASES_COMING_SOON ? (
          <section className="engagement-index-scene works-preparing-scene" data-nav="light">
            <header className="works-scene-head" data-reveal>
              <p className="works-kicker">Case files</p>
              <div><h2>公開準備中。</h2><p>匿名化と掲載許諾の確認が完了したケースから、課題単位で公開します。</p></div>
              <p className="index-status">CASE FILES / PREPARING</p>
            </header>
          </section>
        ) : (
          <>
            <section className="theme-index-scene" data-nav="light" aria-labelledby="theme-index-heading">
              <header className="works-scene-head" data-reveal>
                <p className="works-kicker">Problem index</p>
                <div><h2 id="theme-index-heading">課題の型から、<br />ケースを探す。</h2><p>似た業界ではなく、いま直面している課題に近い入口を選んでください。</p></div>
                <p className="index-status">{visibleWorks.length} CASE FILES</p>
              </header>
              <nav className="theme-index-list" aria-label="課題テーマ">
                {themeGroups.map((theme, index) => (
                  <a className="theme-index-row" href={`#theme-${theme.id}`} data-row-reveal key={theme.id}>
                    <span className="theme-index-number">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="theme-index-title" data-split-slam aria-label={theme.label}><SplitCharacters text={theme.label} /></h3>
                    <p>{theme.lead}</p>
                    <span className="theme-index-count">{String(theme.works.length).padStart(2, "0")} CASES</span>
                  </a>
                ))}
              </nav>
            </section>

            {themeGroups.map((theme, themeIndex) => (
              <section className="problem-theme-section" id={`theme-${theme.id}`} data-nav={themeIndex % 2 ? "dark" : "light"} key={theme.id}>
                <header className="problem-theme-head" data-reveal>
                  <p className="works-kicker">Problem theme {String(themeIndex + 1).padStart(2, "0")}</p>
                  <h2>{theme.label}</h2>
                  <p>{theme.lead}</p>
                </header>
                <div className="problem-case-list">
                  {theme.works.map((work, index) => <CaseRow work={work} index={index} key={work.slug} />)}
                </div>
              </section>
            ))}
          </>
        )}

        <section className="engagement-areas-field" data-nav="dark" data-wipe>
          <header data-reveal>
            <p className="works-kicker">Engagement areas</p>
            <h2>What we have<br />done, first.</h2>
            <p>肩書きや業界の前に、実際に担ってきた仕事からお伝えします。</p>
          </header>
          <div className="engagement-area-grid">
            {engagementAreas.map((area) => (
              <article className="engagement-area" data-reveal key={area.number}>
                <p className="area-number">{area.number}</p><p className="area-label">{area.label}</p><h3>{area.title}</h3>
                <ul>{area.items.map((item) => <li key={item}>{item}</li>)}</ul><p className="area-scale">{area.scale}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="works-closing-field" data-nav="dark" data-wipe>
          <p className="works-kicker">Your problem, next</p>
          <h2>次のケースは、<br />あなたの事業かもしれない。</h2>
          <div data-reveal><p>似た課題の進め方、必要な体制、最初に見るべき数字からお話しします。</p><Link className="works-button" href="/contact">無料相談を申し込む</Link></div>
        </section>
      </main>
    </div>
  );
}
