import type { Metadata } from "next";
import Link from "next/link";
import { works, type Work, CASES_COMING_SOON } from "@/data/works";
import { notFound } from "next/navigation";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  if (CASES_COMING_SOON) return [];
  return works.filter((w) => !w.hidden).map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);
  if (!work || work.hidden || CASES_COMING_SOON) return {};
  return {
    title: `Case: ${work.title}`,
    description: work.summary,
    alternates: { canonical: `/works/${slug}` },
  };
}

const serviceLabels: Record<string, string> = { ai: "AI", strategy: "Strategy", marketing: "Marketing" };

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  if (CASES_COMING_SOON) notFound();
  const work = works.find((w) => w.slug === slug);
  if (!work || work.hidden) notFound();

  const relatedWorks = works
    .filter((w) => !w.hidden && w.slug !== slug && w.services.some((s) => work.services.includes(s)))
    .slice(0, 3);

  const serviceCombo = work.services.map((s) => serviceLabels[s]).join(" × ");

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `https://mixednuts-inc.com/works/${work.slug}#case`,
    name: work.title,
    description: work.summary,
    about: work.industry,
    creator: { "@id": "https://mixednuts-inc.com/#organization" },
    inLanguage: "ja-JP",
    keywords: work.services.join(", "),
    image: `https://mixednuts-inc.com${work.image}`,
    url: `https://mixednuts-inc.com/works/${work.slug}`,
  };

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Works", path: "/works" },
    { name: work.title, path: `/works/${work.slug}` },
  ]);

  return (
    <>
      <JsonLd data={creativeWorkSchema} />
      <JsonLd data={breadcrumb} />

      {/* Scoped helpers for case-body bits not covered by the shared v4 vocabulary. */}
      <style>{`
        .mn-v4 .case-list{list-style:none;margin:20px 0 0;padding:0;max-width:680px}
        .mn-v4 .case-list li{position:relative;padding:13px 0 13px 26px;font-size:15px;line-height:1.85;color:#26272B;border-bottom:1px solid rgba(10,10,10,.08)}
        .mn-v4 .case-list li:last-child{border-bottom:none}
        .mn-v4 .case-list li::before{content:'▸';position:absolute;left:2px;color:var(--cyan-deep,#00B4D8);font-weight:700}
        .mn-v4 .case-quote{margin:28px 0 0;padding:26px 30px;max-width:680px;border-left:3px solid var(--cyan-deep,#00B4D8);background:rgba(10,10,10,.03);border-radius:0 14px 14px 0;font-family:var(--font-serif-jp);font-style:italic;font-size:17px;line-height:1.9;color:#0A0A0A}
        .mn-v4 .case-phases{display:grid;gap:18px;margin-top:28px;max-width:680px}
        .mn-v4 .case-phase{padding:24px 28px;border-radius:16px;background:#F7F7F4;border:1px solid rgba(10,10,10,.07)}
        .mn-v4 .case-phase-tag{display:inline-block;font-family:var(--font-display);font-weight:900;font-size:11px;letter-spacing:.18em;color:var(--cyan-deep,#00B4D8);margin-bottom:10px}
        .mn-v4 .case-phase h3{font-family:var(--font-serif-jp);font-size:17px;font-weight:700;color:#0A0A0A;margin-bottom:10px;line-height:1.45}
        .mn-v4 .case-phase p{font-size:14px;line-height:1.85;color:#4B5563;margin:0;max-width:none}
        .mn-v4 .case-related{margin-top:80px}
        .mn-v4 .case-related .title{margin:14px 0 38px}
        .mn-v4 .case-related .vcard{display:flex;flex-direction:column;text-decoration:none;color:inherit}
        .mn-v4 .case-related .vcard h4{margin-bottom:18px}
        .mn-v4 .case-related .vcard .vmetric{margin-top:auto;font-family:var(--font-display);font-weight:900;font-size:14px;letter-spacing:.04em;color:var(--cyan-deep,#00B4D8)}
      `}</style>

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
            <Link href="/">Home</Link> / <Link href="/works">Works</Link> / <span>{work.industry}</span>
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> {serviceCombo}
          </div>
          <h1 className="big-title-jp reveal">{work.title}</h1>
          <p className="subhero-lead reveal">{work.summary}</p>
        </div>
      </header>

      {/* ===== HERO IMAGE ===== */}
      <div className="wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="case-hero-img reveal">
          <img src={work.image} alt={work.title} />
        </div>
      </div>

      {/* ===== CASE BODY ===== */}
      <section className="sec white">
        <div className="wrap">
          {/* Quick Facts */}
          <div className="case-meta reveal">
            <div>
              <div className="l">Client</div>
              <div className="v">{work.client}</div>
            </div>
            <div>
              <div className="l">Industry</div>
              <div className="v">{work.industry}</div>
            </div>
            <div>
              <div className="l">Services</div>
              <div className="v">{serviceCombo}</div>
            </div>
            <div>
              <div className="l">Key Result</div>
              <div className="v">
                {work.metric[0].label}: {work.metric[0].value}
              </div>
            </div>
          </div>

          {/* 業界背景 */}
          <div className="case-block reveal">
            <div className="k">BACKGROUND</div>
            <div>
              <p>{work.background}</p>
            </div>
          </div>

          {/* 課題 */}
          <div className="case-block reveal">
            <div className="k">CHALLENGE</div>
            <div>
              <p>{work.challenge}</p>
              {work.challengeDetail && work.challengeDetail.length > 0 && (
                <ul className="case-list">
                  {work.challengeDetail.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              {work.quote && <div className="case-quote">{work.quote}</div>}
            </div>
          </div>

          {/* 立場 */}
          {work.role && (
            <div className="case-block reveal">
              <div className="k">ROLE</div>
              <div>
                <p>{work.role}</p>
              </div>
            </div>
          )}

          {/* 取組 */}
          <div className="case-block reveal">
            <div className="k">APPROACH</div>
            <div>
              <p>{work.approach}</p>
              {work.approachPhases && work.approachPhases.length > 0 && (
                <div className="case-phases">
                  {work.approachPhases.map((ph) => (
                    <div className="case-phase" key={ph.phase}>
                      <span className="case-phase-tag">{ph.phase}</span>
                      <h3>{ph.title}</h3>
                      <p>{ph.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 解決・成果 */}
          {(work.resolution || (work.outcomes && work.outcomes.length > 0)) && (
            <div className="case-block reveal">
              <div className="k">RESOLUTION</div>
              <div>
                {work.resolution && <p>{work.resolution}</p>}
                {work.outcomes && work.outcomes.length > 0 && (
                  <ul className="case-list">
                    {work.outcomes.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 提供価値 */}
          {work.deliverables && work.deliverables.length > 0 && (
            <div className="case-block reveal">
              <div className="k">DELIVERABLES</div>
              <div>
                <ul className="case-list">
                  {work.deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 学び */}
          {work.keyLearnings && work.keyLearnings.length > 0 && (
            <div className="case-block reveal">
              <div className="k">LEARNINGS</div>
              <div>
                <ul className="case-list">
                  {work.keyLearnings.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 応用可能性 */}
          {work.applicableTo && (
            <div className="case-block reveal">
              <div className="k">APPLICABLE TO</div>
              <div>
                <p>{work.applicableTo}</p>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="case-result reveal">
            <div className="eyebrow">
              <i className="pulse" /> The Result
            </div>
            <h3>
              Proven <em>growth.</em>
            </h3>
            <div className="rgrid">
              {work.metric.map((m) => (
                <div key={m.label}>
                  <div className="rn">{m.value}</div>
                  <div className="rl">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Related */}
          {relatedWorks.length > 0 && (
            <div className="case-related reveal">
              <div className="eyebrow dark">
                <i className="pulse" /> Related Cases
              </div>
              <h2 className="title">
                関連する<em>事例</em>。
              </h2>
              <div className="vgrid three">
                {relatedWorks.map((rw) => (
                  <Link key={rw.slug} href={`/works/${rw.slug}`} className="vcard">
                    <div className="vn">{rw.services.map((s) => serviceLabels[s]).join(" × ")}</div>
                    <h4>{rw.title}</h4>
                    <div className="vmetric">
                      {rw.metric[0].label}: {rw.metric[0].value}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
            <i className="pulse" /> Your story next
          </div>
          <h2 className="cta-h reveal">
            LET&apos;S BUILD
            <br />
            <em>growth.</em>
          </h2>
          <p className="reveal">
            同様の成果を、あなたの事業でも。事例についての詳細や、貴社での適用可能性について、まずはお気軽にご相談ください。
          </p>
          <div className="cta-row reveal">
            <Link href="/contact" className="btn btn-cyan btn-lg magnetic">
              <span>無料相談を申し込む</span>
              <i className="arr">↗</i>
            </Link>
            <Link href="/works" className="btn btn-ghost btn-lg magnetic">
              <span>他の実績を見る</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
