import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { posts } from "#site/content";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { Odometer } from "@/components/v6/KineticText";
import { buildPageOg } from "@/lib/site-metadata";
import InsightsMotion from "./InsightsMotion";
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

const upcomingArticles: ListItem[] = [
  {
    slug: "fpna-ai-monthly-close",
    href: null,
    category: "AI",
    date: "2026.03.18",
    readTime: "8分",
    title: "FP&A × AI 自動化: 月次締め工数を70%削減した実装パターン",
    excerpt:
      "管理会計の月次クローズ作業にAIエージェントを組み込み、工数を大幅削減した事例。freee API連携とLLM集計の組み合わせを詳解。",
    author: "石井 希実",
  },
  {
    slug: "ma-dd-ai",
    href: null,
    category: "STRATEGY",
    date: "2026.03.05",
    readTime: "10分",
    title: "M&A デューデリジェンスをAIで加速する: 財務DDの新アプローチ",
    excerpt:
      "EDINETデータ自動取得からLLM分析まで。財務DDを加速する手法と、精度を担保するための人間チェックポイントを公開。",
    author: "石井 希実",
  },
  {
    slug: "prompt-engineering-guide",
    href: null,
    category: "MARKETING",
    date: "2026.02.26",
    readTime: "7分",
    title: "プロンプトエンジニアリングの実務ガイド: 再現性のある出力の作り方",
    excerpt:
      "「なんとなく動く」から「必ず動く」へ。本番投入できるプロンプトの設計原則と、評価フレームワークの構築方法を解説します。",
    author: "石井 希実",
  },
  {
    slug: "google-ads-ai-cpa",
    href: null,
    category: "MARKETING",
    date: "2026.02.14",
    readTime: "9分",
    title: "Google Ads × AI: 自動入札とAIクリエイティブの実装方法",
    excerpt:
      "スマート入札の誤解と正しい使い方。AIクリエイティブ生成ツールの選定基準、A/Bテスト設計まで、実装ベースで解説。",
    author: "石井 希実",
  },
  {
    slug: "diversity-mix-ops",
    href: null,
    category: "ORGANIZATION",
    date: "2026.02.12",
    readTime: "6分",
    title: "多様な専門性を成果に変えるチーム運営術",
    excerpt:
      "事業会社の経営企画・FP&A、広告・グロースなど、異なる専門性をどう組み合わせるか。チーム設計の実践から得た知見。",
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

function SlamText({ children }: { children: string }) {
  return Array.from(children).map((character, index) => (
    <span
      className={character === " " ? "c space" : "c"}
      key={`${character}-${index}`}
      aria-hidden="true"
    >
      {character === " " ? "\u00a0" : character}
    </span>
  ));
}

function ArticleImage({ article }: { article: ListItem }) {
  if (!article.hero) return null;
  return (
    <span className="insight-image" aria-hidden="true">
      <Image
        src={article.hero}
        alt=""
        width={1200}
        height={675}
        sizes="(max-width: 900px) 100vw, 50vw"
      />
    </span>
  );
}

export default function InsightsPage() {
  const featured = publishedArticles[0];
  const remaining = publishedArticles.slice(1);
  const categories = Array.from(new Set(publishedArticles.map((article) => article.category)));

  return (
    <main className="mn-v6 insights-v6">
      <InsightsMotion />
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />

      <section className="insights-title" data-nav="dark">
        <div className="insights-title-top insights-title-meta">
          <div className="insights-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Insights</span>
          </div>
          <span className="insights-title-index">Knowledge / 06</span>
        </div>

        <h1 className="insights-slam" aria-label="実践から生まれる知見を届ける。">
          <SlamText>実践から生まれる知見を届ける。</SlamText>
        </h1>

        <div className="insights-title-bottom insights-title-meta">
          <p className="insights-title-lead">
            戦略・AI・マーケティング・ファイナンスの最前線で得た知見を公開。
            「使えるノウハウ」だけを、実体験ベースで書いています。
          </p>
          <span className="insights-title-word" aria-hidden="true">INSIGHTS</span>
        </div>
      </section>

      <section className="insights-paper" data-nav="light">
        <header className="insights-index-head" data-reveal>
          <div>
            <span className="insights-section-label">Published index</span>
            <h2>Latest</h2>
          </div>
          <nav className="insights-tabs" aria-label="記事カテゴリ">
            <Link className="insights-tab" href="/insights" aria-current="page">All</Link>
            {categories.map((category) => (
              <span className="insights-tab" key={category}>{category}</span>
            ))}
          </nav>
        </header>

        {featured?.href && (
          <Link
            href={featured.href}
            className="insight-lead"
            data-odometer-group
            data-wipe
          >
            <div className="insight-lead-visual">
              {featured.thumbNumber && (
                <div className="insight-number">
                  <strong><Odometer value={featured.thumbNumber} /></strong>
                  {featured.thumbLabel && <small>{featured.thumbLabel}</small>}
                </div>
              )}
              <ArticleImage article={featured} />
            </div>
            <div className="insight-lead-copy">
              <span className="insight-category">{featured.category}</span>
              <h3>{featured.title}</h3>
              <p>{featured.excerpt}</p>
              <div className="insight-meta">
                <time dateTime={featured.date.replaceAll(".", "-")}>{featured.date}</time>
                <span>{featured.readTime} read</span>
                <span>{featured.author}</span>
              </div>
            </div>
          </Link>
        )}

        <div className="insight-grid">
          {remaining.map((article) => (
            <Link
              href={article.href ?? "/insights"}
              className="insight-row"
              key={article.slug}
              data-reveal
            >
              <span className="insight-category">{article.category}</span>
              <span className="insight-read-time">{article.readTime}</span>
              <ArticleImage article={article} />
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <div className="insight-meta">
                <time dateTime={article.date.replaceAll(".", "-")}>{article.date}</time>
                {article.thumbNumber && (
                  <span>{article.thumbNumber}{article.thumbLabel ? ` / ${article.thumbLabel}` : ""}</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        <section className="upcoming" data-reveal>
          <header className="upcoming-head">
            <div>
              <span className="insights-section-label">Editorial pipeline</span>
              <h2>Coming soon</h2>
            </div>
            <p>現在編集中の記事です。公開時期は内容の検証完了後に決定します。</p>
          </header>
          {upcomingArticles.map((article) => (
            <div className="upcoming-row" key={article.slug}>
              <span className="insight-category">{article.category}</span>
              <h3>{article.title}</h3>
              <span className="upcoming-status">In preparation</span>
              <div className="insight-meta">
                <span>{article.readTime}</span>
                <span>{article.author}</span>
              </div>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
