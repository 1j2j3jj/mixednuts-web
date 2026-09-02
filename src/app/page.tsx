import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "#site/content";
import { CASES_COMING_SOON, works } from "@/data/works";
import SiteMotionV6 from "@/components/v6/SiteMotionV6";

export const metadata: Metadata = {
  title: "mixednuts — 戦略 × AI × マーケティング",
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
  alternates: { canonical: "/" },
};

const acts = [
  {
    numeral: "I",
    label: "ACT I · STRATEGY",
    titleLead: "戦略",
    titleTail: "コンサルティング",
    body: "事業戦略、新規事業、M&A、経営管理まで。\"分厚い報告書\"ではなく、明日からの行動に変換するロードマップ。AIで仮説検証を加速し、意思決定を数日で回します。",
    href: "/services/strategy",
    link: "Explore Strategy",
    act: 1,
  },
  {
    numeral: "II",
    label: "ACT II · AI",
    titleLead: "AI 実装支援",
    titleTail: "",
    body: "エージェント設計、LLM業務実装、プロンプトエンジニアリング。私たち自身が100体超のAIと働くAI-first組織。その知見を貴社の業務に実装します。",
    href: "/services/ai",
    link: "Explore AI",
    act: 2,
  },
  {
    numeral: "III",
    label: "ACT III · MARKETING",
    titleLead: "マーケティング",
    titleTail: "成長支援",
    body: "広告運用、CVR改善、SEO/AIO、SNS。評論家ではなく、現場の最前線で実行。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ再現性のある成長。",
    href: "/services/marketing",
    link: "Explore Marketing",
    act: 3,
  },
];

const proof = [
  ["100+", "社内 AI エージェント稼働中"],
  ["30+", "累計支援クライアント"],
  ["40+", "業務プロセス自動化"],
  ["-70%", "業務時間削減の実例"],
];

const engagementRows = works.filter((work) => !work.hidden).slice(0, 6);
const latestPosts = [...posts]
  .filter((post) => !post.hidden)
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .slice(0, 3);

export default function HomePage() {
  return (
    <div className="mn-v6">
      <SiteMotionV6 />

      <main>
        <section className="v6-scene v6-hero" data-v6-scene="hero" aria-labelledby="v6-hero-title">
          <div className="v6-scene-inner v6-hero-inner">
            <h2 className="v6-kicker v6-hero-overline">
              <span className="v6-hero-overline-desktop">AI-First Consulting · Est. 2021</span>
              <span className="v6-hero-overline-mobile">AI-First · Est. 2021</span>
            </h2>
            <div className="v6-hero-title-wrap">
              <h1 id="v6-hero-title" className="v6-en-display v6-hero-title">
                <span className="v6-hero-line">
                  <span className="v6-hero-word">RETHINK</span><br className="v6-mobile-break" />{" "}
                  <span className="v6-hero-word">GROWTH.</span>
                </span><br />
                <span className="v6-hero-word v6-accent">WITH AI.</span>
              </h1>
              <p className="v6-en-display v6-hero-register">Strategy, AI, and Marketing —<br />executed as one.</p>
            </div>
            <div className="v6-hero-bottom">
              <p className="v6-hero-lead">
                戦略・AI・マーケティングを 3 軸で、上場企業から新規事業まで一気通貫で支援します。<br className="v6-desktop-break" />
                分厚い報告書ではなく、明日から動けるアクションを届けます。
              </p>
              <div className="v6-button-row v6-hero-actions">
                <Link href="/contact" className="v6-button v6-button--paper">Let&apos;s Talk</Link>
                <Link href="/works" className="v6-button v6-button--outline">See Works</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-thesis" data-v6-scene="thesis" aria-labelledby="v6-thesis-heading">
          <div className="v6-scene-inner v6-thesis-inner">
            <h2 id="v6-thesis-heading" className="v6-kicker">Why Mixed</h2>
            <div className="v6-thesis-lines v6-jp-heading">
              <p className="v6-thesis-line" data-v6-contrast="display">戦略だけでは遅い。</p>
              <p className="v6-thesis-line" data-v6-contrast="display">AIだけでは浅い。</p>
              <p className="v6-thesis-line" data-v6-contrast="display">マーケだけでは一過性。</p>
            </div>
            <p className="v6-thesis-answer v6-jp-heading" data-v6-contrast="display">
              3つが<span className="v6-accent">&quot;ミックス&quot;</span>して初めて、<br />
              事業は再現性のある<br className="v6-mobile-break" />成長曲線を描きはじめる。
            </p>
          </div>
        </section>

        <section className="v6-scene v6-acts" data-v6-scene="acts" aria-labelledby="v6-acts-heading">
          <div className="v6-scene-inner v6-acts-inner">
            <h2 id="v6-acts-heading" className="v6-kicker v6-acts-kicker">Three Forces · One Growth Engine</h2>
            <div className="v6-act-stage">
              {acts.map((act) => (
                <article className="v6-act" data-v6-act={act.act} key={act.label}>
                  <div className="v6-act-numeral v6-en-display" aria-hidden="true">{act.numeral}</div>
                  <div className="v6-act-copy">
                    <p className="v6-kicker">{act.label}</p>
                    <h3 className="v6-jp-heading" data-v6-contrast="display">
                      {act.titleLead}
                      {act.titleTail ? <><br className="v6-mobile-break" />{act.titleTail}</> : null}
                    </h3>
                    <p data-v6-contrast="body">{act.body}</p>
                    <Link href={act.href}>{act.link} <span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-proof" data-v6-scene="proof" aria-labelledby="v6-proof-heading">
          <div className="v6-scene-inner v6-proof-inner">
            <header className="v6-section-head">
              <p className="v6-kicker v6-kicker--paper">By the Numbers</p>
              <h2 id="v6-proof-heading" className="v6-en-display">Capability,<br />without theatre.</h2>
              <p>AI-first 組織の、数字で見るケイパビリティ。</p>
            </header>
            <div className="v6-proof-grid">
              {proof.map(([value, label]) => (
                <article className="v6-proof-item" key={label}>
                  <div className="v6-proof-shutter" aria-hidden="true" />
                  <strong className="v6-en-display">{value}</strong>
                  <p>{label}</p>
                </article>
              ))}
            </div>

            <div className="v6-index">
              <div className="v6-index-head">
                <h3 className="v6-en-display">Engagement Index</h3>
                <p>{CASES_COMING_SOON ? "Selected engagements · details coming soon" : "Selected engagements"}</p>
              </div>
              <div className="v6-index-table" role="table" aria-label="Engagement index">
                {engagementRows.map((work, index) => (
                  <div className="v6-index-row" role="row" key={work.slug}>
                    <span role="cell" className="v6-index-no">{String(index + 1).padStart(2, "0")}</span>
                    <span role="cell" className="v6-index-client">
                      <span className="v6-sr-only">{work.client}</span>
                      <i className="v6-redaction" aria-hidden="true" />
                    </span>
                    <span role="cell">{work.industry}</span>
                    <span role="cell">{work.services.map((service) => service.toUpperCase()).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene v6-signal" data-v6-scene="signal" aria-labelledby="v6-signal-heading">
          <div className="v6-scene-inner v6-signal-inner">
            <header className="v6-section-head v6-signal-head">
              <p className="v6-kicker v6-kicker--paper">Insights</p>
              <h2 id="v6-signal-heading" className="v6-en-display">Ideas in<br /><em>practice.</em></h2>
            </header>
            <div className="v6-insight-list">
              {latestPosts.map((post, index) => (
                <Link href={post.permalink} className="v6-insight" key={post.slug}>
                  <span className="v6-insight-no">0{index + 1}</span>
                  <div>
                    <p>{post.category} · {post.date.slice(0, 10).replace(/-/g, ".")}</p>
                    <h3 className="v6-jp-heading">{post.title}</h3>
                    <span>{post.excerpt}</span>
                  </div>
                  <b aria-hidden="true">↗</b>
                </Link>
              ))}
            </div>
            <Link href="/insights" className="v6-text-link">View all insights ↗</Link>
          </div>
        </section>

        <section className="v6-scene v6-end" data-v6-scene="end" aria-labelledby="v6-end-heading">
          <div className="v6-scene-inner v6-end-inner">
            <h2 className="v6-kicker">Let&apos;s Talk</h2>
            <div>
              <p id="v6-end-heading" className="v6-en-display v6-end-title" data-v6-contrast="display">LET&apos;S BUILD<br /><span className="v6-accent">GROWTH.</span></p>
              <p className="v6-end-copy" data-v6-contrast="body">60分の無料相談で、貴社の事業に適したアプローチを共に設計しませんか。</p>
              <Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
