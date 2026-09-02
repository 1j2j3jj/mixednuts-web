import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { Odometer, SplitWords } from "@/components/v6/KineticText";
import { works, type Work, CASES_COMING_SOON } from "@/data/works";
import { buildPageOg, compactTitle } from "@/lib/site-metadata";
import WorksMotionV6 from "../WorksMotionV6";
import "../v6-works.css";
import BreadcrumbNav from "@/components/BreadcrumbNav";

type Props = { params: Promise<{ slug: string }> };

function workDescription(work: Work): string {
  const source = `${work.summary} ${work.role}として、${work.services.map((service) => serviceLabels[service]).join("・")}領域を支援した匿名ケースです。`;
  return source.length <= 120 ? source : `${source.slice(0, 119).trim()}。`;
}

export async function generateStaticParams() {
  if (CASES_COMING_SOON) return [];
  return works.filter((work) => !work.hidden).map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((entry) => entry.slug === slug);
  if (!work || work.hidden || CASES_COMING_SOON) return {};
  const title = compactTitle(`事例: ${work.title}`);
  const description = workDescription(work);
  return {
    title,
    description,
    alternates: { canonical: `/works/${slug}` },
    ...buildPageOg({
      title,
      description,
      path: `/works/${slug}`,
    }),
  };
}

const serviceLabels: Record<Work["services"][number], string> = {
  ai: "AI",
  strategy: "STRATEGY",
  marketing: "MARKETING",
};

function EditorialSection({
  number,
  label,
  title,
  tone = "stone",
  children,
}: {
  number: string;
  label: string;
  title: string;
  tone?: "stone" | "paper";
  children: React.ReactNode;
}) {
  return (
    <section className={`case-editorial-section case-${tone}`} data-nav="light">
      <div className="case-section-meta" data-reveal>
        <span>{number}</span>
        <p>{label}</p>
      </div>
      <div className="case-section-body" data-reveal>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  if (CASES_COMING_SOON) notFound();
  const work = works.find((entry) => entry.slug === slug);
  if (!work || work.hidden) notFound();

  const pageName = compactTitle(`事例: ${work.title}`);
  const description = workDescription(work);
  const webPageSchema = buildWebPageSchema({ path: `/works/${work.slug}`, name: pageName, description, about: { "@id": "https://mixednuts-inc.com/#organization" } });

  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Works", path: "/works" },
    { name: work.title, path: `/works/${work.slug}` },
  ]);

  let sectionNumber = 1;
  const nextNumber = () => String(sectionNumber++).padStart(2, "0");

  return (
    <div className="mn-v6 works-v6 work-detail-v6" data-v6-motion>
      <WorksMotionV6 />
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumb} />
      <BreadcrumbNav items={[{ name: "Home", path: "/" }, { name: "Works", path: "/works" }, { name: work.title }]} />

      <main>
        <section className="works-title-card case-title-card" data-nav="dark">
          <p className="works-overline" data-title-reveal><i />Case file · {work.industry}</p>
          <div className="case-service-line" data-title-reveal>
            {work.services.map((service) => <span key={service}>{serviceLabels[service]}</span>)}
          </div>
          <h1 data-split aria-label={work.title}><SplitWords words={work.title.split(" ")} /></h1>
          <p className="case-summary" data-title-reveal>{work.summary}</p>
          <div className="case-metrics-strip" data-odometer data-title-reveal>
            {work.metric.map((metric) => (
              <div className="case-hero-metric" key={metric.label}>
                <p>{metric.label}</p>
                <strong><Odometer value={metric.value} /></strong>
              </div>
            ))}
          </div>
        </section>

        <section className="case-facts-row" data-nav="light">
          <div><span>Client</span><strong>{work.client}</strong></div>
          <div><span>Industry</span><strong>{work.industry}</strong></div>
          <div><span>Role</span><strong>{work.role}</strong></div>
        </section>

        <EditorialSection number={nextNumber()} label="Background" title="背景">
          <p>{work.background}</p>
        </EditorialSection>

        <EditorialSection number={nextNumber()} label="Challenge" title="課題" tone="paper">
          <p>{work.challenge}</p>
          {work.challengeDetail.length > 0 && (
            <ul className="case-hairline-list">
              {work.challengeDetail.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {work.quote && <blockquote>{work.quote}</blockquote>}
        </EditorialSection>

        <EditorialSection number={nextNumber()} label="Approach" title="アプローチ">
          <p>{work.approach}</p>
          {work.approachPhases.length > 0 && (
            <ol className="case-phase-list">
              {work.approachPhases.map((phase, index) => (
                <li data-row-reveal key={`${phase.phase}-${phase.title}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{phase.phase}</p>
                    <h3>{phase.title}</h3>
                    <p>{phase.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </EditorialSection>

        {(work.resolution || work.outcomes.length > 0) && (
          <EditorialSection number={nextNumber()} label="Outcomes" title="成果" tone="paper">
            {work.resolution && <p>{work.resolution}</p>}
            {work.outcomes.length > 0 && (
              <ul className="case-outcome-list">
                {work.outcomes.map((outcome, index) => (
                  <li data-reveal key={outcome}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{outcome}</p>
                  </li>
                ))}
              </ul>
            )}
          </EditorialSection>
        )}

        {work.keyLearnings.length > 0 && (
          <EditorialSection number={nextNumber()} label="Key learnings" title="得られた学び">
            <ul className="case-hairline-list">
              {work.keyLearnings.map((learning) => <li key={learning}>{learning}</li>)}
            </ul>
          </EditorialSection>
        )}

        {work.applicableTo && (
          <EditorialSection number={nextNumber()} label="Applicable to" title="類似ケースへの応用" tone="paper">
            <p>{work.applicableTo}</p>
          </EditorialSection>
        )}

        {work.deliverables.length > 0 && (
          <EditorialSection number={nextNumber()} label="Deliverables" title="提供物">
            <ul className="case-deliverables">
              {work.deliverables.map((deliverable, index) => (
                <li data-row-reveal key={deliverable}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{deliverable}</p>
                </li>
              ))}
            </ul>
          </EditorialSection>
        )}

        <section className="works-closing-field case-closing-field" data-nav="dark" data-wipe>
          <p className="works-kicker">Discuss your case</p>
          <h2>同じ型を、<br />あなたの事業へ。</h2>
          <div data-reveal>
            <p>守秘義務の範囲内で、類似案件の進め方と適用可能性をご説明します。</p>
            <div className="case-cta-actions">
              <Link className="works-button" href="/contact">無料相談を申し込む</Link>
              <Link className="works-text-link" href="/works">Works index</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
