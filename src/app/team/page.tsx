import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { Odometer, SplitWords } from "@/components/v6/KineticText";
import { members, SHOW_MEMBER_ROSTER, divisionLabels } from "@/data/members";
import { buildPageOg } from "@/lib/site-metadata";
import V6PageMotion from "../about/V6PageMotion";
import "./v6-team.css";
import BreadcrumbNav from "@/components/BreadcrumbNav";

const pageTitle = "チーム — 代表・AI・専門パートナーの編成";
const pageDescription =
  "代表が課題整理と意思決定に関わり、100体超のAIエージェント組織を調査・分析・運用の裏付けとして活用し、案件ごとの専門パートナーと必要な支援体制を編成します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/team" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/team" }),
};

const teamPageSchema = buildWebPageSchema({
  type: "CollectionPage",
  path: "/team",
  name: pageTitle,
  description: pageDescription,
  mainEntityList: {
    "@type": "ItemList",
    // structured data lists only verified people; the placeholder roster (initials) stays out of the graph
    itemListElement: members.filter((member) => member.division === "leadership").map((member, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: member.division === "leadership" ? "https://mixednuts-inc.com/team/ceo" : "https://mixednuts-inc.com/team",
      name: member.division === "leadership" ? "石井 希実" : member.initial,
    })),
  },
});

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Team", path: "/team" },
]);

const leadership = members.find((member) => member.division === "leadership");
const roster = members.filter((member) => member.division !== "leadership");

const waysOfWorking = [
  ["01", "Representative", "代表が課題の整理と意思決定に関わり、戦略・AI・マーケティングを一つの文脈でつなぎます。"],
  ["02", "100+ AI Agents", "100体超のAIエージェント組織を、調査・分析・運用を支える要素として活用しています。"],
  ["03", "Specialist Partners", "案件の論点に応じて専門パートナーと協働し、必要な知見と実行力を組み合わせます。"],
] as const;

export default function TeamPage() {
  return (
    <div className="mn-v6 team-v6 v6-page-motion">
      <V6PageMotion />
      <JsonLd data={teamPageSchema} />
      <JsonLd data={breadcrumb} />
      <BreadcrumbNav items={[{ name: "Home", path: "/" }, { name: "Team" }]} />

      <main>
        <section className="title-card f-enji" data-nav="dark">
          <p className="overline"><i />Team · mixednuts Inc.</p>
          <h1 data-split aria-label="Team 違う強さを、同じ方向へ。"><SplitWords words={["Team"]} /><br /><span aria-hidden="true">違う強さを、同じ方向へ。</span></h1>
          <p className="page-lead">固定された肩書きの一覧ではなく、課題に必要な力を編成する。代表を起点に、AIエージェント組織と案件ごとの専門パートナーが事業推進を支えます。</p>
          <p className="page-index">01 / 03</p>
        </section>

        {leadership && (
          <section className="leader-scene" data-nav="light">
            <p className="mono" aria-hidden="true">N.I.</p>
            <div className="leader-copy" data-reveal>
              <p className="kicker">Leadership</p>
              <p className="role">{leadership.role} · mixednuts Inc.</p>
              <h2>石井 希実</h2>
              <p className="background">{leadership.background}</p>
              <p>{leadership.bio}</p>
              <Link href="/team/ceo" className="text-link">Full profile →</Link>
            </div>
          </section>
        )}

        <section className="work-scene" data-nav="light">
          <header data-reveal>
            <p className="kicker">How we work</p>
            <h2>人とAIを、<br />課題に合わせて<br />編成する。</h2>
            <p>「私たち」という言葉を、固定人数の組織図として扱いません。代表が中心となり、AIと外部の専門性を適切に組み合わせます。</p>
          </header>
          <div className="work-rows">
            {waysOfWorking.map(([number, title, description]) => (
              <article key={number} data-reveal>
                <p className="number">{number}</p>
                <h3>{title === "100+ AI Agents" ? <><span data-odometer><Odometer value="100+" /></span> AI Agents</> : title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        {SHOW_MEMBER_ROSTER && roster.length > 0 && (
          <section className="roster-scene" data-nav="dark" data-wipe>
            <header><p className="kicker">Roster</p><h2>Specialists</h2></header>
            <div className="roster-grid">
              {roster.map((member) => (
                <article key={member.initial}>
                  <p className="initial">{member.initial}</p>
                  <p className="division">{divisionLabels[member.division]}</p>
                  <h3>{member.role}</h3>
                  <p>{member.background}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="team-closing" data-nav="dark" data-wipe>
          <p className="kicker">Work with us</p>
          <h2>必要な専門性を、<br />ひとつの推進力へ。</h2>
          <div data-reveal>
            <p>事業課題に合わせたチームの組み方から、一緒に設計します。</p>
            <Link className="btn" href="/contact">相談する</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
