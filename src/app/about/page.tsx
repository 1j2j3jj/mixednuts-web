import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { Odometer, SplitWords } from "@/components/v6/KineticText";
import { buildPageOg } from "@/lib/site-metadata";
import V6PageMotion from "./V6PageMotion";
import "./v6-about.css";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const pageTitle = "会社情報 — 考え方と提供体制";
const pageDescription =
  "戦略・AI・マーケティングを一気通貫で提供するAI-firstファーム。代表の経験、AIエージェント組織、案件ごとの専門パートナーを組み合わせて事業成長を支援します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/about" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/about" }),
};

const aboutPageSchema = buildWebPageSchema({ type: "AboutPage", path: "/about", name: pageTitle, description: pageDescription, mainEntity: { "@id": "https://mixednuts-inc.com/#organization" } });

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
]);

const values = [
  ["01", "Mix, Don't Divide", "領域を分断しない。戦略・AI・マーケを断絶させず、3つが常に連動する設計で仕事を組み立てる。"],
  ["02", "On the Ground", "評論家にならない。現場の最前線に入り、実装・運用・改善までハンズオンで伴走する。"],
  ["03", "Data-Driven", "勘と経験だけで語らない。意思決定の全段階でデータを起点にし、AIで仮説検証を高速化する。"],
  ["04", "Calibrated Honesty", "ドラマ化しない。断定を急がず、仮説と事実を分離して、判断に必要な情報を率直に伝える。"],
  ["05", "AI-First, Human-Led", "AIに任せる領域と人間が握る領域を意図的に設計し、AIと共に働く組織をつくる。"],
] as const;

const companyFacts = [
  ["Founded", "2021"],
  ["Name / JP", "ミックスナッツ株式会社"],
  ["Name / EN", "mixednuts Inc."],
  ["Representative", "石井 希実 / Nozomi Ishii"],
  ["Services", "Strategy · AI · Marketing"],
] as const;

export default function AboutPage() {
  return (
    <div className="mn-v6 about-v6 v6-page-motion">
      <V6PageMotion />
      <JsonLd data={aboutPageSchema} />
      <JsonLd data={breadcrumb} />
      <BreadcrumbNav items={[{ name: "Home", path: "/" }, { name: "About" }]} />

      <main>
        <section className="title-card f-navy" data-nav="dark">
          <p className="overline"><i />About mixednuts Inc. · Tokyo</p>
          <h1 data-split aria-label="About 才能が「ミックス」する瞬間、事業は動き始める。">
            <SplitWords words={["About"]} /><br />
            <span className="jp-title">才能が「ミックス」する瞬間、<br />事業は動き始める。</span>
          </h1>
          <p className="page-lead">異なる専門性を、ひとつの事業成長へ。戦略・AI・マーケティングを断絶させず、構想から実装までを一つのチームで進めます。</p>
          <p className="page-index">01 / 06</p>
        </section>

        <section className="mission-field" data-nav="dark" data-wipe>
          <p className="kicker">Mission</p>
          <h2>「ミックス」で、<br />事業の未来に<br />必然性を。</h2>
          <div className="mission-copy" data-reveal>
            <p>戦略は現場に届かなければ動かない。AIは業務に溶け込まなければ力にならない。マーケティングは戦略と接続しなければ一過性で終わる。</p>
            <p>3つを有機的につなぎ、クライアントの事業に実装する。それが mixednuts のミッションです。</p>
          </div>
        </section>

        <section className="values-scene" data-nav="light">
          <header className="scene-head" data-reveal>
            <p className="kicker">Our Values</p>
            <h2>行動原則</h2>
            <p>多様な専門性が同じ方向を向くための、5つの判断基準。</p>
          </header>
          <div className="value-list">
            {values.map(([number, title, description]) => (
              <article className="value-row" key={number} data-reveal>
                <p className="value-number">{number}</p>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mix-scene" data-nav="light">
          <div className="mix-copy" data-reveal>
            <p className="kicker">Our People</p>
            <h2>多様な才能の<br />「ミックス」。</h2>
            <p>代表が経験してきた国内大手デジタル広告代理店、グローバル大手IT企業の広告事業、国内大手IT企業の経営企画・FP&amp;A。その知見に、100体超のAIエージェント組織を支える要素として組み込み、案件ごとに必要な専門パートナーの力を重ね、ひとつのチームで掛け合わせます。</p>
          </div>
          <Link href="/team/ceo" className="founder-block" data-wipe>
            <span className="mono" aria-hidden="true">N.I.</span>
            <span className="founder-meta">
              <small>Founder &amp; CEO</small>
              <strong>石井 希実</strong>
              <span>Profile →</span>
            </span>
          </Link>
        </section>

        <section className="facts-field" data-nav="dark" data-wipe>
          <header data-reveal>
            <p className="kicker">Company</p>
            <h2>Since <span data-odometer><Odometer value="2021" /></span> ·<br />Tokyo</h2>
          </header>
          <dl>
            {companyFacts.map(([label, value]) => (
              <div className="fact-row" key={label} data-reveal>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="closing-field" data-nav="dark" data-wipe>
          <p className="kicker">Next</p>
          <h2>違う強さを、<br />ひとつの推進力へ。</h2>
          <div data-reveal>
            <p>60分の無料相談で、事業の現在地と次の一手を一緒に整理します。</p>
            <Link className="btn" href="/contact">無料相談を申し込む</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
