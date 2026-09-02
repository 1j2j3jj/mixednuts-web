import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as runtime from "react/jsx-runtime";
import { posts } from "#site/content";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { StickyToc } from "@/components/StickyToc";
import { mdxComponents } from "@/components/mdx-components";
import { buildPageOg } from "@/lib/site-metadata";
import "../v6-insights.css";

function extractFaqPairs(slug: string): { question: string; answer: string }[] {
  const mdxPath = path.join(process.cwd(), "content", "insights", `${slug}.mdx`);
  let raw = "";
  try {
    raw = fs.readFileSync(mdxPath, "utf-8");
  } catch {
    return [];
  }
  const faqSection = raw.split(/\n##\s+FAQ\b/i)[1];
  if (!faqSection) return [];
  const scope = faqSection.split(/\n(?:---|##\s)/)[0];
  const pairs: { question: string; answer: string }[] = [];
  const pattern = /\*\*Q\.\s*(.+?)\*\*\s*\nA\.\s*([\s\S]+?)(?=\n\n\*\*Q\.|\n\n$|$)/g;
  let match;
  while ((match = pattern.exec(scope)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim().replace(/\s+/g, " ");
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

type Params = { slug: string };

export function generateStaticParams() {
  return posts.filter((post) => !post.hidden).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | Insights`,
    description: post.excerpt,
    alternates: { canonical: `/insights/${slug}` },
    ...buildPageOg({
      title: post.title,
      description: post.excerpt,
      path: post.permalink,
      images: post.hero ? [{ url: post.hero }] : undefined,
      article: { publishedTime: post.date, authors: [post.author] },
    }),
  };
}

function MDXContent({ code }: { code: string }) {
  const compile = new Function(code);
  const Component = compile(runtime).default;
  return <Component components={mdxComponents} />;
}

export default async function InsightsArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === slug);
  if (!post || post.hidden) return notFound();

  const orderedPosts = [...posts]
    .filter((item) => !item.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const currentIndex = orderedPosts.findIndex((item) => item.slug === post.slug);
  const newerPost = currentIndex > 0 ? orderedPosts[currentIndex - 1] : null;
  const olderPost = currentIndex < orderedPosts.length - 1 ? orderedPosts[currentIndex + 1] : null;
  const related = orderedPosts
    .filter((item) => item.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);
  const formattedDate = post.date.slice(0, 10).replace(/-/g, ".");

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `https://mixednuts-inc.com${post.permalink}#article`,
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "ja-JP",
    author: {
      "@type": "Person",
      ...(post.author === "石井 希実"
        ? {
            "@id": "https://mixednuts-inc.com/team/ceo#person",
            url: "https://mixednuts-inc.com/team/ceo",
          }
        : {}),
      name: post.author,
      jobTitle: post.authorRole,
      worksFor: { "@id": "https://mixednuts-inc.com/#organization" },
    },
    publisher: { "@id": "https://mixednuts-inc.com/#organization" },
    image: post.hero ? `https://mixednuts-inc.com${post.hero}` : undefined,
    keywords: post.tags.join(", "),
    articleSection: post.category,
    mainEntityOfPage: `https://mixednuts-inc.com${post.permalink}`,
  };

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: post.title, path: post.permalink },
  ]);

  const faqPairs = extractFaqPairs(post.slug);
  const faqPageSchema = faqPairs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `https://mixednuts-inc.com${post.permalink}#faq`,
        mainEntity: faqPairs.map((pair) => ({
          "@type": "Question",
          name: pair.question,
          acceptedAnswer: { "@type": "Answer", text: pair.answer },
        })),
      }
    : null;

  return (
    <div className="mn-v6 mn-v6-insights">
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumb} />
      {faqPageSchema && <JsonLd data={faqPageSchema} />}
      <ReadingProgressBar />

      <main>
        <section className="article-hero" aria-labelledby="article-title">
          <div className="v6-scene-inner article-hero-grid">
            <div>
              <p className="article-breadcrumb">
                <Link href="/">Home</Link> / <Link href="/insights">Insights</Link> / {post.category}
              </p>
              <p className="v6-kicker">Signal · {post.category}</p>
              <h1 id="article-title" className="v6-jp-heading">{post.title}</h1>
              {post.subtitle && <p className="article-subtitle">{post.subtitle}</p>}
              <div className="article-byline">
                <div>
                  <div className="article-author-name">{post.author}</div>
                  <div className="article-author-role">{post.authorRole}</div>
                </div>
                <div className="article-date">
                  <time dateTime={post.date.slice(0, 10)}>{formattedDate}</time> · {post.readTime} read
                </div>
              </div>
            </div>
            {post.hero && (
              <div className="article-hero-image">
                <Image src={post.hero} alt="" width={960} height={540} priority sizes="(max-width: 860px) 100vw, 40vw" />
              </div>
            )}
          </div>
        </section>

        <article className="article-paper" data-reading-target>
          <div className="v6-scene-inner article-layout">
            <aside className="article-side"><StickyToc /></aside>
            <div className="article-prose">
              <MDXContent code={post.body} />

              <div className="article-tags" aria-label="記事タグ">
                {post.tags.map((tag) => (
                  <Link key={tag} href={`/insights/tag/${encodeURIComponent(tag)}`} className="article-tag-link">
                    #{tag}
                  </Link>
                ))}
              </div>

              <aside className="article-cta">
                <h3 className="v6-jp-heading">AI-first 組織の構築にご関心ありませんか?</h3>
                <p>私たちの知見をあなたの事業に実装します。60分の無料相談をご予約ください。</p>
                <Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link>
              </aside>
            </div>
          </div>
        </article>

        <section className="article-footer" aria-label="記事ナビゲーションと関連記事">
          <div className="v6-scene-inner article-footer-grid">
            <div>
              <p className="v6-kicker v6-kicker--paper">Continue reading</p>
              <h2 className="v6-en-display">Next<br />signals.</h2>
              {newerPost && (
                <Link href={newerPost.permalink} className="article-nav-link">
                  <span className="article-nav-label">Newer</span>
                  <h3 className="v6-jp-heading">{newerPost.title}</h3>
                  <span aria-hidden="true">↑</span>
                </Link>
              )}
              {olderPost && (
                <Link href={olderPost.permalink} className="article-nav-link">
                  <span className="article-nav-label">Older</span>
                  <h3 className="v6-jp-heading">{olderPost.title}</h3>
                  <span aria-hidden="true">↓</span>
                </Link>
              )}
            </div>
            <div>
              <p className="v6-kicker v6-kicker--paper">Related Articles</p>
              <h2 className="v6-jp-heading">関連記事</h2>
              {related.map((item) => (
                <Link href={item.permalink} className="related-link" key={item.slug}>
                  <span className="related-meta">{item.category}</span>
                  <h3 className="v6-jp-heading">{item.title}</h3>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
