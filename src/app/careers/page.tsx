import type { Metadata } from "next";
import Link from "next/link";
import { positions, CASUAL_INTERVIEW_SLUG } from "@/data/careers";
import SystemMotionV6 from "../SystemMotionV6";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import "../system-v6.css";

const faqItems = [
  { q: "副業・大手企業在籍のままの業務委託は可能ですか?", a: "はい、多くのメンバーが副業形態で参画しています。週2日〜設計可能です。所属企業の副業規定を遵守いただく形で、機密性・利害関係にも配慮して進めます。" },
  { q: "リモートは可能ですか?", a: '業務委託は完全リモート、正社員は "週1オフィス (南青山) + リモート" が基本です。地方在住メンバーもいます。' },
  { q: "未経験でも応募可能ですか?", a: "ポジションによります。AI Implementation Engineer は AI 実装未経験でも、エンジニアリング経験があれば応募可。Senior Strategy Consultant のようなシニアポジションは相応の経験が必要です。迷ったら気軽にお問い合わせください。" },
  { q: "どんな人が活躍していますか?", a: "共通しているのは (1) 自律的に動ける、(2) AI を使うことへの抵抗がない、(3) 複数領域に興味がある、(4) Calibration (数字と事実を大切にする)、の4点です。専門性の異なるメンバーや案件ごとのパートナーと協働します。" },
  { q: "記載されているポジション以外も応募できますか?", a: "もちろんです。スキルセットやご関心がフィットしそうな方は、ぜひお問い合わせください。新しいポジションをご一緒に設計することも可能です。" },
  { q: "英語は必須ですか?", a: "一部のポジション (海外案件担当等) では有利ですが、必須ではありません。現在のクライアントは国内中心です。" },
];

const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) };
const breadcrumb = buildBreadcrumbSchema([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }]);
const pageTitle = "Careers — AI と共に働くプロフェッショナル募集";
const pageDescription = "戦略・AI・マーケのプロフェッショナルを募集。フルタイム、業務委託、プロジェクト単位のパートナーまで、多様な働き方を設計可能。";

export const metadata: Metadata = { title: pageTitle, description: pageDescription, alternates: { canonical: "/careers" }, ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/careers" }) };

const reasons = [
  ["01", "AI が同僚になる", "100体超の AI エージェントが仕事を支えます。単純作業は AI に任せ、人間は戦略判断とクリエイティビティに集中します。"],
  ["02", "領域を越えた学び", "事業会社の経営企画・FP&A、広告・グロースなど、異なる専門性を持つメンバーやパートナーと協働します。"],
  ["03", "決定権と責任", "年次・肩書ではなく、成果と信頼で意思決定の範囲が広がる設計。AIを使って、自分で判断する組織です。"],
];
const styles = [
  ["FULL-TIME", "正社員", "フルコミットで事業成長をドライブする中核メンバー。経営幹部候補としての採用を含みます。", ["リモート + 週1オフィス (南青山)", "ストックオプション検討", "フレックス制", "書籍・学習支援あり"]],
  ["CONTRACT", "業務委託", "週2-4日のコミットで、特定案件に深く関わる形。副業可。大手企業在籍中の方も歓迎。", ["完全リモート", "週2日〜 柔軟に設計", "プロジェクト開始は最短翌週", "契約更新は3ヶ月ごと"]],
  ["PARTNER", "プロジェクト パートナー", "スポット案件や専門領域の助言で参画。1プロジェクト単位・1回コンサルから可能。", ["完全リモート", "成果報酬 / プロジェクト単位", "最短1ヶ月〜", "継続的な関係性も歓迎"]],
] as const;

export default function CareersPage() {
  return (
    <div className="mn-v6 mn-system-v6 careers-v6">
      <JsonLd data={faqSchema} /><JsonLd data={breadcrumb} /><SystemMotionV6 canvas act={1} />
      <section className="v6-scene system-hero" aria-labelledby="careers-title">
        <div className="v6-scene-inner system-hero-inner">
          <p className="system-breadcrumb"><Link href="/">Home</Link> / Careers</p>
          <div className="system-hero-copy">
            <p className="v6-kicker">Join the Mix</p>
            <h1 id="careers-title" className="v6-jp-heading system-title system-title--jp">AI と共に働く<br />プロフェッショナルを<br />募集しています。</h1>
            <p className="system-lead">フルタイム社員、業務委託、プロジェクト単位のパートナーまで。多様な働き方を組み合わせ、&quot;ミックス&quot;の文化を育てていく仲間を探しています。</p>
          </div>
        </div>
      </section>

      <section className="v6-scene v6-paper-scene system-paper">
        <div className="v6-scene-inner system-paper-inner">
          <header className="system-section-head" data-v6-reveal><p className="v6-kicker v6-kicker--paper">Why Join Us</p><h2 className="v6-jp-heading">ミックスナッツで働く<br />3つの魅力</h2><p className="system-section-lead">AI-first ファームで、&quot;自分の専門性&quot; × &quot;AIの拡張力&quot; を試せる場所。</p></header>
          <div className="editorial-grid">{reasons.map(([num, title, text]) => <article className="editorial-cell" data-v6-reveal key={num}><div className="why-num">{num}</div><h3 className="v6-jp-heading">{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className="v6-scene v6-paper-scene system-paper">
        <div className="v6-scene-inner system-paper-inner">
          <header className="system-section-head" data-v6-reveal><p className="v6-kicker v6-kicker--paper">Work Styles</p><h2 className="v6-jp-heading">3つの働き方</h2><p className="system-section-lead">ご自身のライフステージ・専門性・コミット度に合わせて選べます。</p></header>
          <div className="editorial-grid">{styles.map(([type, title, text, items]) => <article className="editorial-cell" data-v6-reveal key={type}><div className="style-type">{type}</div><h3 className="v6-jp-heading">{title}</h3><p>{text}</p><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul><a href="#open">Open positions ↓</a></article>)}</div>
        </div>
      </section>

      <section className="v6-scene v6-paper-scene system-paper" id="open">
        <div className="v6-scene-inner system-paper-inner">
          <header className="system-section-head" data-v6-reveal><p className="v6-kicker v6-kicker--paper">Open Positions</p><h2 className="v6-jp-heading">募集中のポジション</h2><p className="system-section-lead">記載以外のポジションでも、スキルセットにフィットする方は随時相談可能です。</p></header>
          <div className="position-list">{positions.map((pos) => <Link key={pos.slug} href={`/careers/apply?position=${pos.slug}`} className="position-item" data-v6-reveal><div className="position-main"><h3 className="v6-en-display">{pos.title}</h3><div className="position-tags">{pos.tags.map((tag) => <span key={tag} className="position-tag">{tag}</span>)}</div></div><div className="position-meta">{pos.type}<br />{pos.comp}</div><div className="position-arrow">→</div></Link>)}</div>
        </div>
      </section>

      <section className="v6-scene v6-paper-scene system-paper" id="process">
        <div className="v6-scene-inner system-paper-inner">
          <header className="system-section-head" data-v6-reveal><p className="v6-kicker v6-kicker--paper">Hiring Process</p><h2 className="v6-jp-heading">選考フロー</h2><p className="system-section-lead">2-4週間で選考完了。スピーディーに、お互い納得できる形を目指します。</p></header>
          <div className="hiring-steps">{[["1","Day 1","カジュアル面談","30分の面談で、お互いの興味と相性を確認。"],["2","Week 1","書類選考","職務経歴書とポートフォリオを確認。"],["3","Week 2","実技・ケース","実際の業務に即したケースを提出。"],["4","Week 3","CEO 面談","CEO と60分の最終面談。"],["5","Week 4","オファー","条件提示、合意、契約締結。"]].map(([num,day,title,desc]) => <div className="hiring-step" data-v6-reveal key={num}><div className="hiring-step-num">{num}</div><div className="days">{day}</div><h3>{title}</h3><p>{desc}</p></div>)}</div>
        </div>
      </section>

      <section className="v6-scene v6-paper-scene system-paper"><div className="v6-scene-inner system-paper-inner"><header className="system-section-head" data-v6-reveal><p className="v6-kicker v6-kicker--paper">FAQ</p><h2 className="v6-jp-heading">採用に関する<br />よくある質問</h2></header>{faqItems.map((item) => <details key={item.q} className="faq-item" data-v6-reveal><summary><h3 className="v6-jp-heading">{item.q}</h3></summary><div className="faq-a">{item.a}</div></details>)}</div></section>
      <section className="v6-scene system-ink-cta"><div className="v6-scene-inner"><div><p className="v6-kicker">Casual Interview</p><h2 className="v6-jp-heading">まずは、<br />話しましょう。</h2></div><Link href={`/careers/apply?position=${CASUAL_INTERVIEW_SLUG}`} className="v6-button v6-button--paper">カジュアル面談を申し込む</Link></div></section>
    </div>
  );
}
