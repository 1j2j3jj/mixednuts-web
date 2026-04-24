import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "AI Implementation — AIと「共に働く組織」をつくる",
  description: "AIエージェント設計、LLM業務実装、データ基盤構築。自社で120体超のAIエージェント組織を運営するAI-firstファーム。",
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

export default function ServiceAIPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumb} />
      <style>{`
        .page-hero-ai { background: var(--off-white); }
        .proof-bar { background: var(--navy); color: #fff; padding: 48px 32px; }
        .proof-bar-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
        .proof-stat { text-align: center; }
        .proof-stat .num { font-family: var(--font-serif-en); font-size: 42px; font-weight: 700; color: var(--cyan); line-height: 1; margin-bottom: 8px; }
        .proof-stat .label { font-size: 12px; color: rgba(255,255,255,0.7); }
        .solutions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
        .solution-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 20px; padding: 40px; transition: all 0.3s; }
        .solution-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(11,22,52,0.08); border-color: var(--cyan); }
        .solution-card .s-icon { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #064A5C, var(--navy)); color: var(--cyan); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 24px; }
        .solution-card h3 { font-family: var(--font-serif-jp); font-size: 22px; margin-bottom: 12px; font-weight: 700; color: var(--navy); }
        .solution-card p { color: #4B5563; font-size: 14px; line-height: 1.9; margin-bottom: 16px; }
        .solution-card .features { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0; }
        .solution-card .features li { font-size: 11px; padding: 4px 10px; background: #F9FAFB; color: #4B5563; border-radius: 4px; }
        .stack-section { background: var(--navy); color: #fff; position: relative; overflow: hidden; }
        .stack-section::before { content: ''; position: absolute; inset: 0; background-image: radial-gradient(circle at 30% 50%, rgba(0,180,216,0.1) 0%, transparent 50%); }
        .stack-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 48px; }
        .stack-category { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; }
        .stack-category h3 { font-size: 14px; color: var(--cyan); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px; }
        .stack-category ul { list-style: none; padding: 0; }
        .stack-category ul li { padding: 8px 0; font-size: 13px; color: rgba(255,255,255,0.85); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .stack-category ul li:last-child { border-bottom: none; }
        .process-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .process-step { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 32px 24px; position: relative; }
        .process-num { position: absolute; top: -16px; left: 24px; background: var(--cyan); color: var(--navy); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
        .process-step h3 { font-family: var(--font-serif-jp); font-size: 17px; margin: 12px 0 8px; color: var(--navy); }
        .process-step .phase { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
        .process-step p { font-size: 13px; color: #4B5563; line-height: 1.7; }
        .cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .case-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; transition: all 0.3s; }
        .case-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); border-color: var(--navy); }
        .case-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
        .case-sector { padding: 4px 10px; background: var(--navy); color: #fff; font-size: 11px; border-radius: 4px; font-weight: 600; }
        .case-title { font-family: var(--font-serif-jp); font-size: 17px; font-weight: 700; margin-bottom: 16px; line-height: 1.5; }
        .case-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px; }
        .case-metric-label { font-size: 10px; color: #9CA3AF; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        .case-metric-value { font-family: var(--font-serif-en); font-size: 22px; font-weight: 700; color: var(--navy); }
        .case-metric-value.gain { color: var(--success); }
        .faq-list { max-width: 900px; margin: 0 auto; }
        .faq-item { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; margin-bottom: 16px; padding: 24px 28px; }
        .faq-q { font-family: var(--font-serif-jp); font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 12px; }
        .faq-a { font-size: 14px; color: #4B5563; line-height: 1.9; }
        @media (max-width: 900px) {
          .proof-bar-inner, .solutions-grid, .stack-grid, .process-steps, .cases-grid { grid-template-columns: 1fr; }
          .proof-bar-inner, .stack-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <section className="page-hero page-hero-ai">
        <div className="page-hero-inner">
          <div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/services">Services</Link> / AI Implementation</div>
          <div className="page-hero-badge">AI Implementation · Most Requested</div>
          <h1>AIを"使う"のではなく、<br />AIと"<span className="accent">共に働く組織</span>"をつくる。</h1>
          <p className="lead">
            AIエージェント設計、LLM業務実装、データ基盤構築まで。私たち自身、120体超のAIエージェントで組織を運営しています。自社で磨き上げたアーキテクチャを、お客様の事業に展開します。
          </p>
        </div>
      </section>

      {/* Proof bar */}
      <section className="proof-bar">
        <div className="proof-bar-inner">
          <div className="proof-stat"><div className="num">120+</div><div className="label">社内AIエージェント稼働中</div></div>
          <div className="proof-stat"><div className="num">70+</div><div className="label">業務スキル定義済み</div></div>
          <div className="proof-stat"><div className="num">40+</div><div className="label">業務プロセス自動化</div></div>
          <div className="proof-stat"><div className="num">-70%</div><div className="label">時間削減の実例</div></div>
        </div>
      </section>

      {/* Solutions */}
      <section className="section">
        <div className="section-inner">
          <span className="section-label">What We Offer</span>
          <h2 className="section-title">6つの AI 実装ソリューション。</h2>
          <p className="section-lead">ツール導入で終わらせず、業務フローに溶け込むAIを実装します。PoCで止まらず、本番運用まで伴走するのが私たちの特徴です。</p>
          <div className="solutions-grid">
            {[
              { icon: "01", title: "AI エージェント設計", desc: "業務フロー全体を分析し、どこにAIを配置すべきかの設計から実装まで。専門領域ごとの役割分担、エージェント間連携、ガバナンスまで一気通貫で支援します。", features: ["マルチエージェント設計", "専門性別ロール分担", "エージェント間連携", "ガバナンス設計"] },
              { icon: "02", title: "プロンプトエンジニアリング", desc: "再現性のある出力を実現するプロンプト設計と評価。A/Bテスト、評価ハーネス構築、継続的な改善プロセスまで。単発ではなく運用を前提に設計します。", features: ["プロンプト設計", "評価フレームワーク", "A/Bテスト", "継続改善運用"] },
              { icon: "03", title: "LLM 業務実装", desc: "月次決算、FP&A分析、顧客対応、コンテンツ生成など、業務領域ごとにAIを組み込む。既存の業務フローを破壊せず、段階的に置き換えます。", features: ["FP&A × AI", "マーケ × AI", "CS × AI", "戦略分析 × AI"] },
              { icon: "04", title: "データ基盤 / MCP 統合", desc: "MCPサーバー構築、データソース統合、ツール連携まで。Google Workspace、Slack、CRM、会計ソフト等の既存ツールとAIを繋ぎ込みます。", features: ["MCP サーバー構築", "API 連携", "データパイプライン", "既存ツール統合"] },
              { icon: "05", title: "AI ガバナンス", desc: "機密情報の取り扱い、権限管理、監査ログ、ハルシネーション対策まで。エンタープライズ要件に応えるAI運用体制を構築します。", features: ["アクセス制御", "監査ログ", "NDA / 機密管理", "ハルシネーション対策"] },
              { icon: "06", title: "社内 AI 活用研修", desc: "経営層・現場リーダー向けの研修プログラム。「AIで何ができるか」ではなく「自社にどう実装するか」を、ハンズオンで学ぶカリキュラムです。", features: ["経営層向けワークショップ", "現場リーダー研修", "ハンズオン実装", "継続的な運用伴走"] },
            ].map((s) => (
              <div key={s.title} className="solution-card">
                <div className="s-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <ul className="features">{s.features.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section stack-section">
        <div className="section-inner" style={{position: 'relative', zIndex: 2}}>
          <span className="section-label">Tech Stack</span>
          <h2 className="section-title" style={{color: '#fff'}}>使用している技術。</h2>
          <p className="section-lead" style={{color: 'rgba(255,255,255,0.75)'}}>エンタープライズで実運用できる技術スタック。お客様の既存システムに合わせて柔軟に選定します。</p>
          <div className="stack-grid">
            <div className="stack-category">
              <h3>LLM</h3>
              <ul>
                <li>Claude (Opus / Sonnet / Haiku)</li>
                <li>GPT-4o / o1</li>
                <li>Gemini</li>
                <li>Local LLM (Llama / Mistral)</li>
              </ul>
            </div>
            <div className="stack-category">
              <h3>Integration</h3>
              <ul>
                <li>Model Context Protocol (MCP)</li>
                <li>OpenAI Agent SDK</li>
                <li>LangChain / LangGraph</li>
                <li>Vercel AI SDK</li>
              </ul>
            </div>
            <div className="stack-category">
              <h3>Data / Cloud</h3>
              <ul>
                <li>Google Cloud / BigQuery</li>
                <li>AWS Bedrock</li>
                <li>Cloudflare Workers</li>
                <li>Supabase / Postgres</li>
              </ul>
            </div>
            <div className="stack-category">
              <h3>Workflow</h3>
              <ul>
                <li>Claude Code / Routines</li>
                <li>GitHub Actions</li>
                <li>Zapier / Make</li>
                <li>Slack / Gmail 連携</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section" style={{background: '#F9FAFB'}}>
        <div className="section-inner">
          <span className="section-label">Our Process</span>
          <h2 className="section-title">AI実装の進め方。</h2>
          <p className="section-lead">PoC → 本番稼働 → 継続改善の流れを、4つのフェーズで確実に進めます。</p>
          <div className="process-steps">
            {[
              { num: "1", phase: "Week 1-4", title: "現状診断・設計", desc: "業務フロー全体をマッピング。自動化すべき工程と人間が担うべき工程を分離。AI実装ロードマップを策定。" },
              { num: "2", phase: "Month 2-3", title: "PoC・プロトタイプ", desc: "最優先の業務領域でプロトタイプを構築。実際の業務データで検証し、精度・速度・ユーザー受容性を評価。" },
              { num: "3", phase: "Month 4-6", title: "本番実装・統合", desc: "既存システムとの統合、セキュリティ設計、権限管理を含む本番稼働。ユーザー研修と並行して段階展開。" },
              { num: "4", phase: "Month 7+", title: "継続改善・拡張", desc: "KPI計測、プロンプト改善、新たな業務への展開。AI組織として自走できる体制づくりを支援。" },
            ].map((s) => (
              <div key={s.num} className="process-step">
                <div className="process-num">{s.num}</div>
                <div className="phase">{s.phase}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cases */}
      {aiWorks.length > 0 && (
        <section className="section">
          <div className="section-inner">
            <span className="section-label">AI Case Studies</span>
            <h2 className="section-title">AI実装の成果。</h2>
            <p className="section-lead">実際のプロジェクトから。すべて匿名ですが、業種・数字で具体性を担保しています。</p>
            <div className="cases-grid">
              {aiWorks.map((w) => (
                <Link key={w.slug} href={`/works/${w.slug}`} style={{textDecoration: 'none', color: 'inherit'}}>
                  <div className="case-card">
                    <div className="case-header">
                      <span className="case-sector">{w.industry}</span>
                    </div>
                    <div className="case-title">{w.title}</div>
                    <div className="case-metrics">
                      {w.metric.slice(0, 2).map((m) => (
                        <div key={m.label}>
                          <div className="case-metric-label">{m.label}</div>
                          <div className={`case-metric-value ${m.value.startsWith('+') ? 'gain' : ''}`}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{fontSize: 12, color: '#4B5563', lineHeight: 1.7}}>{w.summary}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="section" style={{background: '#F9FAFB'}}>
        <div className="section-inner">
          <span className="section-label">FAQ</span>
          <h2 className="section-title">よくある質問。</h2>
          <div className="faq-list">
            {[
              { q: "AIの知識がない社員でも使えますか？", a: "はい、前提知識は不要です。業務フローに自然に組み込まれる設計を採用しており、ユーザーは「AIを使っている」ことを意識せずに業務を進められます。必要に応じて研修プログラムも提供します。" },
              { q: "社内の機密情報はどう扱いますか？", a: "エンタープライズ契約（学習データに利用されないプラン）を使用し、機密情報の取り扱いルールを事前に策定します。NDA締結後、お客様のセキュリティポリシーに準拠した設計を行います。" },
              { q: "既存のシステムやツールと連携できますか？", a: "はい。Google Workspace、Slack、各種CRM、会計ソフト、ERP等との連携実績があります。MCPプロトコルや既存APIを活用した統合設計を行います。" },
              { q: "どのくらいの期間・費用がかかりますか？", a: "スコープによりますが、PoC（概念検証）は1-2ヶ月、本番実装は3-6ヶ月が目安です。費用はプロジェクト規模によりますが、月額リテーナー¥50万〜からご相談いただけます。まずは初回無料相談でスコープを明確化しましょう。" },
            ].map((faq) => (
              <div key={faq.q} className="faq-item">
                <div className="faq-q">{faq.q}</div>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <h2>AI実装を、<br />今すぐ始めましょう。</h2>
          <p>まずは貴社の業務フローを聞かせてください。どこからAIを入れるべきか、60分で見えてきます。</p>
          <Link href="/contact" className="btn-primary">無料相談を申し込む →</Link>
        </div>
      </section>
    </>
  );
}
