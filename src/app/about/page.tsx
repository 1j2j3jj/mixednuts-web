import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import SiteMotionV6 from "@/components/v6/SiteMotionV6";
import { buildPageOg } from "@/lib/site-metadata";
import "./v6-about.css";

const pageTitle = "About — 才能が「ミックス」する瞬間、事業は動き始める";
const pageDescription =
  "戦略・AI・マーケティングを一気通貫で提供するAI-firstファーム。代表の実務経験、AIエージェント組織、案件ごとの専門パートナーを組み合わせて事業成長を支援します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/about" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/about" }),
};

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://mixednuts-inc.com/about#webpage",
  url: "https://mixednuts-inc.com/about",
  name: pageTitle,
  description: pageDescription,
  inLanguage: "ja-JP",
  isPartOf: { "@id": "https://mixednuts-inc.com/#website" },
  mainEntity: { "@id": "https://mixednuts-inc.com/#organization" },
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
]);

const values = [
  ["01", "Mix, Don’t Divide", "領域を分断しない。戦略・AI・マーケを断絶させず、3つが常に連動する設計で仕事を組み立てる。"],
  ["02", "On the Ground", "評論家にならない。現場の最前線に飛び込み、実装・運用・改善までハンズオンで伴走する。"],
  ["03", "Data-Driven", "勘と経験で語らない。意思決定の全段階でデータを起点にし、AIで仮説検証を高速化する。"],
  ["04", "Calibrated Honesty", "ドラマ化しない。異常値を見たらまず実害を計算し、断定せず、仮説と事実を分離して報告する。"],
  ["05", "AI-First, Human-Led", "AIに任せる領域と人間が握る領域を意図的に設計する。AI導入で終わらせず、AIと共に働く組織をつくる。"],
];

const facts = [
  ["01", "Name", "ミックスナッツ株式会社", "mixednuts Inc."],
  ["02", "Founded", "2021年4月19日", "Tokyo, Japan"],
  ["03", "Representative", "石井 希実", "Founder & CEO"],
  ["04", "Services", "戦略コンサルティング / AI実装支援", "マーケティング成長支援"],
  ["05", "Address", "東京都港区南青山3-8-40", "〒107-0062"],
  ["06", "Contact", "hello@mixednuts-inc.com", "Business inquiries"],
  ["07", "Advisors", "弁護士法人クレア法律事務所", "関野会計事務所"],
  ["08", "Banks", "三井住友銀行", "三菱UFJ銀行"],
];

export default function AboutPage() {
  return (
    <div className="mn-v6 v6-about">
      <JsonLd data={aboutPageSchema} />
      <JsonLd data={breadcrumb} />
      <SiteMotionV6 />

      <main>
        <section className="v6-scene v6-hero" data-v6-scene="about-hero" aria-labelledby="about-title">
          <div className="v6-scene-inner v6-hero-inner">
            <p className="v6-kicker v6-hero-overline">About mixednuts Inc. · Since 2021</p>
            <div className="v6-hero-title-wrap">
              <h1 id="about-title" className="v6-jp-heading v6-hero-title v6-about-title">
                <span className="v6-hero-word">才能が<span className="v6-accent">“ミックス”</span>する瞬間、</span><br />
                <span className="v6-hero-word">事業は動き始める。</span>
              </h1>
              <p className="v6-en-display v6-hero-register">Different disciplines.<br />One growth system.</p>
            </div>
            <div className="v6-hero-bottom">
              <p className="v6-hero-lead">
                代表が培った広告・経営企画／FP&amp;Aの実務経験に、<br className="v6-desktop-break" />
                100体超のAIエージェント組織と案件ごとの専門パートナーを掛け合わせます。
              </p>
              <div className="v6-button-row v6-hero-actions">
                <Link href="/team" className="v6-button v6-button--paper">Meet the Team</Link>
                <Link href="/contact" className="v6-button v6-button--outline">Let&apos;s Talk</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-thesis v6-about-thesis" data-v6-scene="mission" aria-labelledby="about-mission">
          <div className="v6-scene-inner v6-thesis-inner">
            <h2 id="about-mission" className="v6-kicker">Mission · Why Mixed</h2>
            <div className="v6-thesis-lines v6-jp-heading">
              <p className="v6-thesis-line">戦略は、現場に届いてこそ。</p>
              <p className="v6-thesis-line">AIは、業務に溶け込んでこそ。</p>
              <p className="v6-thesis-line">マーケは、戦略と繋がってこそ。</p>
            </div>
            <div className="v6-thesis-answer v6-about-answer">
              <p className="v6-jp-heading"><span className="v6-accent">“ミックス”</span>で、<br />事業の未来に必然性を。</p>
              <p>3つを断絶させず、有機的に繋ぐ仕組みをクライアントの事業に実装する。それが私たちのミッションです。</p>
              <p>たまたまではなく、意図して成功させる。日本の事業成長に“再現性”を持ち込みます。</p>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-about-values" data-v6-scene="values" aria-labelledby="about-values">
          <div className="v6-scene-inner">
            <header className="v6-about-section-head">
              <p className="v6-kicker v6-kicker--paper">Our Values · Five Principles</p>
              <h2 id="about-values" className="v6-jp-heading">私たちの<br />行動原則。</h2>
              <p>多様な才能が同じ方向を向くための5つの指針。日々の判断と振る舞いの中に埋め込んでいます。</p>
            </header>
            <div className="v6-about-value-list">
              {values.map(([number, title, description]) => (
                <article key={number} className="v6-about-value v6-proof-item">
                  <div className="v6-proof-shutter" aria-hidden="true" />
                  <span className="v6-en-display">{number}</span>
                  <h3 className="v6-en-display">{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-about-people" data-v6-scene="people" aria-labelledby="about-people">
          <div className="v6-scene-inner">
            <header className="v6-about-section-head v6-about-section-head--wide">
              <p className="v6-kicker v6-kicker--paper">Our People · One Team</p>
              <h2 id="about-people" className="v6-jp-heading">多様な才能の<br /><span className="v6-accent">“ミックス”。</span></h2>
              <p>代表が経験してきたデジタル広告代理店、グローバルIT企業の広告事業、国内大手IT企業の経営企画・FP&amp;A。その実務知に、100体超のAIエージェント組織を支援要素として組み込み、案件ごとに必要な専門パートナーと、ひとつのチームで掛け合わせます。</p>
            </header>

            <article className="v6-about-ceo v6-insight">
              <Link href="/team/ceo" className="v6-about-monogram" aria-label="石井 希実のプロフィールを見る">
                <span className="v6-en-display">N<span>.</span>I<span>.</span></span>
                <small>Portrait / 001</small>
              </Link>
              <div className="v6-about-ceo-copy">
                <p className="v6-kicker v6-kicker--paper">Founder &amp; CEO</p>
                <h3 className="v6-jp-heading">石井 希実 <span>Nozomi Ishii</span></h3>
                <p>国内大手デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとしてPL責任を担う。グローバル大手IT企業では広告事業のアカウントストラテジストとして大手企業約50社のデジタル戦略を支援。国内大手IT企業の経営企画を経て、2021年にmixednutsを創業。早稲田大学大学院 経営管理研究科 修了（MBA）。</p>
                <Link href="/team/ceo" className="v6-about-text-link">Read full profile <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          </div>
        </section>

        <section className="v6-scene v6-about-facts" data-v6-scene="facts" aria-labelledby="about-facts">
          <div className="v6-scene-inner v6-about-facts-inner">
            <header>
              <p className="v6-kicker">Company Information</p>
              <h2 id="about-facts" className="v6-en-display">Since 2021<br /><span>· Tokyo</span></h2>
            </header>
            <div className="v6-about-fact-list">
              {facts.map(([number, label, value, note]) => (
                <div key={number} className="v6-about-fact v6-index-row">
                  <span className="v6-index-no">{number}</span>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-end" data-v6-scene="end" aria-labelledby="about-end">
          <div className="v6-scene-inner v6-end-inner">
            <p className="v6-kicker">End Credits · Next Chapter</p>
            <div>
              <h2 id="about-end" className="v6-en-display v6-end-title">WRITE THE<br /><span className="v6-accent">NEXT.</span></h2>
              <p className="v6-end-copy">一緒に、事業の次の章を書き始めませんか。<br />60分で課題を伺い、最適なアプローチを提案します。</p>
              <Link href="/contact" className="v6-button v6-button--paper">Start a Conversation</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
