import type { Metadata } from "next";
import Link from "next/link";
import V6PageMotion from "@/components/V6PageMotion";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { SplitWords } from "@/components/v6/KineticText";
import { positions, CASUAL_INTERVIEW_SLUG } from "@/data/careers";
import { buildPageOg } from "@/lib/site-metadata";
import "./v6-careers.css";

const faqItems = [
  ["副業・在籍中の業務委託は可能ですか?", "はい。所属企業の規定を守り、機密性と利害関係に配慮した形で参画方法を設計します。"],
  ["リモートは可能ですか?", "業務内容と契約形態に応じて、リモートを含む働き方を相談できます。"],
  ["未経験でも応募可能ですか?", "ポジションによります。隣接領域での実務経験や、学習・実装の証跡も含めて総合的に拝見します。"],
  ["どんな人が活躍していますか?", "自律的に動き、AIを日常的に使い、数字と事実を大切にしながら複数領域を越境できる人です。"],
  ["記載以外のポジションも応募できますか?", "可能です。カジュアル面談から、専門性に合う役割を一緒に考えます。"],
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Careers", path: "/careers" },
]);

const pageTitle = "Careers — AI と共に働くプロフェッショナル募集";
const pageDescription = "戦略・AI・マーケのプロフェッショナルを募集。専門性と働き方に合わせて、多様な参画方法を設計します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/careers" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/careers" }),
};

const principles = [
  ["01", "Use AI as default", "AIを特別な道具ではなく、思考と実行の標準装備として使う。"],
  ["02", "Cross the border", "専門性を軸にしながら、戦略・実装・成長の境界を越える。"],
  ["03", "Own the outcome", "担当範囲ではなく、クライアントの成果に対して仕事を設計する。"],
];

export default function CareersPage() {
  return (
    <main className="careers-v6" data-v6-page>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumb} />
      <V6PageMotion />

      <section className="careers-v6__hero" data-nav="dark">
        <div className="careers-v6__crumb v6-hero-detail"><Link href="/">Home</Link><span>/</span>Careers</div>
        <p className="careers-v6__eyebrow v6-hero-detail">Build the operating system</p>
        <h1 className="careers-v6__title v6-slam"><SplitWords words={["Work", "beyond", "labels."]} /></h1>
        <p className="careers-v6__lead v6-hero-detail">専門性を持ち寄り、AIと共に、事業が動くところまでつくる。役職名よりも、越境する意志を歓迎します。</p>
      </section>

      <section className="careers-v6__principles" data-nav="light">
        <header className="careers-v6__section-head v6-reveal"><p>How we work</p><h2>仕事の境界を、<br />固定しない。</h2></header>
        <div className="careers-v6__principle-list">
          {principles.map(([number, title, body]) => (
            <article className="careers-v6__principle v6-reveal" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="careers-v6__positions" id="open" data-nav="light">
        <header className="careers-v6__section-head v6-reveal"><p>Open positions</p><h2>募集中の<br />ポジション</h2></header>
        <div className="careers-v6__position-list">
          {positions.map((position, index) => (
            <Link className="careers-v6__position v6-reveal" href={`/careers/apply?position=${position.slug}`} key={position.slug}>
              <span className="careers-v6__position-number">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{position.title}</h3><p>{position.tags.join(" / ")}</p></div>
              <p className="careers-v6__position-type">{position.type}</p><span className="careers-v6__arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="careers-v6__process" id="process" data-nav="dark">
        <header className="careers-v6__section-head v6-reveal"><p>Hiring process</p><h2>対話から、<br />始めます。</h2></header>
        <div className="careers-v6__process-list">
          {["カジュアル面談", "書類・実績確認", "実務に近い対話", "最終面談・条件確認"].map((title, index) => (
            <div className="careers-v6__process-row v6-reveal" key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3></div>
          ))}
        </div>
      </section>

      <section className="careers-v6__faq" data-nav="light">
        <header className="careers-v6__section-head v6-reveal"><p>FAQ</p><h2>応募前の<br />よくある質問</h2></header>
        <div>{faqItems.map(([q, a]) => <details className="careers-v6__faq-row v6-reveal" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="careers-v6__cta" data-nav="dark">
        <p>Start with a conversation.</p><h2>まずは、話しましょう。</h2>
        <Link href={`/careers/apply?position=${CASUAL_INTERVIEW_SLUG}`}>カジュアル面談を申し込む <span>→</span></Link>
      </section>
    </main>
  );
}
