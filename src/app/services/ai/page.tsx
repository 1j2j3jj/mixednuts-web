import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { works, CASES_COMING_SOON } from "@/data/works";
import { buildPageOg } from "@/lib/site-metadata";
import ServiceDetailMotion from "../ServiceDetailMotion";
import "../v6-services.css";

const pageTitle = "AI Implementation — AIと「共に働く組織」をつくる";
const pageDescription =
  "AIエージェント設計、LLM業務実装、データ基盤構築。自社で100体超のAIエージェント組織を運営するAI-firstファーム。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services/ai" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services/ai" }),
};

const faqItems = [
  { q: "AIの知識がない社員でも使えますか？", a: "はい、前提知識は不要です。業務フローに自然に組み込まれる設計を採用しており、ユーザーは「AIを使っている」ことを意識せずに業務を進められます。必要に応じて研修プログラムも提供します。" },
  { q: "社内の機密情報はどう扱いますか？", a: "エンタープライズ契約（学習データに利用されないプラン）を使用し、機密情報の取り扱いルールを事前に策定します。NDA締結後、お客様のセキュリティポリシーに準拠した設計を行います。" },
  { q: "既存のシステムやツールと連携できますか？", a: "はい。Google Workspace、Slack、各種CRM、会計ソフト、ERP等との連携実績があります。MCPプロトコルや既存APIを活用した統合設計を行います。" },
  { q: "どのくらいの期間・費用がかかりますか？", a: "スコープによりますが、PoC（概念検証）は1-2ヶ月、本番実装は3-6ヶ月が目安です。費用はプロジェクト規模によりますが、月額リテーナー¥50万〜からご相談いただけます。まずは初回無料相談でスコープを明確化しましょう。" },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://mixednuts-inc.com/services/ai#faq",
  mainEntity: faqItems.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
};

const aiWorks = CASES_COMING_SOON
  ? []
  : works.filter((work) => !work.hidden && work.services.includes("ai")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/ai#service",
  name: "AI Implementation",
  serviceType: "AI Implementation / Agent Architecture",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description: "AIエージェント設計、プロンプトエンジニアリング、LLM業務実装、MCP統合、AIガバナンスまで一気通貫の AI 導入支援。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/ai",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "AI Implementation", path: "/services/ai" },
]);

const proof = [["100+", "社内AIエージェント稼働中"], ["70+", "業務スキル定義済み"], ["40+", "業務プロセス自動化"], ["-70%", "時間削減の実例"]];

const solutions = [
  { num: "01", title: "AI エージェント設計", desc: "業務フロー全体を分析し、どこにAIを配置すべきかの設計から実装まで。専門領域ごとの役割分担、エージェント間連携、ガバナンスまで一気通貫で支援します。", features: ["マルチエージェント設計", "専門性別ロール分担", "エージェント間連携", "ガバナンス設計"] },
  { num: "02", title: "プロンプトエンジニアリング", desc: "再現性のある出力を実現するプロンプト設計と評価。A/Bテスト、評価ハーネス構築、継続的な改善プロセスまで。単発ではなく運用を前提に設計します。", features: ["プロンプト設計", "評価フレームワーク", "A/Bテスト", "継続改善運用"] },
  { num: "03", title: "LLM 業務実装", desc: "月次決算、FP&A分析、顧客対応、コンテンツ生成など、業務領域ごとにAIを組み込む。既存の業務フローを破壊せず、段階的に置き換えます。", features: ["FP&A × AI", "マーケ × AI", "CS × AI", "戦略分析 × AI"] },
  { num: "04", title: "データ基盤 / MCP 統合", desc: "MCPサーバー構築、データソース統合、ツール連携まで。Google Workspace、Slack、CRM、会計ソフト等の既存ツールとAIを繋ぎ込みます。", features: ["MCP サーバー構築", "API 連携", "データパイプライン", "既存ツール統合"] },
  { num: "05", title: "AI ガバナンス", desc: "機密情報の取り扱い、権限管理、監査ログ、ハルシネーション対策まで。エンタープライズ要件に応えるAI運用体制を構築します。", features: ["アクセス制御", "監査ログ", "NDA / 機密管理", "ハルシネーション対策"] },
  { num: "06", title: "社内 AI 活用研修", desc: "経営層・現場リーダー向けの研修プログラム。「AIで何ができるか」ではなく「自社にどう実装するか」を、ハンズオンで学ぶカリキュラムです。", features: ["経営層向けワークショップ", "現場リーダー研修", "ハンズオン実装", "継続的な運用伴走"] },
];

const stack = [
  { title: "LLM", items: ["Claude (Opus / Sonnet / Haiku)", "GPT-4o / o1", "Gemini", "Local LLM (Llama / Mistral)"] },
  { title: "Integration", items: ["Model Context Protocol (MCP)", "OpenAI Agent SDK", "LangChain / LangGraph", "Vercel AI SDK"] },
  { title: "Data / Cloud", items: ["Google Cloud / BigQuery", "AWS Bedrock", "Cloudflare Workers", "Supabase / Postgres"] },
  { title: "Workflow", items: ["Claude Code / Routines", "GitHub Actions", "Zapier / Make", "Slack / Gmail 連携"] },
];

const process = [
  { num: "01", phase: "Week 1-4", title: "現状診断・設計", desc: "業務フロー全体をマッピング。自動化すべき工程と人間が担うべき工程を分離。AI実装ロードマップを策定。" },
  { num: "02", phase: "Month 2-3", title: "PoC・プロトタイプ", desc: "最優先の業務領域でプロトタイプを構築。実際の業務データで検証し、精度・速度・ユーザー受容性を評価。" },
  { num: "03", phase: "Month 4-6", title: "本番実装・統合", desc: "既存システムとの統合、セキュリティ設計、権限管理を含む本番稼働。ユーザー研修と並行して段階展開。" },
  { num: "04", phase: "Month 7+", title: "継続改善・拡張", desc: "KPI計測、プロンプト改善、新たな業務への展開。AI組織として自走できる体制づくりを支援。" },
];

export default function ServiceAIPage() {
  return (
    <div className="mn-v6 mn-v6-services">
      <JsonLd data={serviceSchema} /><JsonLd data={faqSchema} /><JsonLd data={breadcrumb} />
      <ServiceDetailMotion act={2} />
      <main>
        <section className="v6-scene sv6-detail-hero" aria-labelledby="ai-title">
          <div className="v6-scene-inner sv6-detail-hero-inner">
            <p className="v6-kicker sv6-detail-overline">Act II · AI Implementation</p>
            <h1 id="ai-title" className="v6-en-display sv6-detail-title"><span>WORK</span><br /><span>WITH</span><br /><span className="v6-accent">INTELLIGENCE.</span></h1>
            <div className="sv6-detail-bottom"><p className="sv6-detail-lead v6-jp-heading">AIを&quot;使う&quot;のではなく、<br />AIと&quot;共に働く組織&quot;をつくる。</p><p className="sv6-detail-meta">Agents / LLM / Automation</p></div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="ai-intro-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker v6-kicker--paper">Mandate · Production AI</p><h2 id="ai-intro-title" className="v6-jp-heading">PoCで止めず、<br />業務に溶け込むAIへ。</h2><p>AIエージェント設計、LLM業務実装、データ基盤構築まで。私たち自身、100体超のAIエージェントで組織を運営しています。自社で磨き上げたアーキテクチャを、お客様の事業に展開します。</p></header>
            <div className="sv6-rows">{proof.map(([value, label], index) => <div className="sv6-row" data-sv6-reveal key={label}><span className="sv6-row-no">0{index + 1}</span><h3 className="v6-en-display">{value}</h3><div className="sv6-row-copy"><p>{label}</p></div></div>)}</div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="ai-solutions-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker v6-kicker--paper">What We Offer · Six Solutions</p><h2 id="ai-solutions-title" className="v6-jp-heading">6つの AI 実装<br />ソリューション。</h2><p>ツール導入で終わらせず、業務フローに溶け込むAIを実装します。PoCで止まらず、本番運用まで伴走するのが私たちの特徴です。</p></header>
            <ol className="sv6-rows">{solutions.map((solution) => <li className="sv6-row" data-sv6-reveal key={solution.num}><span className="sv6-row-no">{solution.num}</span><h3 className="v6-jp-heading">{solution.title}</h3><div className="sv6-row-copy"><p>{solution.desc}</p><ul>{solution.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div></li>)}</ol>
          </div>
        </section>

        <section className="v6-scene sv6-editorial sv6-ink-editorial" aria-labelledby="ai-stack-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker">Tech Stack</p><h2 id="ai-stack-title" className="v6-jp-heading">使用している技術。</h2><p>エンタープライズで実運用できる技術スタック。お客様の既存システムに合わせて柔軟に選定します。</p></header>
            <div className="sv6-rows">{stack.map((category, index) => <div className="sv6-row" data-sv6-reveal key={category.title}><span className="sv6-row-no">0{index + 1}</span><h3 className="v6-en-display">{category.title}</h3><div className="sv6-row-copy"><ul>{category.items.map((item) => <li key={item}>{item}</li>)}</ul></div></div>)}</div>
          </div>
        </section>

        <section className="v6-scene v6-paper-scene sv6-editorial sv6-process" aria-labelledby="ai-process-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker v6-kicker--paper">Our Process · Four Phases</p><h2 id="ai-process-title" className="v6-jp-heading">AI実装の進め方。</h2><p>PoC → 本番稼働 → 継続改善の流れを、4つのフェーズで確実に進めます。</p></header>
            <ol className="sv6-rows">{process.map((step) => <li className="sv6-row" data-sv6-reveal key={step.num}><span className="sv6-row-no">{step.num}</span><span className="sv6-phase">{step.phase}</span><h3 className="v6-jp-heading">{step.title}</h3><div className="sv6-row-copy"><p>{step.desc}</p></div></li>)}</ol>
          </div>
        </section>

        {aiWorks.length > 0 && <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="ai-cases-title"><div className="v6-scene-inner sv6-editorial-inner"><header className="sv6-section-head"><p className="v6-kicker v6-kicker--paper">AI Case Studies</p><h2 id="ai-cases-title" className="v6-jp-heading">AI実装の成果。</h2><p>実際のプロジェクトから。すべて匿名ですが、業種・数字で具体性を担保しています。</p></header><div className="sv6-rows">{aiWorks.map((work, index) => <Link className="sv6-row sv6-case-link" href={`/works/${work.slug}`} key={work.slug}><span className="sv6-row-no">0{index + 1}</span><h3 className="v6-jp-heading">{work.title}</h3><div className="sv6-row-copy"><p>{work.industry} · {work.summary}</p></div></Link>)}</div></div></section>}

        <section className="v6-scene v6-paper-scene sv6-editorial" aria-labelledby="ai-faq-title">
          <div className="v6-scene-inner sv6-editorial-inner">
            <header className="sv6-section-head" data-sv6-reveal><p className="v6-kicker v6-kicker--paper">FAQ · Before We Begin</p><h2 id="ai-faq-title" className="v6-jp-heading">よくある質問。</h2><p>導入前によくいただくご質問を、開いた状態でまとめています。</p></header>
            <div className="sv6-rows">{faqItems.map((faq, index) => <article className="sv6-row sv6-faq-row" data-sv6-reveal key={faq.q}><span className="sv6-row-no">Q{index + 1}</span><h3 className="v6-jp-heading">{faq.q}</h3><div className="sv6-row-copy"><p>{faq.a}</p></div></article>)}</div>
          </div>
        </section>

        <section className="v6-scene v6-end" aria-labelledby="ai-end-title"><div className="v6-scene-inner v6-end-inner"><h2 className="v6-kicker">End Credits · AI</h2><div><p id="ai-end-title" className="v6-en-display v6-end-title">START<br /><span className="v6-accent">IN PRODUCTION.</span></p><p className="v6-end-copy">まずは貴社の業務フローを聞かせてください。どこからAIを入れるべきか、60分で見えてきます。</p><Link href="/contact" className="v6-button v6-button--paper">無料相談を申し込む</Link></div></div></section>
      </main>
    </div>
  );
}
