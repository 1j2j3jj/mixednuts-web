import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Strategy — 事業計画・投資評価・中期戦略",
  description: "戦略ファーム出身者と事業会社経営企画経験者が、経営判断の中枢で意思決定を支援。FP&A、M&A、新規事業、組織設計まで一気通貫。",
  alternates: { canonical: "/services/strategy" },
};

const strategyWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden && w.services.includes("strategy")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/strategy#service",
  name: "Strategy Consulting",
  serviceType: "Strategy / FP&A / M&A",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description:
    "中期経営計画、FP&A/予実管理、M&A戦略・デューデリジェンス、新規事業立上げ、取締役会付議支援まで統合提供。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/strategy",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Strategy", path: "/services/strategy" },
]);

const serviceMenu = [
  { num: "01", title: "中期経営計画・事業戦略", desc: "3-5年の中期経営計画策定から単年度事業計画まで。市場分析、競合マッピング、ポジショニング設計、成長ドライバーの特定まで、数字に落としたロードマップを作ります。" },
  { num: "02", title: "FP&A / 予実管理設計", desc: "財務計画・予実分析の仕組みを設計・構築します。月次締め、取締役会付議、KPI設計、AIを使った自動化まで。CFO機能を外部から提供します。" },
  { num: "03", title: "M&A 戦略・デューデリジェンス", desc: "買収候補の発掘から財務DD、法務DD連携、バリュエーション（DCF・マルチプル）、意思決定支援まで。PEファンド・投資銀行出身メンバーが主導します。" },
  { num: "04", title: "投資評価・バリュエーション", desc: "DCF、コンパラブル分析、フットボールチャート、シナリオ感応度分析。投資判断の根拠を多角的に構築します。上場・未上場の双方に対応。" },
  { num: "05", title: "新規事業立ち上げ支援", desc: "ICP定義、仮説検証設計、MVP策定、Gate Review、ピボット判断まで。PMF達成後の本格投入準備まで伴走します。AI活用でリサーチ工程を大幅短縮。" },
  { num: "06", title: "組織設計・PMO", desc: "事業の成長フェーズに合わせた組織設計、KPI体系の再構築、プロジェクト管理体制の整備。複数部門の横串調整も担います。" },
];

const teamProfiles = [
  { initial: "N.I.", role: "Founder & CEO", bg: "戦略コンサルティング → 大手IT企業 経営企画・FP&A → 投資", bio: "国内大手IT企業の経営企画責任者として取締役会付議・中期戦略を統括。mixednuts創業後は戦略×AI×マーケの統合提供を牽引。早稲田大学院MBA。" },
  { initial: "K.T.", role: "Head of Strategy", bg: "外資系戦略コンサルファーム出身", bio: "外資系戦略ファームで通信・メディア・ヘルスケア業界の中期戦略立案をリード。M&A PMI、新規事業立ち上げ、組織変革の経験多数。" },
  { initial: "Y.M.", role: "Principal, M&A / Investment", bg: "BIG4 会計事務所出身", bio: "BIG4 会計事務所の FAS / M&A アドバイザリー部門で財務DD・バリュエーション・PMI を多数経験。DCF・フットボールチャート・感応度分析を実務水準で運用。" },
];

export default function ServiceStrategyPage() {
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
            <Link href="/">Home</Link> / <Link href="/services">Services</Link> / Strategy
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Strategy Consulting
          </div>
          <h1 className="big-title-jp reveal">
            意思決定の質を、
            <br />
            <em>数倍に引き上げる</em>。
          </h1>
          <p className="subhero-lead reveal" style={{ marginTop: 18 }}>
            事業戦略、新規事業、M&amp;A、経営管理まで。&ldquo;分厚い報告書&rdquo;ではなく、明日からの行動に変換するロードマップ。戦略ファーム出身者と事業会社経営企画経験者が、経営判断の中枢に入り込みます。
          </p>
          <div className="subhero-meta reveal">
            <div>
              <div className="k">15+</div>
              <div className="l">戦略支援実績</div>
            </div>
            <div>
              <div className="k">5+</div>
              <div className="l">M&amp;A案件サポート</div>
            </div>
            <div>
              <div className="k">10+</div>
              <div className="l">新規事業立ち上げ</div>
            </div>
            <div>
              <div className="k">MBA</div>
              <div className="l">早稲田 / 外資系ファーム出身</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== INTRO LINE ===== */}
      <section className="sec white">
        <div className="wrap">
          <p className="lead-lg reveal" style={{ maxWidth: 880 }}>
            経営判断の全段階で、データと<em>AI</em>を使った意思決定支援を提供します。
          </p>
        </div>
      </section>

      {/* ===== SERVICE MENU ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> What We Offer
            </div>
            <h2 className="title reveal">戦略コンサルティングの6領域。</h2>
          </div>
          <div className="vgrid three">
            {serviceMenu.map((s) => (
              <div key={s.num} className="vcard reveal">
                <div className="vn">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TEAM — hidden until profiles are finalized ===== */}
      {false && (
        <section className="sec white">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Strategy Team
              </div>
              <h2 className="title reveal">戦略チームを紹介。</h2>
            </div>
            <p className="lead-lg reveal" style={{ maxWidth: 880 }}>
              外資系戦略ファーム・投資銀行・事業会社経営企画出身のプロフェッショナルが揃っています。
            </p>
            <div className="team-grid">
              {teamProfiles.map((m) => (
                <div key={m.initial} className="tm reveal">
                  <div className="avatar">{m.initial}</div>
                  <h4>{m.initial}</h4>
                  <div className="tm-cap">{m.role}</div>
                  <p>{m.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== CASES ===== */}
      {strategyWorks.length > 0 && (
        <section className="sec white">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Case Studies
              </div>
              <h2 className="title reveal">戦略支援の<em>実績</em>。</h2>
            </div>
            <div className="vgrid three">
              {strategyWorks.map((w) => (
                <Link key={w.slug} href={`/works/${w.slug}`} className="vcard reveal">
                  <span className="chip">{w.industry}</span>
                  <h4 style={{ marginTop: 14 }}>{w.title}</h4>
                  <div className="work-nums" style={{ marginTop: 16 }}>
                    {w.metric.slice(0, 2).map((m) => (
                      <div key={m.label}>
                        <span className="wl">{m.label}</span>
                        <span className="wv">{m.value}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: 16 }}>{w.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== PROCESS ===== */}
      <section className="sec" style={{ background: "#0A0A0A" }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow reveal">
              <i className="pulse" /> How We Work
            </div>
            <h2 className="title reveal" style={{ color: "#fff" }}>
              進め方。
            </h2>
          </div>
          <div className="proc">
            <div className="proc-step reveal">
              <div className="proc-n">01</div>
              <h4>現状分析</h4>
              <p>事業・組織・データを横断で把握。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">02</div>
              <h4>戦略設計</h4>
              <p>優先順位とKPIを合意し、道筋を描く。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">03</div>
              <h4>実行支援</h4>
              <p>評論ではなく、現場の最前線で動く。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">04</div>
              <h4>モニタリング</h4>
              <p>データで検証し、高速に改善。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta" id="contact">
        <div className="cta-photo" data-parallax="0.16" aria-hidden="true" />
        <canvas className="cta-fx fxgen" data-count="46" aria-hidden="true" />
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s build together
          </div>
          <h2 className="cta-h reveal">
            経営判断を、
            <br />
            <em>確信を持って。</em>
          </h2>
          <p className="reveal">
            初回無料相談（60分）で、貴社の経営課題をヒアリングします。まずは話すことから始めましょう。
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
