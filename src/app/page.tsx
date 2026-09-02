import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "#site/content";
import { works } from "@/data/works";
import SiteMotionV6 from "@/components/v6/SiteMotionV6";
import { Odometer, RingItem, SplitWords } from "@/components/v6/KineticText";

export const metadata: Metadata = {
  title: "mixednuts — 戦略 × AI × マーケティング",
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
  alternates: { canonical: "/" },
};

const forces = [
  {
    className: "c-navy", side: "l", word: "Strategy", title: "戦略・経営管理", href: "/services/strategy", link: "Explore strategy",
    body: "事業戦略、新規事業、経営管理（FP&A）まで。AI で仮説検証と予実分析を日次化し、意思決定を数日で回します。",
    items: ["事業計画・中期計画の策定", "FP&A・予実管理の AI 化（月次締めを D+1 に）", "取締役会・投資判断のための資料と分析"],
  },
  {
    className: "c-enji", side: "r", word: "AI", title: "AI 実装・エージェント組織", href: "/services/ai", link: "Explore AI",
    body: "AI エージェント組織の設計と実装。私たち自身が 100 体超のエージェントで事業を運営し、その型を貴社の業務に移植します。",
    items: ["エージェント設計・委任ルール・運用", "LLM 業務実装とプロンプト設計", "計測・自己修復・コスト管理の仕組み"],
  },
  {
    className: "c-black", side: "l", word: "Marketing", title: "マーケティング成長支援", href: "/services/marketing", link: "Explore marketing",
    body: "広告運用、CVR 改善、SEO/AIO。AI クリエイティブと自動入札を組み込み、専用ダッシュボードで日次に見える化します。",
    items: ["広告運用（Google / Yahoo / Meta / Microsoft）", "SEO・AI Overviews 対策（構造化データ）", "専用ダッシュボード（広告 × 売上、日次更新）"],
  },
];

const stats = [
  ["100+", "社内 AI エージェント", "24 時間稼働の AI-first 組織"],
  ["6", "稼働中の専用ダッシュボード", "広告 × 売上を日次で自動更新"],
  ["D+1", "月次締めのリードタイム", "2 週間 → 翌日（FP&A × AI）"],
  ["2×", "広告 ROAS", "Google Ads × AI 運用の実装例"],
] as const;

const engagementRows = works.filter((work) => !work.hidden);
const latestPosts = [...posts].filter((post) => !post.hidden).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
const ringWords = ["Strategy", "×", "AI", "×", "Marketing", "·", "Strategy", "×", "AI", "×", "Marketing", "·"];

export default function HomePage() {
  return (
    <div className="mn-v6">
      <SiteMotionV6 />
      <div className="intro" aria-hidden="true"><div className="panel p1" /><div className="panel p2" /><div className="word"><div>{Array.from("MIXED").map((letter) => <span key={letter}>{letter}</span>)}<small>nuts inc. · since 2021</small></div></div></div>
      <div className="tag">Direction K · MAX</div>
      <div className="flash" aria-hidden="true" />

      <main className="skew">
        <section className="hero" id="hero" data-nav="light">
          <div className="wallwrap" aria-hidden="true"><div className="wall"><span>GROWTH</span><span>GROWTH</span></div></div>
          <div className="ring" aria-hidden="true">{ringWords.map((word, index) => <RingItem index={index} key={`${word}-${index}`}>{word}</RingItem>)}</div>
          <div className="hero-main">
            <p className="overline"><i />AI-first growth partner · Tokyo · since 2021</p>
            <h1 data-split><SplitWords words={["Rethink", "growth."]} /><br /><SplitWords words={["With", "AI."]} accent="AI." /></h1>
            <div className="hero-foot">
              <div>
                <p className="lead"><span className="en">Strategy · AI · Marketing — executed as one</span>戦略・AI・マーケティングを 3 軸で、上場企業から新規事業まで一気通貫で支援します。分厚い報告書ではなく、明日から動けるアクションを届けます。</p>
                <p className="chips"><span><b>100+</b> AI エージェントで運営</span><span><b>日次更新</b>の専用ダッシュボード</span><span><b>D+1</b> レポーティング</span></p>
              </div>
              <div className="btns"><Link className="btn" href="/contact">無料相談を申し込む</Link><Link className="btn alt" href="/works">Works</Link></div>
            </div>
          </div>
          <p className="spine">戦略だけでは遅い。AIだけでは浅い。マーケだけでは一過性。</p>
        </section>

        <div className="ticker" aria-hidden="true"><div className="track vs">{Array.from({ length: 4 }, (_, group) => ["Strategy", "AI", "Marketing"].map((word) => <span key={`${group}-${word}`}>{word}</span>))}</div></div>

        <section className="thesis" id="thesis" aria-label="Why mixed">
          <div className="field f-navy" data-nav="dark"><span className="k">Strategy alone</span><p className="big">戦略だけでは<br />遅い。</p><span className="num" aria-hidden="true">01</span></div>
          <div className="field f-enji" data-nav="dark" data-diag><span className="k">AI alone</span><p className="big">AIだけでは<br />浅い。</p><span className="num" aria-hidden="true">02</span></div>
          <div className="field f-black" data-nav="dark"><span className="k">Marketing alone</span><p className="big">マーケだけでは<br />一過性。</p><span className="num" aria-hidden="true">03</span></div>
          <div className="field f-stone" data-nav="light" data-diag><span className="k">Why mixed</span><p className="big syn">3つが<em>&quot;ミックス&quot;</em>して初めて、事業は再現性のある成長曲線を描きはじめる。</p><p className="sub">だから私たちは、戦略・AI・マーケティングを分けずに、一つのチームで提供します。私たち自身が 100 体超の AI エージェントで運営する組織であり、その型を貴社に移植します。</p><span className="num" aria-hidden="true">=</span></div>
        </section>

        <section className="forces" id="services" data-nav="light">
          <div className="head"><h2>Three forces.<br />One engine.</h2><p>戦略が AI を加速し、AI がマーケを進化させ、マーケが戦略を検証する。3 つを一つのチームで回すから、施策が翌日から動きます。</p></div>
          {forces.map((force) => <article className={`force ${force.className}`} data-side={force.side} key={force.word}><p className="word vs"><span className="wi">{force.word}</span></p><div><h3>{force.title}</h3><p>{force.body}</p><ul>{force.items.map((item) => <li key={item}>{item}</li>)}</ul><Link className="go" href={force.href}>{force.link}</Link></div></article>)}
        </section>

        <section className="proof" id="proof" data-nav="dark">
          <p className="k"><span>By the numbers</span><span>実稼働・自社公開記事の実数（2026-09 時点）</span></p>
          <div className="stats">{stats.map(([value, label, note]) => <div className="stat" key={label}><b><Odometer value={value} /></b><span className="l">{label}</span><small>{note}</small></div>)}</div>
          <div className="index"><h3>Engagement index<small>匿名化した主な支援先。個別事例は順次公開</small></h3><div>{engagementRows.map((work, index) => <div className="row" key={work.slug}><span className="n">{String(index + 1).padStart(2, "0")}</span><span className="bar" style={{ "--w": `${48 + (index * 7) % 22}%` } as CSSProperties}><span className="sr-only">{work.client}</span></span><span className="ind">{work.industry}</span><span className="svcs">{work.services.map((service) => service[0].toUpperCase() + service.slice(1)).join(" · ")}</span></div>)}</div></div>
        </section>

        <section className="insights" id="insights" data-nav="light">
          <div className="head"><h2>Insights</h2><Link href="/insights">View all</Link></div>
          {latestPosts.map((post) => <Link href={`/insights/${post.slug}`} className="art" key={post.slug}><div className="num"><b><Odometer value={post.thumbNumber || "0"} /></b><small>{post.thumbLabel || post.readTime}</small></div><div><h3>{post.title}</h3><p>{post.excerpt}</p></div><div className="meta">{post.category}<br />{post.date.slice(0, 7).replace("-", ".")}</div></Link>)}
        </section>

        <section className="founder" id="founder" data-nav="dark">
          <p className="mono" aria-hidden="true">N.I.</p><div><p className="k">Founder</p><h2>石井 希実</h2><p className="role">Founder &amp; CEO · mixednuts Inc.</p><p>デジタル広告代理店で金融・不動産・旅行業界の大手企業を担当し、チームマネージャーとして PL 責任を担う。グローバル IT 企業では広告事業のアカウントストラテジストとして大手企業のデジタル戦略を支援。国内 IT 企業の経営企画で事業計画・FP&amp;A・投資評価・取締役会付議資料を担当。2021 年に mixednuts を創業。早稲田大学大学院 経営管理研究科 修了（MBA）。</p><Link className="go" href="/team/ceo">Profile</Link></div>
        </section>

        <div className="endwrap"><section className="end" id="contact" data-nav="dark"><h2 data-split><SplitWords words={["Let's", "build", "growth."]} /></h2><div className="cols"><p>60分の無料相談で、貴社の事業に適したアプローチを共に設計しませんか。翌営業日までに、初回の論点整理をお戻しします。</p><Link className="btn" href="/contact">無料相談を申し込む</Link></div></section></div>
      </main>
    </div>
  );
}
