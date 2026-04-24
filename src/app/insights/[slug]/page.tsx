import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as runtime from "react/jsx-runtime";
import { posts } from "#site/content";
import { mdxComponents } from "@/components/mdx-components";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

type Params = { slug: string };

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} | Insights`,
    description: post.excerpt,
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
  if (!post) return notFound();

  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const formattedDate = post.date.slice(0, 10).replace(/-/g, ".");
  const heroBg = post.hero
    ? `linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(10, 10, 10, 0.85)), url('${post.hero}') center/cover no-repeat`
    : "linear-gradient(135deg, var(--charcoal-soft), var(--charcoal))";

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

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumb} />
      <style>{`
        .article-hero { background: var(--off-white); padding: 140px 32px 64px; }
        .article-hero-inner { max-width: 860px; margin: 0 auto; }
        .article-hero .category-tag {
          display: inline-block; font-family: var(--font-sans-en); font-size: 11px; color: var(--cyan);
          letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700;
          margin-bottom: 16px; padding: 6px 14px; background: var(--cyan-soft); border-radius: 999px;
        }
        .article-hero h1 {
          font-family: 'Noto Sans JP', sans-serif; font-size: clamp(28px, 5vw, 52px); line-height: 1.25;
          font-weight: 900; color: var(--charcoal); margin-bottom: 24px; letter-spacing: -0.01em; word-break: keep-all;
        }
        .article-subtitle {
          font-family: var(--font-serif-jp); font-size: 17px; color: var(--gray-600);
          line-height: 1.9; margin-bottom: 40px;
        }
        .article-meta-row {
          display: flex; align-items: center; gap: 24px; padding-top: 24px;
          border-top: 1px solid rgba(10,10,10,0.12);
        }
        .article-author-img {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, var(--charcoal), var(--charcoal-soft));
          display: flex; align-items: center; justify-content: center;
          color: var(--off-white); font-weight: 700; font-size: 14px; font-family: var(--font-sans-en);
        }
        .article-author-name { font-size: 14px; font-weight: 700; color: var(--charcoal); }
        .article-author-role { font-size: 11px; color: var(--gray-400); font-family: var(--font-sans-en); letter-spacing: 0.05em; }
        .article-meta-items { display: flex; gap: 12px; font-size: 12px; color: var(--gray-400); font-family: var(--font-sans-en); letter-spacing: 0.05em; margin-left: auto; }

        .article-featured-image {
          max-width: 1280px; margin: 0 auto 64px; padding: 0 32px;
          aspect-ratio: 21/9; border-radius: 24px;
          background: ${heroBg};
        }

        .article-body { padding: 0 32px 120px; background: var(--off-white); }
        .article-body-inner { max-width: 720px; margin: 0 auto; }
        .article-body h2 {
          font-family: 'Noto Sans JP', sans-serif; font-size: 26px; line-height: 1.4;
          font-weight: 900; color: var(--charcoal); margin: 56px 0 20px;
          padding-bottom: 16px; border-bottom: 2px solid var(--charcoal);
          word-break: keep-all;
        }
        .article-body h2 a { text-decoration: none; color: inherit; }
        .article-body h3 {
          font-family: 'Noto Sans JP', sans-serif; font-size: 19px; font-weight: 700;
          color: var(--charcoal); margin: 32px 0 12px;
        }
        .article-body p {
          font-size: 15px; line-height: 2.0; color: var(--charcoal); margin-bottom: 20px;
        }
        .article-body ul, .article-body ol { margin: 16px 0 24px 24px; }
        .article-body ul li, .article-body ol li {
          font-size: 15px; line-height: 2.0; color: var(--charcoal); margin-bottom: 10px;
        }
        .article-body strong { color: var(--charcoal); font-weight: 700; }
        .article-body blockquote {
          margin: 32px 0; padding: 24px 32px;
          background: var(--off-white-alt); border-left: 3px solid var(--cyan); border-radius: 4px;
          font-family: var(--font-serif-jp); font-size: 16px; line-height: 1.9;
          color: var(--charcoal); font-style: italic;
        }
        .article-body code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.9em; background: var(--off-white-alt); padding: 0.15em 0.4em; border-radius: 4px;
        }
        .tldr {
          background: var(--off-white-alt);
          border: 1px solid rgba(0,217,255,0.25); border-radius: 12px;
          padding: 24px 32px; margin: 32px 0;
        }
        .tldr-label { font-family: var(--font-sans-en); font-size: 11px; color: var(--cyan); letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; margin-bottom: 12px; }
        .tldr p { margin: 0; font-size: 14px; line-height: 1.9; }
        .principle {
          background: var(--off-white-alt); border: 1px solid rgba(10,10,10,0.08); border-radius: 16px;
          padding: 28px 32px; margin: 24px 0;
        }
        .principle-num { font-family: var(--font-sans-en); font-size: 12px; color: var(--cyan); font-weight: 700; letter-spacing: 0.2em; margin-bottom: 8px; }
        .principle h3 { margin: 0 !important; font-size: 17px; line-height: 1.5; }

        .article-tags {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(10,10,10,0.12);
        }
        .article-tag-link { padding: 6px 14px; background: var(--off-white-alt); color: var(--gray-600); border-radius: 999px; font-size: 12px; text-decoration: none; transition: all 0.2s; }
        .article-tag-link:hover { background: var(--charcoal); color: var(--off-white); }

        .article-cta {
          margin-top: 48px; padding: 40px;
          background: var(--charcoal);
          color: var(--off-white); border-radius: 20px; text-align: center;
        }
        .article-cta h3 { font-family: 'Noto Sans JP', sans-serif; font-size: 22px; margin-bottom: 16px; color: var(--off-white); }
        .article-cta p { color: rgba(245,241,232,0.85); margin-bottom: 24px; font-size: 14px; }
        .article-cta .btn-cta { background: var(--cyan); color: var(--charcoal); padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .article-cta .btn-cta:hover { transform: translateY(-2px); }

        .related { background: var(--off-white-alt); padding: 96px 32px; }
        .related-inner { max-width: 1280px; margin: 0 auto; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 32px; }
        .related-card { background: var(--off-white); border: 1px solid rgba(10,10,10,0.08); border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: all 0.3s; }
        .related-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(10,10,10,0.08); }
        .related-visual { aspect-ratio: 16/9; position: relative; background: var(--charcoal); }
        .related-tag-pos { position: absolute; top: 16px; left: 16px; background: var(--off-white); color: var(--charcoal); padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; font-family: var(--font-sans-en); }
        .related-body { padding: 24px; }
        .related-date { font-size: 11px; color: var(--gray-400); font-family: var(--font-sans-en); margin-bottom: 8px; }
        .related-title { font-family: 'Noto Sans JP', sans-serif; font-size: 15px; font-weight: 700; color: var(--charcoal); line-height: 1.5; }

        @media (max-width: 900px) {
          .related-grid { grid-template-columns: 1fr; }
          .article-hero { padding: 120px 24px 48px; }
          .article-meta-items { margin-left: 0; }
          .article-meta-row { flex-wrap: wrap; }
        }
      `}</style>

      <section className="article-hero">
        <div className="article-hero-inner">
          <div className="breadcrumb" style={{ marginBottom: 20 }}>
            <Link href="/">Home</Link> / <Link href="/insights">Insights</Link> / {post.category}
          </div>
          <span className="category-tag">{post.category}</span>
          <h1>{post.title}</h1>
          {post.subtitle && <p className="article-subtitle">{post.subtitle}</p>}
          <div className="article-meta-row">
            <div className="article-author-img" aria-hidden="true">N.I.</div>
            <div>
              <div className="article-author-name">{post.author}</div>
              <div className="article-author-role">{post.authorRole}</div>
            </div>
            <div className="article-meta-items">
              <span>{formattedDate}</span>
              <span>·</span>
              <span>{post.readTime}で読める</span>
            </div>
          </div>
        </div>
      </section>

      <div className="article-featured-image" />

      <article className="article-body">
        <div className="article-body-inner">
          <MDXContent code={post.body} />

          <div className="article-tags">
            {post.tags.map((tag) => (
              <span key={tag} className="article-tag-link">#{tag}</span>
            ))}
          </div>

          <div className="article-cta">
            <h3>AI-first 組織の構築にご関心ありませんか?</h3>
            <p>私たちの知見をあなたの事業に実装します。60分の無料相談をご予約ください。</p>
            <Link href="/contact" className="btn-cta">無料相談を申し込む →</Link>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="related">
          <div className="related-inner">
            <span className="section-label">Related Articles</span>
            <h2 className="section-title" style={{ marginBottom: 32 }}>関連記事</h2>
            <div className="related-grid">
              {related.map((item) => (
                <Link key={item.slug} href={item.permalink} className="related-card">
                  <div
                    className="related-visual"
                    style={{
                      background: item.hero
                        ? `linear-gradient(135deg, rgba(0,217,255,0.18), rgba(10,10,10,0.85)), url('${item.hero}') center/cover no-repeat`
                        : "var(--charcoal)",
                    }}
                  >
                    <span className="related-tag-pos">{item.category}</span>
                  </div>
                  <div className="related-body">
                    <div className="related-date">{item.date.slice(0, 10).replace(/-/g, ".")}</div>
                    <div className="related-title">{item.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
