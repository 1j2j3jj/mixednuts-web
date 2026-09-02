import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import { CASES_COMING_SOON, works, type Work } from "@/data/works";
import WorksMotionV6 from "../WorksMotionV6";
import "../v6-works.css";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  if (CASES_COMING_SOON) return [];
  return works.filter((work) => !work.hidden).map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((entry) => entry.slug === slug);
  if (!work || work.hidden || CASES_COMING_SOON) return {};
  const title = `Case: ${work.title}`;
  return {
    title,
    description: work.summary,
    alternates: { canonical: `/works/${slug}` },
    ...buildPageOg({
      title,
      description: work.summary,
      path: `/works/${slug}`,
      images: work.image ? [{ url: work.image }] : undefined,
    }),
  };
}

const serviceLabels: Record<Work["services"][number], string> = {
  strategy: "STRATEGY",
  ai: "AI",
  marketing: "MARKETING",
};

export default async function WorkDetailPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const isDevelopmentPreview = process.env.NODE_ENV === "development" && query["v6-preview"] === "1";

  if (CASES_COMING_SOON && !isDevelopmentPreview) notFound();
  const work = works.find((entry) => entry.slug === slug);
  if (!work || work.hidden) notFound();

  const [titleLead, titleTail = ""] = work.title.split(" — ");
  const titleLeadParts = titleLead.split(" ");
  const titleLeadFirst = titleLeadParts.shift() ?? titleLead;
  const titleLeadRest = titleLeadParts.join(" ");
  const titleTailParts = titleTail.split("の");
  const titleTailFirst = titleTailParts.length > 1 ? `${titleTailParts.shift()}の` : titleTail;
  const titleTailRest = titleTailParts.join("の");

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
    <div className="mn-v6 works-v6 works-v6-detail">
      <JsonLd data={creativeWorkSchema} />
      <JsonLd data={breadcrumb} />
      <WorksMotionV6 />

      <main>
        <section className="v6-scene v6-hero works-v6-case-hero" data-v6-scene="hero" aria-labelledby="works-v6-case-title">
          <div className="v6-scene-inner v6-hero-inner">
            <h2 className="v6-kicker v6-hero-overline">Case File · {work.industry}</h2>
            <div className="v6-hero-title-wrap works-v6-case-title-wrap">
              <p className="works-v6-case-services">{work.services.map((service) => serviceLabels[service]).join(" · ")}</p>
              <h1 id="works-v6-case-title" className="v6-jp-heading v6-hero-title works-v6-case-title">
                <span className="v6-hero-word">{titleLeadFirst}</span>
                {titleLeadRest ? <><br className="works-v6-case-break-mobile" /><span className="v6-hero-word">{titleLeadRest}</span></> : null}
                {titleTail ? <>
                  <br />
                  <span className="v6-hero-word">— {titleTailFirst}</span>
                  {titleTailRest ? <><br className="works-v6-case-break-mobile" /><span className="v6-hero-word">{titleTailRest}</span></> : null}
                </> : null}
              </h1>
            </div>
            <div className="v6-hero-bottom works-v6-case-bottom">
              <p className="v6-hero-lead">{work.summary}</p>
              <p className="works-v6-case-client"><span>Client</span>{work.client}</p>
            </div>
          </div>
        </section>

        <section className="v6-paper-scene works-v6-case-metrics" aria-label="プロジェクト成果指標">
          <div className="v6-scene-inner works-v6-case-metrics-inner">
            {work.metric.map((metric, index) => (
              <div className="works-v6-case-metric" key={metric.label}>
                <span>{String(index + 1).padStart(2, "0")} · {metric.label}</span>
                <strong className="v6-en-display">{metric.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="v6-paper-scene works-v6-case-body">
          <div className="v6-scene-inner works-v6-case-body-inner">
            <div className="works-v6-case-folio" aria-label="ケース概要">
              <span>Industry<b>{work.industry}</b></span>
              <span>Services<b>{work.services.map((service) => serviceLabels[service]).join(" × ")}</b></span>
              <span>Role<b>{work.role}</b></span>
            </div>

            <article className="works-v6-case-section">
              <p className="v6-kicker v6-kicker--paper">01 · Background</p>
              <h2 className="v6-jp-heading">業界背景</h2>
              <p>{work.background}</p>
            </article>

            <article className="works-v6-case-section works-v6-case-section--challenge">
              <p className="v6-kicker v6-kicker--paper">02 · Challenge</p>
              <h2 className="v6-jp-heading">どういう課題が<br />あったか</h2>
              <p>{work.challenge}</p>
              <ol className="works-v6-case-list">
                {work.challengeDetail.map((item, index) => (
                  <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>
                ))}
              </ol>
              {work.quote ? <blockquote>{work.quote}</blockquote> : null}
            </article>

            <article className="works-v6-case-section">
              <p className="v6-kicker v6-kicker--paper">03 · Approach</p>
              <h2 className="v6-jp-heading">どう取り組んだか</h2>
              <p>{work.approach}</p>
              <div className="works-v6-phase-list">
                {work.approachPhases.map((phase, index) => (
                  <section className="works-v6-phase" key={`${phase.phase}-${phase.title}`}>
                    <span className="v6-en-display">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p>{phase.phase}</p>
                      <h3 className="v6-jp-heading">{phase.title}</h3>
                      <p>{phase.description}</p>
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <article className="works-v6-case-section works-v6-case-section--outcomes">
              <p className="v6-kicker v6-kicker--paper">04 · Outcomes</p>
              <h2 className="v6-jp-heading">どう解決したか</h2>
              <p>{work.resolution}</p>
              <ol className="works-v6-case-list">
                {work.outcomes.map((item, index) => (
                  <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>
                ))}
              </ol>
            </article>

            <div className="works-v6-case-closing">
              <article>
                <p className="v6-kicker v6-kicker--paper">05 · Key Learnings</p>
                <h2 className="v6-jp-heading">得られた学び</h2>
                <ul>{work.keyLearnings.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <p className="v6-kicker v6-kicker--paper">06 · Applicable To</p>
                <h2 className="v6-jp-heading">類似ケースへの応用</h2>
                <p>{work.applicableTo}</p>
              </article>
              <article>
                <p className="v6-kicker v6-kicker--paper">07 · Deliverables</p>
                <h2 className="v6-jp-heading">提供価値</h2>
                <ul>{work.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-end works-v6-end" data-v6-scene="end" aria-labelledby="works-v6-detail-end-heading">
          <div className="v6-scene-inner v6-end-inner">
            <h2 className="v6-kicker">End Credits · Your Next Case</h2>
            <div>
              <p id="works-v6-detail-end-heading" className="v6-jp-heading works-v6-end-title">
                同様の成果を、<br /><span className="v6-accent">あなたの<br className="works-v6-end-break-mobile" />事業でも。</span>
              </p>
              <p className="v6-end-copy">事例の詳細や、貴社での適用可能性について、まずはお気軽にご相談ください。</p>
              <Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
