import type { Metadata } from "next";
import Link from "next/link";
import { works, CASES_COMING_SOON } from "@/data/works";
import WorksList from "./WorksList";

const visibleWorks = CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden);

export const metadata: Metadata = {
  title: "Works — 数字で語る、実績ケース",
  description:
    "上場企業の経営管理から D2C のグロースまで、戦略・AI・マーケティングを横断したクライアントワーク。実績ケースは現在準備中で、匿名化のうえ順次公開していきます。",
  alternates: { canonical: "/works" },
};

const engagementAreas = [
  {
    label: "Strategy & FP&A",
    jp: "経営管理・財務戦略",
    items: [
      "上場企業の取締役会資料・月次定例",
      "予実管理・事業計画・KPI 設計",
      "投資判断・M&A デューデリジェンス",
      "IR・エクイティストーリー支援",
    ],
    scale: "上場企業（時価総額 100 億〜数兆円）",
  },
  {
    label: "AI & Organization",
    jp: "AI・組織設計",
    items: [
      "AI エージェント組織の設計・運用",
      "業務自動化（経理・レポート・分析）",
      "Claude / Gemini / OpenAI 統合基盤",
      "MCP・ノーコード連携の内製化",
    ],
    scale: "スタートアップ〜上場企業",
  },
  {
    label: "Marketing & Growth",
    jp: "マーケティング・グロース",
    items: [
      "Google Ads / Meta Ads 運用設計",
      "計測基盤（GTM / GA4）整備",
      "SEO・AIO・LLMO・構造化データ",
      "CVR 改善・LP / フォーム最適化",
    ],
    scale: "月予算 数百万〜数千万円",
  },
];

export default function WorksPage() {
  return (
    <>
      {/* ===== SUBHERO ===== */}
      <header className="subhero">
        <canvas
          className="hero-fx fxgen"
          data-count="60"
          data-interactive
          aria-hidden="true"
        />
        <div className="hero-orb o1" data-parallax="0.34" data-mouse="0.05" aria-hidden="true" />
        <div className="hero-orb o2" data-parallax="0.22" data-mouse="0.035" aria-hidden="true" />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap subhero-inner">
          <div className="crumb reveal">
            <Link href="/">Home</Link> / Works
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Case Studies
          </div>
          <h1 className="big-title-jp reveal">
            数字で語る、
            <br />
            <em>実績ケース</em>。
          </h1>
          <p className="subhero-lead reveal">
            上場企業の経営管理から D2C のグロースまで、戦略・AI・マーケティングを横断して関与してきました。実績ケースの一覧は現在準備中で、匿名化のうえ順次公開していきます。領域・規模・関与の深さは下記のとおりです。
          </p>
        </div>
      </header>

      {CASES_COMING_SOON ? (
        <section className="sec white">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="eyebrow dark">
                <i className="pulse" /> Engagement Areas · 主な関与領域
              </div>
              <h2 className="title">
                何をやってきたか、
                <br />
                <em>を先に</em>。
              </h2>
            </div>

            <div className="vgrid three">
              {engagementAreas.map((col) => (
                <article key={col.label} className="vcard reveal">
                  <div className="vn">{col.label}</div>
                  <h4>{col.jp}</h4>
                  <ul className="svc-list">
                    {col.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                  <p style={{ marginTop: 20 }}>対象規模：{col.scale}</p>
                </article>
              ))}
            </div>

            <div className="reveal" style={{ textAlign: "center", marginTop: 64 }}>
              <p className="lead-lg" style={{ maxWidth: 680, margin: "0 auto 32px" }}>
                個別ケースは現在準備中で、匿名化のうえ順次公開していきます。
                <br />
                類似案件の関与内容・成果はお気軽にご相談ください。
              </p>
              <Link href="/contact" className="btn btn-cyan magnetic">
                <span>課題を相談する</span>
                <i className="arr">↗</i>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <WorksList works={visibleWorks} />
      )}

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
            次の成功事例を、
            <br />
            <em>あなたと一緒に</em>。
          </h2>
          <p className="reveal">
            まずは課題をお聞かせください。60分の無料相談で、最適なアプローチをご提案します。
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
