import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "#site/content";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tag } = await params;
  const name = decodeTag(tag);
  const title = `#${name} — Insights`;
  const description = `タグ「${name}」の記事一覧。mixednuts Inc. の Insights。`;
  const canonicalPath = `/insights/tag/${encodeURIComponent(name)}`;
  const visibleCount = posts.filter((post) => !post.hidden && post.tags.includes(name)).length;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: visibleCount >= 2 ? { index: true, follow: true } : { index: false, follow: true },
    ...buildPageOg({ title, description, path: canonicalPath }),
  };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag: rawTag } = await params;
  const tag = decodeTag(rawTag);
  const matched = posts
    .filter((post) => !post.hidden && post.tags.includes(tag))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (matched.length === 0) return notFound();

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: `#${tag}`, path: `/insights/tag/${encodeURIComponent(tag)}` },
  ]);

  return (
    <div className="mn-v6 mn-v6-insights">
      <JsonLd data={breadcrumb} />
      <main>
        <section className="tag-hero" aria-labelledby="tag-title">
          <div className="v6-scene-inner tag-hero-inner">
            <p className="v6-kicker">Insights · Tag Index</p>
            <h1 id="tag-title" className="v6-en-display tag-title">#<span className="v6-accent">{tag}</span></h1>
            <p className="tag-count">{String(matched.length).padStart(2, "0")} ARTICLES · LATEST FIRST</p>
          </div>
        </section>

        <section className="v6-paper-scene signal-index" aria-label={`タグ「${tag}」の記事一覧`}>
          <div className="v6-scene-inner">
            <header className="signal-index-head">
              <div>
                <p className="v6-kicker v6-kicker--paper">Filtered Signal</p>
                <h2 className="v6-en-display">Selected<br />reading.</h2>
              </div>
              <nav className="signal-filters" aria-label="記事一覧へ戻る">
                <Link href="/insights" className="signal-filter">All Insights</Link>
                <span className="signal-filter is-active" aria-current="page">#{tag}</span>
              </nav>
            </header>

            <div className="signal-grid">
              {matched.map((post, index) => (
                <Link href={post.permalink} className="signal-row" key={post.slug}>
                  {post.hero && (
                    <div className="signal-row-visual">
                      <Image src={post.hero} alt="" width={720} height={405} sizes="(max-width: 860px) 100vw, 46vw" />
                    </div>
                  )}
                  <span className="signal-row-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="signal-meta">
                      <span className="signal-category">{post.category}</span>
                      <time dateTime={post.date.slice(0, 10)}>{post.date.slice(0, 10).replace(/-/g, ".")}</time>
                      <span>{post.readTime}</span>
                    </div>
                    <h3 className="v6-jp-heading">{post.title}</h3>
                    <p>{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
