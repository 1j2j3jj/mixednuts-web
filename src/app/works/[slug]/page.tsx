import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { MetricValue, Odometer, Phrases, SplitPhrases } from "@/components/v6/KineticText";
import { works, workThemes, type Work, CASES_COMING_SOON } from "@/data/works";
import { buildPageOg } from "@/lib/site-metadata";
import WorksMotionV6 from "../WorksMotionV6";
import "../v6-works.css";
import BreadcrumbNav from "@/components/BreadcrumbNav";

type Props = { params: Promise<{ slug: string }> };

const serviceLabels: Record<Work["services"][number], string> = {
  ai: "AI",
  strategy: "STRATEGY",
  marketing: "MARKETING",
};

function metadataTitle(work: Work): string {
  const suffix = " | mixednuts Inc.";
  const source = `事例: ${work.problem}（${work.title}）`;
  const maxSourceLength = 60 - suffix.length;
  const compact = source.length <= maxSourceLength ? source : `${source.slice(0, maxSourceLength - 1).trim()}…`;
  return `${compact}${suffix}`;
}

function workDescription(work: Work): string {
  const source = [
    work.move,
    work.outcomes[0],
    "課題へのアプローチと、実行後に得られた変化を実務の流れとともに匿名で紹介します",
  ].filter(Boolean).join("。 ");
  return source.length <= 120 ? source : `${source.slice(0, 119).trim()}…`;
}

function SplitCharacters({ text }: { text: string }) {
  return Array.from(text).map((character, index) => (
    <span className="c" aria-hidden="true" key={`${character}-${index}`}>{character}</span>
  ));
}

export async function generateStaticParams() {
  if (CASES_COMING_SOON) return [];
  return works.filter((work) => !work.hidden).map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((entry) => entry.slug === slug);
  if (!work || work.hidden || CASES_COMING_SOON) return {};
  const title = metadataTitle(work);
  const description = workDescription(work);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/works/${slug}` },
    ...buildPageOg({ title, description, path: `/works/${slug}` }),
  };
}

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
      <div className="case-section-meta" data-reveal><span>{number}</span><p>{label}</p></div>
      <div className="case-section-body" data-reveal><h2>{title}</h2>{children}</div>
    </section>
  );
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug } = await params;
  if (CASES_COMING_SOON) notFound();
  const work = works.find((entry) => entry.slug === slug);
  if (!work || work.hidden) notFound();

  const theme = workThemes.find((entry) => entry.id === work.theme);
  if (!theme) notFound();
  const title = metadataTitle(work);
  const description = workDescription(work);
  const related = works
    .filter((entry) => !entry.hidden && entry.slug !== work.slug && entry.theme === work.theme)
    .slice(0, 3);
  const webPageSchema = buildWebPageSchema({
    path: `/works/${work.slug}`,
    name: title,
    description,
    about: { "@id": "https://mixednuts-inc.com/#organization" },
  });
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Works", path: "/works" },
    { name: theme.label, path: `/works#theme-${theme.id}` },
    { name: work.title, path: `/works/${work.slug}` },
  ]);

  let sectionNumber = 1;
  const nextNumber = () => String(sectionNumber++).padStart(2, "0");

  return (
    <div className="mn-v6 works-v6 work-detail-v6" data-v6-motion>
      <WorksMotionV6 />
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumb} />
      <BreadcrumbNav items={[
        { name: "Home", path: "/" },
        { name: "Works", path: "/works" },
        { name: theme.label, path: `/works#theme-${theme.id}` },
        { name: work.title },
      ]} />

      <main>
        <section className="works-title-card case-title-card" data-nav="dark">
          <p className="works-overline" data-title-reveal><i />{theme.label}</p>
          <h1 data-split aria-label={work.problem}><SplitPhrases text={work.problem} /></h1>
          <p className="case-project-title" data-title-reveal>{work.title}</p>
          <p className="case-summary" data-title-reveal>{work.move}</p>
          <p className="case-engagement-line" data-title-reveal><span>業種・関与</span>{work.client} · {work.industry} · {work.services.map((service) => serviceLabels[service]).join(" · ")}</p>
          {work.metric.length > 0 && (
            <div className="case-metrics-strip" data-odometer data-title-reveal>
              {work.metric.slice(0, 3).map((metric) => (
                <div className="case-hero-metric" key={metric.label}><p>{metric.label}</p><strong><MetricValue value={metric.value} /></strong></div>
              ))}
            </div>
          )}
        </section>

        <EditorialSection number={nextNumber()} label="Problem" title="課題">
          <p>{work.background}</p>
          {work.challenge && <p>{work.challenge}</p>}
          {work.challengeDetail.length > 0 && <ul className="case-hairline-list">{work.challengeDetail.map((item) => <li key={item}>{item}</li>)}</ul>}
          {work.quote && <blockquote>{work.quote}</blockquote>}
        </EditorialSection>

        <EditorialSection number={nextNumber()} label="Approach" title="アプローチ" tone="paper">
          <p>{work.approach}</p>
          {work.approachPhases.length > 0 && (
            <ol className="case-phase-list">
              {work.approachPhases.map((phase, index) => (
                <li data-row-reveal key={`${phase.phase}-${phase.title}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><p>{phase.phase}</p><h3>{phase.title}</h3><p>{phase.description}</p></div>
                </li>
              ))}
            </ol>
          )}
        </EditorialSection>

        {(work.resolution || work.outcomes.length > 0) && (
          <EditorialSection number={nextNumber()} label="Outcomes" title="成果">
            {work.resolution && <p>{work.resolution}</p>}
            {work.outcomes.length > 0 && <ul className="case-outcome-list">{work.outcomes.map((outcome, index) => <li data-reveal key={outcome}><span>{String(index + 1).padStart(2, "0")}</span><p>{outcome}</p></li>)}</ul>}
          </EditorialSection>
        )}

        {work.keyLearnings.length > 0 && (
          <EditorialSection number={nextNumber()} label="Learnings" title="学び" tone="paper">
            <ul className="case-hairline-list">{work.keyLearnings.map((learning) => <li key={learning}>{learning}</li>)}</ul>
          </EditorialSection>
        )}

        {work.applicableTo && <EditorialSection number={nextNumber()} label="Applicable to" title="応用できる領域"><p>{work.applicableTo}</p></EditorialSection>}

        <EditorialSection number={nextNumber()} label="Role & deliverables" title="役割・成果物" tone="paper">
          <p>{work.role}</p>
          {work.deliverables.length > 0 && <ul className="case-deliverables">{work.deliverables.map((deliverable, index) => <li data-row-reveal key={deliverable}><span>{String(index + 1).padStart(2, "0")}</span><p>{deliverable}</p></li>)}</ul>}
        </EditorialSection>

        {related.length > 0 && (
          <section className="case-related-section" data-nav="light" aria-labelledby="related-cases-heading">
            <header data-reveal><p className="works-kicker">Same problem theme</p><h2 id="related-cases-heading">同じ課題の他ケース</h2></header>
            <div className="case-related-list">
              {related.map((item, index) => (
                <Link href={`/works/${item.slug}`} className="case-related-row" data-row-reveal key={item.slug}>
                  <span>{String(index + 1).padStart(2, "0")}</span><h3><Phrases text={item.problem} /></h3><p>{item.move}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="works-closing-field case-closing-field" data-nav="dark" data-wipe>
          <p className="works-kicker">Discuss your case</p><h2>同じ型を、<br />あなたの事業へ。</h2>
          <div data-reveal><p>守秘義務の範囲内で、類似案件の進め方と適用可能性をご説明します。</p><div className="case-cta-actions"><Link className="works-button" href="/contact">無料相談を申し込む</Link><Link className="works-text-link" href="/works">Works index</Link></div></div>
        </section>
      </main>
    </div>
  );
}
