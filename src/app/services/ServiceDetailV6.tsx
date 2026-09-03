import { Phrases } from "@/components/v6/KineticText";
import type { ReactNode } from "react";
import Link from "next/link";
import { Odometer, SplitWords } from "@/components/v6/KineticText";
import ServicesMotion from "./ServicesMotion";

export type EditorialRow = {
  num: string;
  title: string;
  desc: string;
  meta?: string;
  items?: string[];
};

type DetailProps = {
  act: string;
  theme: "navy" | "enji" | "black";
  word: string;
  eyebrow: string;
  headline: ReactNode;
  lead: string;
  metric?: { value: string; label: string; note: string };
  offerings: EditorialRow[];
  offeringsTitle: ReactNode;
  offeringsLead: string;
  secondary?: { label: string; title: ReactNode; lead: string; rows: EditorialRow[] };
  process?: EditorialRow[];
  faq?: { q: string; a: string }[];
  cases?: Array<{
    slug: string;
    industry: string;
    problem: string;
    move: string;
    services: ("ai" | "strategy" | "marketing")[];
  }>;
  ctaTitle: ReactNode;
  ctaBody: string;
};

export default function ServiceDetailV6({
  act,
  theme,
  word,
  eyebrow,
  headline,
  lead,
  metric,
  offerings,
  offeringsTitle,
  offeringsLead,
  secondary,
  process,
  faq,
  cases,
  ctaTitle,
  ctaBody,
}: DetailProps) {
  return (
    <div className={`mn-v6 services-v6 service-detail-v6 theme-${theme}`}>
      <ServicesMotion />
      <main>
        <section className="service-hero" data-nav="dark">
          <div className="service-title-card">
            <nav className="service-crumb" aria-label="パンくずリスト" data-hero-copy><ol style={{ display: "contents" }}><li style={{ display: "contents" }}><Link href="/">Home</Link></li><li style={{ display: "contents" }}> / <Link href="/services">Services</Link></li><li style={{ display: "contents" }}> / {word}</li></ol></nav>
            <p className="act-label" data-hero-copy>{act} · {eyebrow}</p>
            <h1 data-service-title data-split aria-label={word}><SplitWords words={[word]} /></h1>
            <h2 data-hero-copy><span className="balanced-lines">{headline}</span></h2>
            <p className="service-lead" data-hero-copy>{lead}</p>
          </div>
          <div className="act-canvas" aria-hidden="true">
            <span className="canvas-word vs">{word}</span>
            <i className="canvas-cut cut-a" />
            <i className="canvas-cut cut-b" />
            <i className="canvas-cut cut-c" />
            <b>{act}</b>
          </div>
        </section>

        <section className="detail-intro" data-nav="light">
          <div data-reveal>
            <p className="section-kicker">The mandate</p>
            <h2><span className="balanced-lines">{headline}</span></h2>
          </div>
          <p data-reveal>{lead}</p>
          {metric ? (
            <div className="detail-metric" data-metric data-reveal>
              <b><Odometer value={metric.value} /></b>
              <span>{metric.label}</span>
              <small>{metric.note}</small>
            </div>
          ) : null}
        </section>

        <section className="editorial-section" data-nav="light">
          <header className="editorial-head" data-reveal>
            <p className="section-kicker">What we offer</p>
            <h2><span className="balanced-lines">{offeringsTitle}</span></h2>
            <p>{offeringsLead}</p>
          </header>
          <div className="editorial-rows" data-wipe>
            {offerings.map((row) => <EditorialItem key={row.num} row={row} />)}
          </div>
        </section>

        {secondary ? (
          <section className="editorial-section secondary-section" data-nav="light">
            <header className="editorial-head" data-reveal>
              <p className="section-kicker">{secondary.label}</p>
              <h2><span className="balanced-lines">{secondary.title}</span></h2>
              <p>{secondary.lead}</p>
            </header>
            <div className="editorial-rows compact-rows" data-wipe>
              {secondary.rows.map((row) => <EditorialItem key={row.num} row={row} />)}
            </div>
          </section>
        ) : null}

        {process ? (
          <section className="editorial-section process-section" data-nav="light">
            <header className="editorial-head" data-reveal>
              <p className="section-kicker">Our process</p>
              <h2>実装の進め方。</h2>
              <p>PoC から本番稼働、継続改善までを、段階ごとに確実に進めます。</p>
            </header>
            <div className="process-rows" data-wipe>
              {process.map((row) => <EditorialItem key={row.num} row={row} />)}
            </div>
          </section>
        ) : null}

        {cases && cases.length > 0 ? (
          <section className="editorial-section cases-section" data-nav="light">
            <header className="editorial-head" data-reveal>
              <p className="section-kicker">Case studies</p>
              <h2>支援の実績。</h2>
              <p>クライアント名ではなく、課題とアプローチの組み合わせで掲載しています。</p>
            </header>
            <div className="case-rows" data-wipe>
              {cases.map((item, index) => (
                <Link className="case-row" href={`/works/${item.slug}`} key={item.slug}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><small>{item.industry}</small><h3><Phrases text={item.problem} /></h3></div>
                  <div><p>{item.move}</p><small>{item.services.map((service) => service.toUpperCase()).join(" · ")}</small></div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {faq ? (
          <section className="editorial-section faq-section" data-nav="light">
            <header className="editorial-head" data-reveal>
              <p className="section-kicker">FAQ</p>
              <h2>よくある質問。</h2>
            </header>
            <div className="faq-rows" data-wipe>
              {faq.map((item, index) => (
                <article className="faq-row" key={item.q}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="detail-cta" data-nav="light">
          <p className="section-kicker">Next move</p>
          <h2><span className="balanced-lines">{ctaTitle}</span></h2>
          <div><p>{ctaBody}</p><Link className="detail-link" href="/contact">無料相談を申し込む</Link></div>
        </section>
      </main>
    </div>
  );
}

function EditorialItem({ row }: { row: EditorialRow }) {
  return (
    <article className="editorial-row" data-reveal>
      <span className="row-num">{row.num}</span>
      <div>
        {row.meta ? <p className="row-meta">{row.meta}</p> : null}
        <h3>{row.title}</h3>
      </div>
      <div>
        <p>{row.desc}</p>
        {row.items ? <ul>{row.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      </div>
    </article>
  );
}
