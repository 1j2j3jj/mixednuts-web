import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "AI Implementation — AIと「共に働く組織」をつくる",
  description: "AIエージェント設計、LLM業務実装、データ基盤構築。自社で120体超のAIエージェント組織を運営するAI-firstファーム。",
  alternates: { canonical: "/services/ai" },
};

const aiWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden && w.services.includes("ai")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/ai#service",
  name: "AI Implementation",
  serviceType: "AI Implementation / Agent Architecture",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description:
    "AIエージェント設計、プロンプトエンジニアリング、LLM業務実装、MCP統合、AIガバナンスまで一気通貫の AI 導入支援。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/ai",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "AI Implementation", path: "/services/ai" },
]);

const solutions = [
  {
    icon: "01",
    title: "AI エージェント設計",
    desc: "業務フロー全体を分析し、どこにAIを配置すべきかの設計から実装まで。専門領域ごとの役割分担、エージェント間連携、ガバナンスまで一気通貫で支援します。",
    features: ["マルチエージェント設計", "専門性別ロール分担", "エージェント間連携", "ガバナンス設計"],
  },
  {
    icon: "02",
    title: "プロンプトエンジニアリング",
    desc: "再現性のある出力を実現するプロンプト設計と評価。A/Bテスト、評価ハーネス構築、継続的な改善プロセスまで。単発ではなく運用を前提に設計します。",
    features: ["プロンプト設計", "評価フレームワーク", "A/Bテスト", "継続改善運用"],
  },
  {
    icon: "03",
    title: "LLM 業務実装",
    desc: "月次決算、FP&A分析、顧客対応、コンテンツ生成など、業務領域ごとにAIを組み込む。既存の業務フローを破壊せず、段階的に置き換えます。",
    features: ["FP&A × AI", "マーケ × AI", "CS × AI", "戦略分析 × AI"],
  },
  {
    icon: "04",
    title: "データ基盤 / MCP 統合",
    desc: "MCPサーバー構築、データソース統合、ツール連携まで。Google Workspace、Slack、CRM、会計ソフト等の既存ツールとAIを繋ぎ込みます。",
    features: ["MCP サーバー構築", "API 連携", "データパイプライン", "既存ツール統合"],
  },
  {
    icon: "05",
    title: "AI ガバナンス",
    desc: "機密情報の取り扱い、権限管理、監査ログ、ハルシネーション対策まで。エンタープライズ要件に応えるAI運用体制を構築します。",
    features: ["アクセス制御", "監査ログ", "NDA / 機密管理", "ハルシネーション対策"],
  },
  {
    icon: "06",
    title: "社内 AI 活用研修",
    desc: "経営層・現場リーダー向けの研修プログラム。「AIで何ができるか」ではなく「自社にどう実装するか」を、ハンズオンで学ぶカリキュラムです。",
    features: ["経営層向けワークショップ", "現場リーダー研修", "ハンズオン実装", "継続的な運用伴走"],
  },
];

const stack = [
  {
    cat: "LLM",
    items: ["Claude (Opus / Sonnet / Haiku)", "GPT-4o / o1", "Gemini", "Local LLM (Llama / Mistral)"],
  },
  {
    cat: "Integration",
    items: ["Model Context Protocol (MCP)", "OpenAI Agent SDK", "LangChain / LangGraph", "Vercel AI SDK"],
  },
  {
    cat: "Data / Cloud",
    items: ["Google Cloud / BigQuery", "AWS Bedrock", "Cloudflare Workers", "Supabase / Postgres"],
  },
  {
    cat: "Workflow",
    items: ["Claude Code / Routines", "GitHub Actions", "Zapier / Make", "Slack / Gmail 連携"],
  },
];

const processSteps = [
  { num: "01", phase: "Week 1-4", title: "現状診断・設計", desc: "業務フロー全体をマッピング。自動化すべき工程と人間が担うべき工程を分離。AI実装ロードマップを策定。" },
  { num: "02", phase: "Month 2-3", title: "PoC・プロトタイプ", desc: "最優先の業務領域でプロトタイプを構築。実際の業務データで検証し、精度・速度・ユーザー受容性を評価。" },
  { num: "03", phase: "Month 4-6", title: "本番実装・統合", desc: "既存システムとの統合、セキュリティ設計、権限管理を含む本番稼働。ユーザー研修と並行して段階展開。" },
  { num: "04", phase: "Month 7+", title: "継続改善・拡張", desc: "KPI計測、プロンプト改善、新たな業務への展開。AI組織として自走できる体制づくりを支援。" },
];

const faqs = [
  { q: "AIの知識がない社員でも使えますか？", a: "はい、前提知識は不要です。業務フローに自然に組み込まれる設計を採用しており、ユーザーは「AIを使っている」ことを意識せずに業務を進められます。必要に応じて研修プログラムも提供します。" },
  { q: "社内の機密情報はどう扱いますか？", a: "エンタープライズ契約（学習データに利用されないプラン）を使用し、機密情報の取り扱いルールを事前に策定します。NDA締結後、お客様のセキュリティポリシーに準拠した設計を行います。" },
  { q: "既存のシステムやツールと連携できますか？", a: "はい。Google Workspace、Slack、各種CRM、会計ソフト、ERP等との連携実績があります。MCPプロトコルや既存APIを活用した統合設計を行います。" },
  { q: "どのくらいの期間・費用がかかりますか？", a: "スコープによりますが、PoC（概念検証）は1-2ヶ月、本番実装は3-6ヶ月が目安です。費用はプロジェクト規模によりますが、月額リテーナー¥50万〜からご相談いただけます。まずは初回無料相談でスコープを明確化しましょう。" },
];

export default function ServiceAIPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumb} />

      {/* ===== SUBHERO ===== */}
      <header className="subhero">
        <canvas className="hero-fx fxgen" data-count="60" data-interactive aria-hidden="true" />
        <div className="hero-orb o1" data-parallax="0.34" data-mouse="0.05" aria-hidden="true" />
        <div className="hero-orb o2" data-parallax="0.22" data-mouse="0.035" aria-hidden="true" />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap subhero-inner">
          <div className="crumb reveal">
            <Link href="/">Home</Link> / <Link href="/services">Services</Link> / AI Implementation
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> AI Implementation · Most Requested
          </div>
          <h1 className="big-title reveal">
            AI<em>.</em>
          </h1>
          <p className="subhero-lead reveal" style={{ marginTop: 18 }}>
            <strong style={{ color: "#fff", fontWeight: 600 }}>
              AIを&ldquo;使う&rdquo;のではなく、AIと&ldquo;共に働く組織&rdquo;をつくる。
            </strong>
            <br />
            AIエージェント設計、LLM業務実装、データ基盤構築まで。私たち自身、120体超のAIエージェントで組織を運営しています。自社で磨き上げたアーキテクチャを、お客様の事業に展開します。
          </p>
          <div className="subhero-meta reveal">
            <div>
              <div className="k">120+</div>
              <div className="l">社内AIエージェント稼働中</div>
            </div>
            <div>
              <div className="k">70+</div>
              <div className="l">業務スキル定義済み</div>
            </div>
            <div>
              <div className="k">40+</div>
              <div className="l">業務プロセス自動化</div>
            </div>
            <div>
              <div className="k">-70%</div>
              <div className="l">時間削減の実例</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== INTRO ===== */}
      <section className="sec white">
        <div className="wrap">
          <p className="lead-lg reveal" style={{ maxWidth: 880 }}>
            AIを&ldquo;導入&rdquo;で終わらせない。業務に根づくまで、伴走します。
          </p>
        </div>
      </section>

      {/* ===== SOLUTIONS ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> What We Offer
            </div>
            <h2 className="title reveal">
              6つの AI 実装<em>ソリューション</em>。
            </h2>
            <p className="lead-lg reveal" style={{ maxWidth: 760 }}>
              ツール導入で終わらせず、業務フローに溶け込むAIを実装します。PoCで止まらず、本番運用まで伴走するのが私たちの特徴です。
            </p>
          </div>
          <div className="vgrid three">
            {solutions.map((s) => (
              <div key={s.title} className="vcard reveal">
                <div className="vn">{s.icon}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                <ul className="filters" style={{ marginTop: 16 }}>
                  {s.features.map((f) => (
                    <li key={f} className="fchip">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECH STACK ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow reveal">
              <i className="pulse" /> Tech Stack
            </div>
            <h2 className="title reveal">
              使用している<em>技術</em>。
            </h2>
            <p className="lead-lg reveal" style={{ maxWidth: 760 }}>
              エンタープライズで実運用できる技術スタック。お客様の既存システムに合わせて柔軟に選定します。
            </p>
          </div>
          <div className="vgrid">
            {stack.map((cat) => (
              <div key={cat.cat} className="vcard reveal">
                <div className="eyebrow dark" style={{ marginBottom: 14 }}>
                  {cat.cat}
                </div>
                <ul className="svc-list">
                  {cat.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Our Process
            </div>
            <h2 className="title reveal">
              AI実装の<em>進め方</em>。
            </h2>
            <p className="lead-lg reveal" style={{ maxWidth: 760 }}>
              PoC → 本番稼働 → 継続改善の流れを、4つのフェーズで確実に進めます。
            </p>
          </div>
          <div className="proc">
            {processSteps.map((s) => (
              <div key={s.num} className="proc-step reveal">
                <div className="proc-n">{s.num}</div>
                <div className="eyebrow dark" style={{ marginBottom: 6 }}>
                  {s.phase}
                </div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CASES (preserves CASES_COMING_SOON empty-state behavior) ===== */}
      {aiWorks.length > 0 && (
        <section className="sec">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> AI Case Studies
              </div>
              <h2 className="title reveal">
                AI実装の<em>成果</em>。
              </h2>
              <p className="lead-lg reveal" style={{ maxWidth: 760 }}>
                実際のプロジェクトから。すべて匿名ですが、業種・数字で具体性を担保しています。
              </p>
            </div>
            <div className="vgrid three">
              {aiWorks.map((w) => (
                <Link key={w.slug} href={`/works/${w.slug}`} className="vcard reveal">
                  <div className="eyebrow dark" style={{ marginBottom: 12 }}>
                    {w.industry}
                  </div>
                  <h4>{w.title}</h4>
                  <div className="work-nums" style={{ margin: "16px 0" }}>
                    {w.metric.slice(0, 2).map((m) => (
                      <div key={m.label}>
                        <span className="wl">{m.label}</span>
                        <span className="wv">{m.value}</span>
                      </div>
                    ))}
                  </div>
                  <p>{w.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> FAQ
            </div>
            <h2 className="title reveal">
              よくある<em>質問</em>。
            </h2>
          </div>
          <div className="reveal" style={{ maxWidth: 900, margin: "0 auto" }}>
            {faqs.map((faq) => (
              <details key={faq.q} className="faq">
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta">
        <div className="cta-photo" data-parallax="0.16" aria-hidden="true" />
        <canvas className="cta-fx fxgen" data-count="46" aria-hidden="true" />
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s build together
          </div>
          <h2 className="cta-h reveal">
            AI実装を、
            <br />
            <em>今すぐ。</em>
          </h2>
          <p className="reveal">
            まずは貴社の業務フローを聞かせてください。どこからAIを入れるべきか、60分で見えてきます。
          </p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>無料相談を申し込む</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
