import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import SiteMotionV6 from "@/components/v6/SiteMotionV6";
import { SHOW_MEMBER_ROSTER, divisionLabels, members } from "@/data/members";
import { buildPageOg } from "@/lib/site-metadata";
import "./v6-team.css";

const pageTitle = "Team — 多様な才能の「ミックス」";
const pageDescription =
  "代表の実務経験を核に、100体超のAIエージェント組織と案件ごとの専門パートナーを組み合わせるmixednutsのチーム設計。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/team" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/team" }),
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Team", path: "/team" },
]);

const workingModel = [
  {
    number: "01",
    label: "Leadership",
    title: "代表が、課題の中心に立つ。",
    body: "デジタル広告、グローバルIT企業の広告事業、事業会社の経営企画・FP&Aで培った実務知を起点に、戦略から実装まで一貫して設計します。",
  },
  {
    number: "02",
    label: "AI Agent Organisation",
    title: "100体超のAIエージェントを、支援要素に。",
    body: "調査、分析、制作、検証などを支えるAIエージェント組織を運用。AIを主役にするのではなく、人間の判断と実行の密度を高めるために組み込みます。",
  },
  {
    number: "03",
    label: "Specialist Partners",
    title: "案件ごとに、必要な専門性を編成する。",
    body: "課題の性質に応じて専門パートナーと協働。固定的な人数や組織図ではなく、成果に必要な専門性をひとつのチームとして掛け合わせます。",
  },
];

export default function TeamPage() {
  const ceo = members.find((member) => member.division === "leadership")!;
  const roster = members.filter((member) => member.division !== "leadership");

  return (
    <div className="mn-v6 v6-team">
      <JsonLd data={breadcrumb} />
      <SiteMotionV6 />

      <main>
        <section className="v6-scene v6-hero" data-v6-scene="team-hero" aria-labelledby="team-title">
          <div className="v6-scene-inner v6-hero-inner">
            <p className="v6-kicker v6-hero-overline">Team · Human-Led, AI-Supported</p>
            <div className="v6-hero-title-wrap">
              <h1 id="team-title" className="v6-jp-heading v6-hero-title v6-team-title">
                <span className="v6-hero-word">多様な才能を、</span><br />
                <span className="v6-hero-word">ひとつの<span className="v6-accent">成果</span>へ。</span>
              </h1>
              <p className="v6-en-display v6-hero-register">A flexible team,<br />built around the work.</p>
            </div>
            <div className="v6-hero-bottom">
              <p className="v6-hero-lead">代表の実務知を核に、AIエージェント組織と案件ごとの専門パートナーを組み合わせます。</p>
              <div className="v6-button-row v6-hero-actions">
                <Link href="/team/ceo" className="v6-button v6-button--paper">CEO Profile</Link>
                <Link href="/careers" className="v6-button v6-button--outline">Careers</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-team-leader" data-v6-scene="leadership" aria-labelledby="team-leadership">
          <div className="v6-scene-inner">
            <header className="v6-team-section-head">
              <p className="v6-kicker v6-kicker--paper">Leadership · 001</p>
              <h2 id="team-leadership" className="v6-jp-heading">判断と実装を、<br />同じ距離で。</h2>
            </header>
            <article className="v6-team-leader-grid v6-insight">
              <Link href="/team/ceo" className="v6-team-monogram" aria-label="石井 希実のプロフィールを見る">
                <span className="v6-en-display">N<span>.</span>I<span>.</span></span>
                <small>Founder / CEO</small>
              </Link>
              <div className="v6-team-leader-copy">
                <p className="v6-kicker v6-kicker--paper">{ceo.role}</p>
                <h3 className="v6-jp-heading">石井 希実</h3>
                <p className="v6-team-roman">Nozomi Ishii</p>
                <p>{ceo.bio}</p>
                <dl>
                  <div><dt>Background</dt><dd>{ceo.background}</dd></div>
                  <div><dt>Base</dt><dd>Tokyo, Japan</dd></div>
                </dl>
                <Link href="/team/ceo" className="v6-team-text-link">Read full profile <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-team-model" data-v6-scene="working-model" aria-labelledby="team-model">
          <div className="v6-scene-inner">
            <header className="v6-team-section-head v6-team-section-head--model">
              <p className="v6-kicker v6-kicker--paper">How We Work · A Flexible Model</p>
              <h2 id="team-model" className="v6-jp-heading">固定された組織図ではなく、<br />課題に合わせて編成する。</h2>
              <p>人間が判断し、AIが処理能力を拡張し、必要な専門性が加わる。規模を誇張せず、案件ごとに成果へ最短のチームを設計します。</p>
            </header>
            <div className="v6-team-model-list">
              {workingModel.map((item) => (
                <article key={item.number} className="v6-team-model-row v6-index-row">
                  <span className="v6-en-display">{item.number}</span>
                  <p className="v6-kicker v6-kicker--paper">{item.label}</p>
                  <h3 className="v6-jp-heading">{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {SHOW_MEMBER_ROSTER && (
          <section className="v6-scene v6-paper-scene v6-team-roster" aria-labelledby="team-roster">
            <div className="v6-scene-inner">
              <header className="v6-team-section-head">
                <p className="v6-kicker v6-kicker--paper">Member Roster</p>
                <h2 id="team-roster" className="v6-jp-heading">専門性の<br />ミックス。</h2>
              </header>
              <div className="v6-team-roster-grid">
                {roster.map((member) => (
                  <article key={member.initial}>
                    <span className="v6-en-display">{member.initial}</span>
                    <p>{divisionLabels[member.division]}</p>
                    <h3>{member.role}</h3>
                    <p>{member.background}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="v6-scene v6-end v6-team-end" data-v6-scene="end" aria-labelledby="team-end">
          <div className="v6-scene-inner v6-end-inner">
            <p className="v6-kicker">End Credits · Work With Us</p>
            <div>
              <h2 id="team-end" className="v6-en-display v6-end-title">MIX THE<br /><span className="v6-accent">RIGHT.</span></h2>
              <p className="v6-end-copy">採用・協業についてはCareersへ。<br />事業相談はContactからお寄せください。</p>
              <Link href="/careers" className="v6-button v6-button--paper">Explore Careers</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
