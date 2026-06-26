import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as runtime from "react/jsx-runtime";
import fs from "node:fs";
import path from "node:path";
import { posts } from "#site/content";
import { mdxComponents } from "@/components/mdx-components";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { StickyToc } from "@/components/StickyToc";

/**
 * Extract FAQ Q&A pairs from raw MDX content.
 * Matches the pattern:  **Q. ...?**\nA. ...
 * Returns array of {question, answer}.
 */
function extractFaqPairs(slug: string): { question: string; answer: string }[] {
  const mdxPath = path.join(process.cwd(), "content", "insights", `${slug}.mdx`);
  let raw = "";
  try {
    raw = fs.readFileSync(mdxPath, "utf-8");
  } catch {
    return [];
  }
  const out: { question: string; answer: string }[] = [];
  // Split by section "## FAQ" (or "FAQ" heading) and parse Q/A within
  const faqSection = raw.split(/\n##\s+FAQ\b/i)[1];
  if (!faqSection) return out;
  // Stop at next "---" (Sources section) or "## "
  const scope = faqSection.split(/\n(?:---|##\s)/)[0];
  const re = /\*\*Q\.\s*(.+?)\*\*\s*\nA\.\s*([\s\S]+?)(?=\n\n\*\*Q\.|\n\n$|$)/g;
  let m;
  while ((m = re.exec(scope)) !== null) {
    const question = m[1].trim();
    const answer = m[2].trim().replace(/\s+/g, " ");
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

type Params = { slug: string };

export function generateStaticParams() {
  return posts.filter((post) => !post.hidden).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | Insights`,
    description: post.excerpt,
    alternates: { canonical: `/insights/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: post.hero ? [{ url: post.hero }] : undefined,
    },
  };
}

function MDXContent({ code }: { code: string }) {
  const fn = new Function(code);
  const Component = fn(runtime).default;
  return <Component components={mdxComponents} />;
}

export default async function InsightsArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post || post.hidden) return notFound();

  const related = posts.filter((p) => p.slug !== post.slug && !p.hidden).slice(0, 3);
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
  const faqPageSchema =
    faqPairs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `https://mixednuts-inc.com${post.permalink}#faq`,
          mainEntity: faqPairs.map((p) => ({
            "@type": "Question",
            name: p.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: p.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumb} />
      {faqPageSchema && <JsonLd data={faqPageSchema} />}

      {/* Layout glue only — the dark scope, prose typography, hero, art cards,
          and CTA all come from the scoped v4 stylesheet (.mn-v4). This block
          provides the two-column TOC layout + tags/CTA spacing that v4 .prose
          does not ship. */}
      <style>{`
        .mn-v4 .article-shell { background: #fff; }
        .mn-v4 .article-shell .article-layout {
          max-width: 1120px; margin: 0 auto;
          padding: 88px 24px;
          display: grid; grid-template-columns: 220px minmax(0, 720px);
          gap: 64px; align-items: start; justify-content: center;
        }
        .mn-v4 .article-shell .article-side { padding-top: 4px; }
        .mn-v4 .article-shell .article-main { min-width: 0; }
        /* Neutralise the standalone .prose padding/centering when nested in the grid */
        .mn-v4 .article-shell .article-main .prose { padding: 0; max-width: 720px; margin: 0; }
        @media (max-width: 1100px) {
          .mn-v4 .article-shell .article-layout { grid-template-columns: 1fr; max-width: 760px; gap: 0; }
          .mn-v4 .article-shell .article-side { display: none; }
        }
        @media (max-width: 700px) {
          .mn-v4 .article-shell .article-layout { padding: 58px 22px; }
        }
        .mn-v4 .article-foot {
          max-width: 720px; margin: 0 auto;
        }
        .mn-v4 .article-tags {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 56px; padding-top: 32px; border-top: 1px solid rgba(10,10,10,0.12);
        }
        .mn-v4 .article-tag-link {
          padding: 9px 18px; border-radius: 999px;
          border: 1px solid rgba(10,10,10,0.2);
          font-family: var(--font-sans-en); font-size: 12px; font-weight: 600;
          letter-spacing: 0.04em; color: #0A0A0A; text-decoration: none;
          transition: all 0.2s;
        }
        .mn-v4 .article-tag-link:hover { background: #0A0A0A; color: #fff; border-color: #0A0A0A; }
      `}</style>

      {/* ===== HERO ===== */}
      <header className="article-hero">
        <canvas
          className="hero-fx fxgen"
          data-count="54"
          data-interactive
          aria-hidden="true"
        ></canvas>
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap">
          <Link href="/insights" className="back-link reveal">
            ← Insights に戻る
          </Link>
          <div className="article-cat-lg reveal">{post.category}</div>
          <h1 className="article-title reveal">{post.title}</h1>
          {post.subtitle && (
            <p
              className="reveal"
              style={{
                marginTop: 24,
                maxWidth: 820,
                fontFamily: "var(--font-serif-jp, 'Noto Serif JP', serif)",
                fontSize: 17,
                lineHeight: 1.95,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {post.subtitle}
            </p>
          )}
          <div className="article-meta reveal">
            <span>{formattedDate}</span>
            <span>{post.author}</span>
            {post.authorRole && <span>{post.authorRole}</span>}
            <span>{post.readTime}で読める</span>
          </div>
        </div>
      </header>

      {/* ===== LEAD IMAGE (only when the post has a real hero) ===== */}
      {post.hero && (
        <div className="article-lead-img reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.hero} alt="" />
        </div>
      )}

      <ReadingProgressBar />

      {/* ===== BODY ===== */}
      <section className="article-shell">
        <article data-reading-target>
          <div className="article-layout">
            <aside className="article-side">
              <StickyToc />
            </aside>
            <div className="article-main">
              <div className="prose">
                <MDXContent code={post.body} />
              </div>

              <div className="article-foot">
                <div className="article-tags">
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
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* ===== RELATED ===== */}
      {related.length > 0 && (
        <section className="sec white" style={{ paddingTop: 40 }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Related
              </div>
              <h2 className="title reveal">
                関連する<em>記事</em>。
              </h2>
            </div>
            <div className="art-grid">
              {related.map((item) => (
                <Link key={item.slug} href={item.permalink} className="art reveal">
                  <div className="art-img">
                    <span className="art-cat">{item.category}</span>
                    {item.hero ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.hero} alt="" />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "linear-gradient(135deg,#0A0A0A,#1a1d28)",
                        }}
                      />
                    )}
                  </div>
                  <div className="art-body">
                    <div className="date">
                      {item.date.slice(0, 10).replace(/-/g, ".")}
                    </div>
                    <h4>{item.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== CTA ===== */}
      <section className="cta">
        <div className="cta-photo" data-parallax="0.16" aria-hidden="true" />
        <canvas className="cta-fx fxgen" data-count="46" aria-hidden="true"></canvas>
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s build together
          </div>
          <h2 className="cta-h reveal">
            AI-first 組織の
            <br />
            <em>実装</em>へ。
          </h2>
          <p className="reveal">
            私たちの知見をあなたの事業に実装します。60分の無料相談をご予約ください。
          </p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>無料相談を申し込む</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
