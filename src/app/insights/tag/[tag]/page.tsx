import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts } from "#site/content";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

type Params = { tag: string };

/** Build static params for every unique tag across all posts. */
export function generateStaticParams() {
  const tags = new Set<string>();
  for (const p of posts) for (const t of p.tags) tags.add(t);
  return Array.from(tags).map((tag) => ({ tag: encodeURIComponent(tag) }));
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
  return {
    title: `#${name} — Insights | mixednuts`,
    description: `タグ「${name}」の記事一覧。mixednuts Inc. の Insights。`,
    robots: { index: true, follow: true },
  };
}

const categoryColorMap: Record<string, string> = {
  AI: "art-ai",
  STRATEGY: "art-strategy",
  MARKETING: "art-marketing",
  FINANCE: "art-finance",
  ENGINEERING: "art-ai",
  "SEO / AIO": "art-marketing",
  ORGANIZATION: "art-strategy",
};

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag: raw } = await params;
  const tag = decodeTag(raw);

  const matched = posts
    .filter((p) => p.tags.includes(tag))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (matched.length === 0) return notFound();

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Insights", path: "/insights" },
    { name: `#${tag}`, path: `/insights/tag/${encodeURIComponent(tag)}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <style>{`
        .tag-hero {
          background: var(--off-white);
          padding: 140px 32px 64px;
          border-bottom: 1px solid rgba(10,10,10,0.06);
        }
        .tag-hero-inner { max-width: 1280px; margin: 0 auto; }
        .tag-hero .breadcrumb { font-size: 13px; color: var(--gray-500); margin-bottom: 16px; }
        .tag-hero .breadcrumb a { color: var(--gray-500); text-decoration: none; }
        .tag-hero h1 {
          font-family: 'Noto Sans JP', sans-serif;
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 900; letter-spacing: -0.02em; line-height: 1.15;
          color: var(--charcoal); margin-bottom: 12px;
        }
        .tag-hero h1 .accent { color: var(--cyan); }
        .tag-hero .lead { color: var(--gray-600); font-size: 15px; }

        .tag-grid-section { background: var(--off-white-alt); padding: 64px 32px 120px; }
        .tag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1280px; margin: 0 auto; }
        .tag-card {
          background: var(--off-white); border: 1px solid rgba(10,10,10,0.08); border-radius: 16px;
          overflow: hidden; text-decoration: none; color: inherit;
          transition: all 0.3s; display: flex; flex-direction: column;
        }
        .tag-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(10,10,10,0.08); border-color: var(--charcoal); }
        .tag-visual {
          aspect-ratio: 16/9; position: relative;
          background: linear-gradient(135deg, var(--charcoal-soft), var(--charcoal));
          border-bottom: 2px solid var(--cyan);
        }
        .tag-visual-badge {
          position: absolute; top: 16px; left: 16px;
          background: var(--off-white); color: var(--charcoal);
          padding: 4px 10px; border-radius: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; font-family: var(--font-sans-en);
        }
        .tag-body { padding: 24px; flex: 1; display: flex; flex-direction: column; }
        .tag-meta { display: flex; gap: 12px; font-size: 11px; color: var(--gray-400); font-family: var(--font-sans-en); margin-bottom: 10px; }
        .tag-body h3 { font-family: 'Noto Sans JP', sans-serif; font-size: 16px; font-weight: 700; line-height: 1.5; margin-bottom: 12px; color: var(--charcoal); flex: 1; }
        .tag-excerpt { font-size: 12px; color: var(--gray-600); line-height: 1.7; }

        @media (max-width: 900px) {
          .tag-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="tag-hero">
        <div className="tag-hero-inner">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / <Link href="/insights">Insights</Link> / Tag
          </div>
          <h1>
            <span className="accent">#{tag}</span>
          </h1>
          <p className="lead">
            タグ「{tag}」の記事 {matched.length} 件。
          </p>
        </div>
      </section>

      <section className="tag-grid-section">
        <div className="tag-grid">
          {matched.map((p) => (
            <Link key={p.slug} href={p.permalink} className="tag-card">
              <div
                className={`tag-visual ${categoryColorMap[p.category] ?? "art-ai"}`}
                style={
                  p.hero
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.04) 0%, rgba(10,10,10,0.32) 100%), url('${p.hero}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <span className="tag-visual-badge">{p.category}</span>
              </div>
              <div className="tag-body">
                <div className="tag-meta">
                  <span>{p.date.slice(0, 10).replace(/-/g, ".")}</span>
                  <span>·</span>
                  <span>{p.readTime}</span>
                </div>
                <h3>{p.title}</h3>
                <p className="tag-excerpt">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
