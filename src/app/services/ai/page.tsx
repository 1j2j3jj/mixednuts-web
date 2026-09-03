import type { Metadata } from "next";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import ServiceDetailV6 from "../ServiceDetailV6";
import "../v6-services.css";

const pageTitle = "AI実装支援 — AIエージェントを業務へ組み込む";
const pageDescription =
  "AIエージェント設計、プロンプト評価、LLMの業務実装、データ基盤・MCP統合、ガバナンス、社内研修まで、自社の100体超のAI運用知見を基に本番稼働まで支援します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services/ai" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services/ai" }),
};

const faqItems = [
  {
    q: "AIの知識がない社員でも使えますか？",
    a: "はい、前提知識は不要です。業務フローに自然に組み込まれる設計を採用しており、ユーザーは「AIを使っている」ことを意識せずに業務を進められます。必要に応じて研修プログラムも提供します。",
  },
  {
    q: "社内の機密情報はどう扱いますか？",
    a: "エンタープライズ契約（学習データに利用されないプラン）を使用し、機密情報の取り扱いルールを事前に策定します。NDA締結後、お客様のセキュリティポリシーに準拠した設計を行います。",
  },
  {
    q: "既存のシステムやツールと連携できますか？",
    a: "はい。Google Workspace、Slack、各種CRM、会計ソフト、ERP等と、MCPプロトコルや既存APIを活用した統合設計を行います。",
  },
  {
    q: "どのくらいの期間・費用がかかりますか？",
    a: "期間・費用は対象業務と実装範囲によって異なります。初回相談で業務フローと優先順位を確認し、PoCから本番運用までのスコープを明確にします。",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://mixednuts-inc.com/services/ai#faq",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const aiWorks = CASES_COMING_SOON
  ? []
  : works.filter((work) => !work.hidden && work.services.includes("ai")).slice(0, 4);

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
const webPageSchema = buildWebPageSchema({ path: "/services/ai", name: pageTitle, description: pageDescription });

const offerings = [
  { num: "01", title: "AI エージェント設計", desc: "業務フロー全体を分析し、どこにAIを配置すべきかの設計から実装まで。専門領域ごとの役割分担、エージェント間連携、ガバナンスまで一気通貫で支援します。", items: ["マルチエージェント設計", "専門性別ロール分担", "エージェント間連携", "ガバナンス設計"] },
  { num: "02", title: "プロンプトエンジニアリング", desc: "再現性のある出力を実現するプロンプト設計と評価。A/Bテスト、評価ハーネス構築、継続的な改善プロセスまで、運用を前提に設計します。", items: ["プロンプト設計", "評価フレームワーク", "A/Bテスト", "継続改善運用"] },
  { num: "03", title: "LLM 業務実装", desc: "月次決算、FP&A分析、顧客対応、コンテンツ生成など、業務領域ごとにAIを組み込みます。既存の業務フローを破壊せず、段階的に置き換えます。", items: ["FP&A × AI", "マーケ × AI", "CS × AI", "戦略分析 × AI"] },
  { num: "04", title: "データ基盤 / MCP 統合", desc: "MCPサーバー構築、データソース統合、ツール連携まで。Google Workspace、Slack、CRM、会計ソフト等の既存ツールとAIを繋ぎ込みます。", items: ["MCP サーバー構築", "API 連携", "データパイプライン", "既存ツール統合"] },
  { num: "05", title: "AI ガバナンス", desc: "機密情報の取り扱い、権限管理、監査ログ、ハルシネーション対策まで。エンタープライズ要件に応えるAI運用体制を構築します。", items: ["アクセス制御", "監査ログ", "NDA / 機密管理", "ハルシネーション対策"] },
  { num: "06", title: "社内 AI 活用研修", desc: "経営層・現場リーダー向けの研修プログラム。「AIで何ができるか」ではなく「自社にどう実装するか」を、ハンズオンで学ぶカリキュラムです。", items: ["経営層向けワークショップ", "現場リーダー研修", "ハンズオン実装", "継続的な運用伴走"] },
];

const stackRows = [
  { num: "01", title: "LLM", desc: "Anthropic、OpenAI、Google の各モデルと、要件に応じたローカル LLM を選定します。" },
  { num: "02", title: "Integration", desc: "Model Context Protocol、Agent SDK、LangChain / LangGraph、Vercel AI SDK を用途に合わせて組み合わせます。" },
  { num: "03", title: "Data / Cloud", desc: "Google Cloud / BigQuery、AWS、Cloudflare、Postgres を中心に、既存基盤へ接続します。" },
  { num: "04", title: "Workflow", desc: "GitHub Actions、自動化ツール、Slack / Gmail 連携を用いて、運用フローまで実装します。" },
];

const process = [
  { num: "01", meta: "Week 1-4", title: "現状診断・設計", desc: "業務フロー全体をマッピング。自動化すべき工程と人間が担うべき工程を分離し、AI実装ロードマップを策定します。" },
  { num: "02", meta: "Month 2-3", title: "PoC・プロトタイプ", desc: "最優先の業務領域でプロトタイプを構築。実際の業務データで検証し、精度・速度・ユーザー受容性を評価します。" },
  { num: "03", meta: "Month 4-6", title: "本番実装・統合", desc: "既存システムとの統合、セキュリティ設計、権限管理を含む本番稼働。ユーザー研修と並行して段階展開します。" },
  { num: "04", meta: "Month 7+", title: "継続改善・拡張", desc: "KPI計測、プロンプト改善、新たな業務への展開。AI組織として自走できる体制づくりを支援します。" },
];

export default function ServiceAIPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={webPageSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumb} />
      <ServiceDetailV6
        act="ACT II"
        theme="enji"
        word="AI"
        eyebrow="AI implementation"
        headline={<><span>AIと「共に働く</span><br /><span>組織」をつくる。</span></>}
        lead="AIエージェント設計、LLM業務実装、データ基盤構築まで。私たち自身、100体超のAIエージェントで組織を運営しています。自社で磨き上げたアーキテクチャを、お客様の事業に展開します。"
        metric={{ value: "100+", label: "社内 AI エージェント", note: "自社の運営で実装と改善を継続" }}
        offerings={offerings}
        offeringsTitle={<><span>6つの AI 実装</span><br /><span>ソリューション。</span></>}
        offeringsLead="ツール導入で終わらせず、業務フローに溶け込むAIを実装します。PoCで止まらず、本番運用まで伴走します。"
        secondary={{ label: "Tech stack", title: <><span>使用している</span><br /><span>技術。</span></>, lead: "既存システムと要件に合わせて、実運用できる構成を選定します。", rows: stackRows }}
        process={process}
        cases={aiWorks}
        faq={faqItems}
        ctaTitle={<><span>AI実装を、</span><br /><span>今すぐ始める。</span></>}
        ctaBody="まずは貴社の業務フローを聞かせてください。どこからAIを入れるべきか、一緒に整理します。"
      />
    </>
  );
}
