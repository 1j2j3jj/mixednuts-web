import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "#site/content";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import InsightsMotion from "../../InsightsMotion";
import "../../v6-insights.css";

type Params = { tag: string };

export function generateStaticParams() {
  const tags = new Set<string>();
  for (const post of posts) {
    if (post.hidden) continue;
    for (const tag of post.tags) tags.add(tag);
  }
  return Array.from(tags).map((tag) => ({ tag }));
}

function decodeTag(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tag } = await params;
  const name = decodeTag(tag);
  const title = `タグ「${name}」の記事一覧`;
  const description = `タグ「${name}」に関連するmixednutsの公開記事を、新しい順に一覧で紹介します。戦略、AI、経営管理、マーケティング、技術実装のうち、このテーマに紐づく実践知を確認できます。`;
  const path = `/insights/tag/${encodeURIComponent(name)}`;
  const visibleCount = posts.filter(
    (post) => !post.hidden && post.tags.includes(name),
  ).length;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(visibleCount < 2 ? { robots: { index: false, follow: true } } : {}),
    ...buildPageOg({ title, description, path }),
  };
}

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

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag: raw } = await params;
  const tag = decodeTag(raw);
  const matched = posts
    .filter((post) => !post.hidden && post.tags.includes(tag))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (matched.length === 0) return notFound();

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: `#${tag}`, path: `/insights/tag/${encodeURIComponent(tag)}` },
  ]);
  const collectionPageSchema = buildWebPageSchema({
    type: "CollectionPage",
    path: `/insights/tag/${encodeURIComponent(tag)}`,
    name: `タグ「${tag}」の記事一覧`,
    description: `タグ「${tag}」に関連するmixednutsの公開記事を、新しい順に一覧で紹介します。戦略、AI、経営管理、マーケティング、技術実装のうち、このテーマに紐づく実践知を確認できます。`,
    mainEntityList: {
      "@type": "ItemList",
      itemListElement: matched.map((post, index) => ({ "@type": "ListItem", position: index + 1, url: `https://mixednuts-inc.com${post.permalink}`, name: post.title })),
    },
  });

  return (
    <main className="mn-v6 insights-v6 tag-v6">
      <InsightsMotion />
      <JsonLd data={collectionPageSchema} />
      <JsonLd data={breadcrumb} />

      <header className="insights-title enji" data-nav="dark">
        <div className="insights-title-top insights-title-meta">
          <nav className="insights-breadcrumb" aria-label="パンくずリスト"><ol style={{ display: "contents" }}><li style={{ display: "contents" }}><Link href="/">Home</Link></li><li style={{ display: "contents" }}><span aria-hidden="true">/</span><Link href="/insights">Insights</Link></li><li style={{ display: "contents" }}><span aria-hidden="true">/</span><span>Tag</span></li></ol></nav>
          <span className="insights-title-index">Tag index / {String(matched.length).padStart(2, "0")}</span>
        </div>

        <h1 className="insights-slam" aria-label={`#${tag}`}>
          <SlamText>{`#${tag}`}</SlamText>
        </h1>

        <div className="insights-title-bottom insights-title-meta">
          <p className="insights-title-lead">
            タグ「{tag}」に紐づく公開記事 {matched.length} 件。
            実装と検証から得た知見を、新しい順にまとめています。
          </p>
          <span className="insights-title-word" aria-hidden="true">TAG</span>
        </div>
      </header>

      <section className="tag-index" data-nav="light">
        <div className="tag-index-inner">
          <header className="tag-index-summary" data-reveal>
            <span className="insights-section-label">Published articles</span>
            <span>{matched.length} entries / newest first</span>
          </header>

          {matched.map((post) => (
            <Link href={post.permalink} className="tag-row" key={post.slug} data-reveal>
              <span className="insight-category">{post.category}</span>
              <div>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
              </div>
              <div className="insight-meta">
                <time dateTime={post.date}>{post.date.slice(0, 10).replace(/-/g, ".")}</time>
                <span>{post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
