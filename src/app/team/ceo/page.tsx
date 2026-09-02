import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import SiteMotionV6 from "@/components/v6/SiteMotionV6";
import { members } from "@/data/members";
import { buildPageOg } from "@/lib/site-metadata";
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
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "早稲田大学大学院 経営管理研究科" },
  ],
  knowsAbout: [
    "FP&A",
    "Investment Evaluation",
    "AI Agent Design",
    "LLM Implementation",
    "Growth Marketing",
    "SEO / AIO",
    "Corporate Planning",
    "Business Strategy",
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
    period: "2012—2015",
    company: "国内大手デジタル広告代理店",
    title: "Account Planner / Team Manager",
    description: "金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとしてPL責任を担う。",
  },
  {
    period: "2015—2018",
    company: "グローバル大手IT企業",
    title: "Account Strategist, Advertising",
    description: "広告事業のアカウントストラテジストとして、大手企業約50社のデジタル戦略を支援。",
  },
  {
    period: "2018—2021",
    company: "国内大手IT企業",
    title: "Corporate Planning / FP&A",
    description: "ライブ配信・エンターテインメント事業の事業計画策定、FP&A、投資評価、取締役会付議資料を担当。",
  },
  {
    period: "2021—NOW",
    company: "mixednuts Inc.",
    title: "Founder & CEO",
    description: "mixednutsを創業し、戦略・AI・マーケティングの統合提供を牽引。",
  },
  {
    period: "2026",
    company: "早稲田大学大学院",
    title: "Master of Business Administration",
    description: "経営管理研究科 修了（MBA）。",
  },
];

const expertise = [
  "Corporate Planning",
  "FP&A",
  "Investment Evaluation",
  "Board Materials",
  "Business Strategy",
  "AI Agent Design",
  "LLM Implementation",
  "Growth Marketing",
  "SEO / AIO",
];

export default function CeoPage() {
  const ceo = members.find((member) => member.division === "leadership")!;

  return (
    <div className="mn-v6 v6-ceo">
      <JsonLd data={personSchema} />
      <JsonLd data={profilePageSchema} />
      <JsonLd data={breadcrumb} />
      <SiteMotionV6 />

      <main>
        <section className="v6-scene v6-hero" data-v6-scene="ceo-hero" aria-labelledby="ceo-title">
          <div className="v6-scene-inner v6-hero-inner">
            <p className="v6-kicker v6-hero-overline">Founder &amp; CEO · Profile 001</p>
            <div className="v6-hero-title-wrap">
              <h1 id="ceo-title" className="v6-jp-heading v6-hero-title v6-ceo-title">
                <span className="v6-hero-word">石井 希実</span>
              </h1>
              <p className="v6-en-display v6-hero-register">Nozomi Ishii<br />mixednuts Inc.</p>
            </div>
            <div className="v6-hero-bottom">
              <p className="v6-hero-lead">デジタル広告から経営企画・FP&amp;Aへ。<br />2021年、mixednutsを創業。</p>
              <div className="v6-button-row v6-hero-actions">
                <Link href="/contact" className="v6-button v6-button--paper">Talk to Nozomi</Link>
                <Link href="/team" className="v6-button v6-button--outline">Back to Team</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-ceo-profile" data-v6-scene="profile" aria-labelledby="ceo-overview">
          <div className="v6-scene-inner v6-ceo-profile-grid">
            <aside className="v6-ceo-aside">
              <div className="v6-ceo-monogram">
                <span className="v6-en-display">N<span>.</span>I<span>.</span></span>
                <small>Tokyo / Japan</small>
              </div>
              <dl>
                <div><dt>Role</dt><dd>Founder &amp; CEO<br />mixednuts Inc.</dd></div>
                <div><dt>Background</dt><dd>{ceo.background}</dd></div>
                <div><dt>Education</dt><dd>早稲田大学大学院<br />経営管理研究科 修了（MBA, 2026）</dd></div>
              </dl>
            </aside>

            <div className="v6-ceo-main">
              <header>
                <p className="v6-kicker v6-kicker--paper">Overview · Biography</p>
                <h2 id="ceo-overview" className="v6-jp-heading">異なる現場をつなぎ、<br />成長を実装する。</h2>
              </header>
              <p className="v6-ceo-intro">{ceo.bio}</p>

              <blockquote className="v6-ceo-quote v6-insight">
                <p className="v6-jp-heading">戦略だけでは遅い。AIだけでは浅い。マーケだけでは一過性。3つが<span className="v6-accent">“ミックス”</span>して初めて、事業は再現性のある成長曲線を描きはじめる。</p>
              </blockquote>

              <section className="v6-ceo-career" aria-labelledby="ceo-career">
                <header>
                  <p className="v6-kicker v6-kicker--paper">Career · Chronology</p>
                  <h2 id="ceo-career" className="v6-en-display">Career</h2>
                </header>
                <div className="v6-ceo-career-list">
                  {career.map((item) => (
                    <article key={item.period} className="v6-ceo-career-row v6-index-row">
                      <time>{item.period}</time>
                      <div>
                        <p>{item.company}</p>
                        <h3>{item.title}</h3>
                      </div>
                      <p>{item.description}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="v6-ceo-expertise" aria-labelledby="ceo-expertise">
                <header>
                  <p className="v6-kicker v6-kicker--paper">Expertise · Selected</p>
                  <h2 id="ceo-expertise" className="v6-en-display">Expertise</h2>
                </header>
                <div>
                  {expertise.map((item, index) => (
                    <span key={item}><small>{String(index + 1).padStart(2, "0")}</small>{item}</span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-end v6-ceo-end" data-v6-scene="end" aria-labelledby="ceo-end">
          <div className="v6-scene-inner v6-end-inner">
            <p className="v6-kicker">End Credits · Direct Conversation</p>
            <div>
              <h2 id="ceo-end" className="v6-en-display v6-end-title">LET&apos;S<br /><span className="v6-accent">TALK.</span></h2>
              <p className="v6-end-copy">石井 希実と直接、話しましょう。<br />初回60分で課題と次の一手を整理します。</p>
              <Link href="/contact" className="v6-button v6-button--paper">Book a Session</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
