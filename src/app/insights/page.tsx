import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { posts } from "#site/content";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import SignalMotion from "./SignalMotion";
import "./v6-insights.css";

const pageTitle = "Insights — Strategy × AI × Marketing の最新知見";
const pageDescription =
  "戦略・AI・マーケティング・ファイナンスの実践ノウハウを発信。AI-firstコンサルティングファームの知見を公開しています。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/insights" },
  ...buildPageOg({
    title: pageTitle,
    description: pageDescription,
    path: "/insights",
  }),
};

type ListItem = {
  slug: string;
  href: string | null;
  category: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: string;
  author: string;
  hero?: string;
  thumbNumber?: string;
  thumbLabel?: string;
};

type UpcomingItem = Omit<ListItem, "date" | "href" | "hero" | "thumbNumber" | "thumbLabel">;

const upcomingArticles: UpcomingItem[] = [
  {
    slug: "fpna-ai-monthly-close",
    category: "AI",
    readTime: "8分",
    title: "FP&A × AI 自動化: 月次締め工数を70%削減した実装パターン",
    excerpt:
      "管理会計の月次クローズ作業にAIエージェントを組み込み、工数を大幅削減した事例。freee API連携とLLM集計の組み合わせを詳解。",
    author: "石井 希実",
  },
  {
    slug: "ma-dd-ai",
    category: "STRATEGY",
    readTime: "10分",
    title: "M&A デューデリジェンスをAIで加速する: 財務DDの新アプローチ",
    excerpt:
      "EDINETデータ自動取得からLLM分析まで。従来3週間かかっていた財務DDを5日に短縮した手法と、精度を担保するための人間チェックポイントを公開。",
    author: "石井 希実",
  },
  {
    slug: "prompt-engineering-guide",
    category: "MARKETING",
    readTime: "7分",
    title: "プロンプトエンジニアリングの実務ガイド: 再現性のある出力の作り方",
    excerpt:
      "「なんとなく動く」から「必ず動く」へ。本番投入できるプロンプトの設計原則と、評価フレームワークの構築方法を解説します。",
    author: "石井 希実",
  },
];

const publishedArticles: ListItem[] = [...posts]
  .filter((post) => !post.hidden)
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((post) => ({
    slug: post.slug,
    href: post.permalink,
    category: post.category,
    date: post.date.slice(0, 10).replace(/-/g, "."),
    readTime: post.readTime,
    title: post.title,
    excerpt: post.excerpt,
    author: post.author,
    hero: post.hero,
    thumbNumber: post.thumbNumber,
    thumbLabel: post.thumbLabel,
  }));

const categories = Array.from(new Set(publishedArticles.map((post) => post.category)));

const collectionPageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://mixednuts-inc.com/insights#webpage",
  url: "https://mixednuts-inc.com/insights",
  name: pageTitle,
  description: pageDescription,
  inLanguage: "ja-JP",
  isPartOf: { "@id": "https://mixednuts-inc.com/#website" },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: publishedArticles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://mixednuts-inc.com${article.href}`,
      name: article.title,
    })),
  },
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Insights", path: "/insights" },
]);

export default function InsightsPage() {
  const featured = publishedArticles[0];
  const rest = publishedArticles.slice(1);

  return (
    <div className="mn-v6 mn-v6-insights">
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />
      <SignalMotion />

      <main>
        <section className="v6-scene v6-hero signal-hero" data-v6-scene="signal-open" aria-labelledby="signal-title">
          <div className="v6-scene-inner signal-hero-inner">
            <div className="signal-hero-copy v6-hero-title-wrap">
              <p className="v6-kicker v6-hero-overline">Insights · mixednuts Inc.</p>
              <h1 id="signal-title" className="v6-en-display signal-hero-title">
                <span className="v6-hero-word">SIG</span>
                <span className="v6-hero-word"><em>NAL.</em></span>
              </h1>
            </div>
            <div className="signal-hero-bottom v6-hero-bottom">
              <p className="signal-hero-lead v6-hero-lead">
                戦略・AI・マーケティング・ファイナンスの実践から得た、<br />
                次の意思決定につながる知見を公開します。
              </p>
              <p className="signal-hero-register v6-hero-register">
                Field notes · Research · Practice<br />Tokyo · 2026
              </p>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene signal-index" aria-labelledby="signal-index-title">
          <div className="v6-scene-inner">
            <header className="signal-index-head">
              <div>
                <p className="v6-kicker v6-kicker--paper">Editorial Index · Latest first</p>
                <h2 id="signal-index-title" className="v6-en-display">Ideas in<br /><em>practice.</em></h2>
              </div>
              <nav className="signal-filters" aria-label="記事カテゴリー">
                <Link href="/insights" className="signal-filter is-active" aria-current="page">All</Link>
                {categories.map((category) => (
                  <Link key={category} href={`/insights/tag/${encodeURIComponent(category)}`} className="signal-filter">
                    {category}
                  </Link>
                ))}
              </nav>
            </header>

            {featured?.href && (
              <Link href={featured.href} className="signal-lead v6-insight">
                <div className="signal-lead-visual">
                  {featured.hero && <Image src={featured.hero} alt="" width={960} height={540} priority sizes="(max-width: 860px) 100vw, 42vw" />}
                  {featured.thumbNumber && (
                    <div className="signal-lead-data">
                      <strong className="v6-en-display signal-lead-number">{featured.thumbNumber}</strong>
                      {featured.thumbLabel && <span className="signal-lead-label">{featured.thumbLabel}</span>}
                    </div>
                  )}
                </div>
                <div className="signal-lead-copy">
                  <div className="signal-meta">
                    <span className="signal-category">{featured.category}</span>
                    <time dateTime={featured.date.replace(/\./g, "-")}>{featured.date}</time>
                    <span>{featured.readTime} read</span>
                  </div>
                  <h3 className="v6-jp-heading">{featured.title}</h3>
                  <p>{featured.excerpt}</p>
                  <span className="signal-read-link">Read the signal ↗</span>
                </div>
              </Link>
            )}

            <div className="signal-grid v6-insight-list">
              {rest.map((article, index) => (
                article.href && (
                  <Link href={article.href} className="signal-row v6-insight" key={article.slug}>
                    {article.hero && (
                      <div className="signal-row-visual">
                        <Image src={article.hero} alt="" width={720} height={405} sizes="(max-width: 860px) 100vw, 46vw" />
                      </div>
                    )}
                    <span className="signal-row-index">{String(index + 2).padStart(2, "0")}</span>
                    <div>
                      <div className="signal-meta">
                        <span className="signal-category">{article.category}</span>
                        <time dateTime={article.date.replace(/\./g, "-")}>{article.date}</time>
                        <span>{article.readTime}</span>
                      </div>
                      <h3 className="v6-jp-heading">{article.title}</h3>
                      <p>{article.excerpt}</p>
                    </div>
                  </Link>
                )
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene signal-coming" aria-labelledby="signal-coming-title">
          <div className="v6-scene-inner">
            <header className="signal-coming-head">
              <div>
                <p className="v6-kicker v6-kicker--paper">Coming Soon · In development</p>
                <h2 id="signal-coming-title" className="v6-en-display">Next in<br />the edit.</h2>
              </div>
              <p>現在、取材・検証・編集を進めているテーマです。公開時期は内容の精度を優先して決定します。</p>
            </header>
            <div>
              {upcomingArticles.map((article, index) => (
                <article className="signal-coming-row" key={article.slug}>
                  <span>{String(index + 1).padStart(2, "0")} · {article.category}</span>
                  <h3 className="v6-jp-heading">{article.title}</h3>
                  <b>IN DEVELOPMENT</b>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
