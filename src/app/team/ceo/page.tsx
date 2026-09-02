import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { SplitWords } from "@/components/v6/KineticText";
import { members } from "@/data/members";
import { buildPageOg } from "@/lib/site-metadata";
import V6PageMotion from "../../about/V6PageMotion";
import "./v6-ceo.css";

const pageTitle = "CEO Profile — 石井 希実 (Nozomi Ishii)";
const pageDescription =
  "国内大手デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。グローバル大手IT企業では広告事業のアカウントストラテジストとして、大手企業約50社のデジタル戦略を支援。国内大手IT企業の経営企画では、ライブ配信・エンターテインメント事業の事業計画策定、FP&A、投資評価、取締役会付議資料を担当。2021年に mixednuts を創業し、戦略・AI・マーケティングの統合提供を牽引。早稲田大学大学院 経営管理研究科 修了（MBA）。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/team/ceo" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/team/ceo" }),
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://mixednuts-inc.com/team/ceo#person",
  name: "石井 希実 (Nozomi Ishii)",
  jobTitle: "Founder & CEO",
  worksFor: { "@id": "https://mixednuts-inc.com/#organization" },
  description: pageDescription,
  alumniOf: [{ "@type": "CollegeOrUniversity", name: "早稲田大学大学院 経営管理研究科" }],
  knowsAbout: [
    "FP&A",
    "Investment Evaluation",
    "AI Agent Design",
    "LLM Implementation",
    "Growth Marketing",
    "SEO / AIO",
    "Corporate Finance",
    "Business Planning",
  ],
  url: "https://mixednuts-inc.com/team/ceo",
};

const profilePageSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://mixednuts-inc.com/team/ceo#webpage",
  url: "https://mixednuts-inc.com/team/ceo",
  inLanguage: "ja-JP",
  isPartOf: { "@id": "https://mixednuts-inc.com/#website" },
  mainEntity: { "@id": "https://mixednuts-inc.com/team/ceo#person" },
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Team", path: "/team" },
  { name: "CEO Profile", path: "/team/ceo" },
]);

const career = [
  {
    year: "01",
    company: "国内大手デジタル広告代理店",
    role: "Account Planning / Team Management",
    description: "金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。",
  },
  {
    year: "02",
    company: "グローバル大手IT企業",
    role: "Account Strategist · Advertising",
    description: "広告事業のアカウントストラテジストとして、大手企業約50社のデジタル戦略を支援。",
  },
  {
    year: "03",
    company: "国内大手IT企業",
    role: "Corporate Planning / FP&A",
    description: "ライブ配信・エンターテインメント事業の事業計画策定、FP&A、投資評価、取締役会付議資料を担当。",
  },
  {
    year: "2021",
    company: "mixednuts Inc.",
    role: "Founder & CEO",
    description: "mixednuts を創業し、戦略・AI・マーケティングの統合提供を牽引。",
  },
  {
    year: "2026",
    company: "早稲田大学大学院",
    role: "MBA",
    description: "経営管理研究科 修了（MBA）。",
  },
] as const;

const expertise = [
  "Corporate Planning",
  "FP&A",
  "Investment Evaluation",
  "Board Materials",
  "Digital Advertising",
  "Growth Marketing",
  "AI Agent Design",
  "Business Planning",
] as const;

export default function CeoPage() {
  const ceo = members.find((member) => member.division === "leadership")!;

  return (
    <div className="mn-v6 ceo-v6 v6-page-motion">
      <V6PageMotion />
      <JsonLd data={personSchema} />
      <JsonLd data={profilePageSchema} />
      <JsonLd data={breadcrumb} />

      <main>
        <section className="title-card f-black" data-nav="dark">
          <p className="overline"><i />Founder &amp; CEO · Profile</p>
          <h1 data-split><SplitWords words={["Nozomi"]} /><br /><SplitWords words={["Ishii"]} /><br /><span>石井 希実</span></h1>
          <p className="page-lead">{ceo.background}<br />2021年 mixednuts 創業 · 2026年 早稲田大学大学院 経営管理研究科 修了（MBA）</p>
          <p className="page-index">01 / 04</p>
        </section>

        <section className="intro-scene" data-nav="light">
          <aside data-wipe>
            <p className="mono" aria-hidden="true">N.I.</p>
            <dl>
              <div><dt>Role</dt><dd>Founder &amp; CEO</dd></div>
              <div><dt>Company</dt><dd>mixednuts Inc.</dd></div>
              <div><dt>Base</dt><dd>Tokyo, Japan</dd></div>
              <div><dt>Education</dt><dd>Waseda MBA · 2026</dd></div>
            </dl>
          </aside>
          <div className="intro-copy" data-reveal>
            <p className="kicker">Overview</p>
            <h2>戦略・AI・<br />マーケティングを、<br />実装までつなぐ。</h2>
            <p>国内大手デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。</p>
            <p>グローバル大手IT企業では広告事業のアカウントストラテジストとして、大手企業約50社のデジタル戦略を支援。</p>
            <p>国内大手IT企業の経営企画では、ライブ配信・エンターテインメント事業の事業計画策定、FP&amp;A、投資評価、取締役会付議資料を担当。</p>
            <p>2021年に mixednuts を創業し、戦略・AI・マーケティングの統合提供を牽引。早稲田大学大学院 経営管理研究科 修了（MBA）。</p>
          </div>
        </section>

        <section className="career-scene" data-nav="light">
          <header data-reveal><p className="kicker">Career</p><h2>Experience</h2></header>
          <div className="career-list">
            {career.map((item) => (
              <article key={`${item.year}-${item.company}`} data-reveal>
                <p className="year">{item.year}</p>
                <div><p className="company">{item.company}</p><h3>{item.role}</h3></div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="expertise-scene" data-nav="dark" data-wipe>
          <header data-reveal><p className="kicker">Expertise</p><h2>Fields of<br />work</h2></header>
          <ul>
            {expertise.map((skill) => <li key={skill} data-reveal>{skill}</li>)}
          </ul>
        </section>

        <section className="ceo-closing" data-nav="dark" data-wipe>
          <p className="kicker">Contact</p>
          <h2>事業の次の一手を、<br />直接話しましょう。</h2>
          <div data-reveal><p>初回相談は無料です。60分で課題とアプローチを一緒に整理します。</p><Link className="btn" href="/contact">無料相談を申し込む</Link></div>
        </section>
      </main>
    </div>
  );
}
