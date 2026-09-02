import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as runtime from "react/jsx-runtime";
import fs from "node:fs";
import path from "node:path";
import { posts } from "#site/content";
import { mdxComponents } from "@/components/mdx-components";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { StickyToc } from "@/components/StickyToc";
import InsightsMotion from "../InsightsMotion";
import "../v6-insights.css";

function extractFaqPairs(slug: string): { question: string; answer: string }[] {
  const mdxPath = path.join(process.cwd(), "content", "insights", `${slug}.mdx`);
  let raw = "";
  try {
    raw = fs.readFileSync(mdxPath, "utf-8");
  } catch {
    return [];
  }
  const out: { question: string; answer: string }[] = [];
  const faqSection = raw.split(/\n##\s+FAQ\b/i)[1];
  if (!faqSection) return out;
  const scope = faqSection.split(/\n(?:---|##\s)/)[0];
  const re = /\*\*Q\.\s*(.+?)\*\*\s*\nA\.\s*([\s\S]+?)(?=\n\n\*\*Q\.|\n\n$|$)/g;
  let match;
  while ((match = re.exec(scope)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim().replace(/\s+/g, " ");
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

type Params = { slug: string };

export function generateStaticParams() {
  return posts.filter((post) => !post.hidden).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
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
  const fn = new Function(code);
  const Component = fn(runtime).default;
  return <Component components={mdxComponents} />;
}

function SlamText({ children }: { children: string }) {
  // Latin / numeric runs stay unbreakable (one `.w` per run), CJK characters wrap
  // freely, whitespace becomes a `.space` — so "ROAS" never splits into "RO / AS".
  const tokens = children.match(/[A-Za-z0-9&+.%×#@'’\-]+|\s+|./gu) ?? [];
  return tokens.map((token, index) => {
    if (/^\s+$/.test(token)) return <span className="c space" aria-hidden="true" key={index}>{"\u00a0"}</span>;
    const chars = Array.from(token).map((ch, j) => (
      <span className="c" aria-hidden="true" key={`${index}-${j}`}>{ch}</span>
    ));
    return token.length > 1 ? <span className="w" key={index}>{chars}</span> : chars[0];
  });
}

export default async function InsightsArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = posts.find((item) => item.slug === slug);
  if (!post || post.hidden) return notFound();

  const visiblePosts = posts
    .filter((item) => !item.hidden)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const currentIndex = visiblePosts.findIndex((item) => item.slug === post.slug);
  const previous = currentIndex > 0 ? visiblePosts[currentIndex - 1] : null;
  const next = currentIndex < visiblePosts.length - 1 ? visiblePosts[currentIndex + 1] : null;
  const related = visiblePosts
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
    <main className="mn-v6 insights-v6 article-v6">
      <InsightsMotion />
      <ReadingProgressBar />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumb} />
      {faqPageSchema && <JsonLd data={faqPageSchema} />}

      <header className="insights-title navy" data-nav="dark">
        <div className="insights-title-top insights-title-meta">
          <div className="insights-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/insights">Insights</Link>
            <span aria-hidden="true">/</span>
            <span>{post.category}</span>
          </div>
          <span className="insights-title-index">Article / {String(currentIndex + 1).padStart(2, "0")}</span>
        </div>

        <h1 className="insights-slam" aria-label={post.title}>
          <SlamText>{post.title}</SlamText>
        </h1>

        <div className="insights-title-bottom insights-title-meta">
          <div className="article-hero-meta">
            {post.subtitle && <p className="insights-title-lead">{post.subtitle}</p>}
            <div className="article-hero-meta-line">
              <span>{post.category}</span>
              <time dateTime={post.date}>{formattedDate}</time>
              <span>{post.readTime} read</span>
              <span>{post.author}</span>
            </div>
          </div>
          <span className="insights-title-word" aria-hidden="true">READ</span>
        </div>
      </header>

      {post.hero && (
        <div className="article-hero-image-wrap" data-nav="light">
          <div className="article-hero-image" data-wipe>
            <Image
              src={post.hero}
              alt=""
              width={1600}
              height={900}
              priority
              sizes="100vw"
            />
          </div>
        </div>
      )}

      <article className="article-reading" data-reading-target data-nav="light">
        <div className="article-reading-grid">
          <aside className="article-toc-column" aria-label="目次">
            <StickyToc />
          </aside>
          <div className="article-copy">
            <div className="article-mdx">
              <MDXContent code={post.body} />
            </div>

            <div className="article-tags" aria-label="記事タグ">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/insights/tag/${encodeURIComponent(tag)}`}
                  className="article-tag-link"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            <section className="article-author" aria-labelledby="article-author-heading">
              <div className="article-author-mark" aria-hidden="true">N.I.</div>
              <div>
                <span className="article-author-role">Founder &amp; CEO</span>
                <h2 id="article-author-heading">{post.author}</h2>
                <p>mixednuts Inc. / Strategy × AI × Marketing</p>
              </div>
              <Link href="/team/ceo" className="article-author-link">Profile</Link>
            </section>

            <section className="article-cta" aria-labelledby="article-cta-heading">
              <div>
                <h2 id="article-cta-heading">知見を、事業の実装へ。</h2>
                <p>60分の無料相談で、貴社に適した論点と次の一手を整理します。</p>
              </div>
              <Link href="/contact" className="article-cta-link">相談を申し込む</Link>
            </section>
          </div>
        </div>
      </article>

      <section className="article-bottom" data-nav="light">
        {(previous || next) && (
          <nav className="article-nav" aria-label="前後の記事" data-reveal>
            {previous && (
              <Link href={previous.permalink} className="article-nav-link">
                <span className="article-nav-kicker">Newer article</span>
                <strong>{previous.title}</strong>
              </Link>
            )}
            {next && (
              <Link href={next.permalink} className="article-nav-link">
                <span className="article-nav-kicker">Older article</span>
                <strong>{next.title}</strong>
              </Link>
            )}
          </nav>
        )}

        {related.length > 0 && (
          <section className="related" aria-labelledby="related-heading">
            <header className="related-head" data-reveal>
              <span className="insights-section-label">Continue reading</span>
              <h2 id="related-heading">Related</h2>
            </header>
            {related.map((item) => (
              <Link href={item.permalink} className="related-row" key={item.slug} data-reveal>
                <span className="insight-category">{item.category}</span>
                <h3>{item.title}</h3>
                <div className="insight-meta">
                  <time dateTime={item.date}>{item.date.slice(0, 10).replace(/-/g, ".")}</time>
                  <span>{item.readTime}</span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
