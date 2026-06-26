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
    alternates: { canonical: `/insights/tag/${tag}` },
    robots: { index: true, follow: true },
  };
}

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

      {/* ===== HERO ===== */}
      <header className="subhero">
        <canvas
          className="hero-fx fxgen"
          data-count="60"
          data-interactive
          aria-hidden="true"
        />
        <div className="hero-orb o1" data-parallax="0.34" data-mouse="0.05" aria-hidden="true" />
        <div className="hero-orb o2" data-parallax="0.22" data-mouse="0.035" aria-hidden="true" />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap subhero-inner">
          <div className="crumb reveal">
            <Link href="/">Home</Link> / <Link href="/insights">Insights</Link> / Tag
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Insights · Tag
          </div>
          <h1 className="big-title-jp reveal">
            #<em>{tag}</em>
          </h1>
          <p className="subhero-lead reveal">
            タグ「{tag}」の記事 {matched.length} 件。AI-first 組織の現場から、戦略・AI・マーケティングの交差点で見えてきた知見をお届けします。
          </p>
        </div>
      </header>

      {/* ===== ARTICLE GRID ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="art-grid">
            {matched.map((p) => (
              <Link key={p.slug} href={p.permalink} className="art reveal">
                <div className="art-img">
                  <span className="art-cat">{p.category}</span>
                  {p.hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.hero} alt="" />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        background:
                          "linear-gradient(135deg, var(--charcoal-soft, #14151b), var(--charcoal, #05060A))",
                      }}
                    />
                  )}
                </div>
                <div className="art-body">
                  <div className="date">
                    {p.date.slice(0, 10).replace(/-/g, ".")} · {p.readTime}
                  </div>
                  <h4>{p.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta">
        <div className="cta-photo" data-parallax="0.16" aria-hidden="true" />
        <canvas className="cta-fx fxgen" data-count="46" aria-hidden="true" />
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s build together
          </div>
          <h2 className="cta-h reveal">
            LET&apos;S BUILD
            <br />
            <em>growth.</em>
          </h2>
          <p className="reveal">記事の先にある、貴社の実装へ。60分の無料相談からどうぞ。</p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>無料相談を申し込む</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
