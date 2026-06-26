import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — 才能が「ミックス」する瞬間、事業は動き始める",
  description:
    "戦略・AI・マーケティングを一気通貫で提供するAI-firstファーム。多様なバックグラウンドのプロフェッショナルが集結。",
  alternates: { canonical: "/about" },
};

// CSS custom property in an inline style (React needs the cast)
const img = (src: string) => ({ ["--img"]: `url(${src})` } as React.CSSProperties);

const VALUES = [
  {
    num: "01",
    title: "Mix, Don't Divide",
    desc: "領域を分断しない。戦略・AI・マーケを断絶させず、3つが常に連動する設計で仕事を組み立てる。",
  },
  {
    num: "02",
    title: "On the Ground",
    desc: "評論家にならない。現場の最前線に飛び込み、実装・運用・改善までハンズオンで伴走する。",
  },
  {
    num: "03",
    title: "Data-Driven",
    desc: "勘と経験で語らない。意思決定の全段階でデータを起点にし、AIで仮説検証を高速化する。",
  },
  {
    num: "04",
    title: "Calibrated Honesty",
    desc: "ドラマ化しない。異常値を見たらまず実害を計算し、断定せず、仮説と事実を分離して報告する。",
  },
  {
    num: "05",
    title: "AI-First, Human-Led",
    desc: "AIに任せる領域と人間が握る領域を意図的に設計する。AI導入で終わらせず、AIと共に働く組織をつくる。",
  },
];

const BACKGROUNDS = [
  "国内大手広告代理店",
  "事業会社マーケ責任者",
  "戦略コンサルティングファーム",
  "外資系ビッグテック",
  "AI / MLエンジニア",
  "SNS クリエイター",
  "財務・経営企画",
];

export default function AboutPage() {
  return (
    <>
      {/* ===== SUB HERO ===== */}
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
            <Link href="/">Home</Link> / About
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> About mixednuts Inc.
          </div>
          <h1 className="big-title-jp reveal">
            才能が&quot;<em>ミックス</em>&quot;する瞬間、
            <br />
            事業は動き始める。
          </h1>
          <p className="subhero-lead reveal">
            異なる業界・異なる役職を渡り歩いてきたプロが、一つのチームに集まっています。その多様性が、単一専門ファームには出せない角度で、課題を解く強さになります。
          </p>
          <div className="subhero-meta reveal">
            <div>
              <div className="k">2021</div>
              <div className="l">Founded</div>
            </div>
            <div>
              <div className="k">Tokyo</div>
              <div className="l">Japan</div>
            </div>
            <div>
              <div className="k">AI-First</div>
              <div className="l">Operating Model</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MISSION ===== */}
      <section className="sec white">
        <div className="wrap twocol">
          <div className="reveal">
            <div className="eyebrow dark">
              <i className="pulse" /> Mission
            </div>
            <p className="lead-lg" style={{ margin: "18px 0 28px" }}>
              &quot;ミックス&quot;で、事業の未来に必然性を。
            </p>
            <p>
              私たちは、異なる領域のプロフェッショナルを &quot;ミックス&quot;
              することで、単一の視座では生まれ得ない事業価値を創り出します。戦略は現場に届かなければ絵に描いた餅。AIは業務に溶け込まなければただのツール。マーケは戦略なしには一過性。
            </p>
            <p>
              3つを断絶させず、有機的に繋ぐ仕組みを、クライアントの事業に実装する。それが私たちのミッションです。
            </p>
          </div>
          <div className="media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/strategy_hero.jpg" alt="" />
          </div>
        </div>
      </section>

      {/* ===== VISION ===== */}
      <section className="sec">
        <div className="wrap twocol">
          <div className="media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/ai_hero.jpg" alt="" />
          </div>
          <div className="reveal">
            <div className="eyebrow dark">
              <i className="pulse" /> Vision
            </div>
            <p className="lead-lg" style={{ margin: "18px 0 28px" }}>
              日本の事業成長に、&quot;再現性&quot;を持ち込む。
            </p>
            <p>
              たまたま成功した、ではなく、意図して成功させる。勘と経験ではなく、データとAIで。個人の能力依存ではなく、組織の仕組みで。
            </p>
            <p>
              私たちは、事業成長を科学する会社です。AI-firstのコンサルティングファームとして、日本企業の
              &quot;勝ち筋&quot;
              を再現可能にする。この営みを通じて、国内事業の競争力そのものを底上げしていきます。
            </p>
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Our Values
            </div>
            <h2 className="title reveal">
              私たちの<em>行動原則</em>。
            </h2>
          </div>
          <p className="lead-lg reveal" style={{ marginBottom: 56 }}>
            多様な人材が同じ方向を向くための、5つの指針。日々の判断と振る舞いの中に、これらを埋め込んでいます。
          </p>
          <div className="vgrid three">
            {VALUES.map((v) => (
              <div key={v.num} className="vcard reveal">
                <div className="vn">{v.num}</div>
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TEAM / PEOPLE ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Our People
            </div>
            <h2 className="title reveal">
              多様な才能の&quot;<em>ミックス</em>&quot;。
            </h2>
          </div>
          <p className="lead-lg reveal" style={{ marginBottom: 40 }}>
            ミックスナッツの強みは、単一のバックグラウンドに依存しないこと。異なる業界・異なる役職を経験してきたプロフェッショナルが、一つのプロジェクトで視座を重ねます。
          </p>

          <div className="twocol reveal" style={{ marginBottom: 56 }}>
            <div
              className="media"
              style={img("/brand/team_diverse.jpg")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/team_diverse.jpg" alt="mixednuts team" />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-serif-jp)",
                  fontSize: 26,
                  lineHeight: 1.45,
                  color: "#0A0A0A",
                  marginBottom: 20,
                  fontWeight: 700,
                }}
              >
                広告・マーケ・戦略・ビッグテック・クリエイター。
                <br />
                異なるバックグラウンドが、一つのファームに集結。
              </h3>
              <p>
                大手広告代理店でアカウントを動かしてきたマーケター、事業会社のマーケ責任者として現場を率いてきたリーダー、戦略ファーム出身のコンサルタント、外資系ビッグテックでプロダクトを作ってきたエンジニア、SNSで実績を出してきたクリエイター。それぞれの領域で磨いた専門性を、ひとつのチームで掛け合わせます。
              </p>
            </div>
          </div>

          <div className="bg-grid reveal">
            {BACKGROUNDS.map((tag) => (
              <div key={tag} className="bg-card">
                <p>{tag}</p>
              </div>
            ))}
          </div>

          {/* CEO Highlight */}
          <div className="lead-card reveal" style={{ marginTop: 56 }}>
            <div className="avatar" aria-hidden="true">
              N.I.
            </div>
            <div>
              <h3>
                石井 希実{" "}
                <span
                  style={{
                    fontFamily: "var(--font-sans-en)",
                    color: "rgba(255,255,255,.5)",
                    fontSize: 18,
                    fontWeight: 400,
                  }}
                >
                  Nozomi Ishii
                </span>
              </h3>
              <div className="role">CEO / Founder</div>
              <p>
                国内大手デジタル広告代理店でアカウントプランナーを務めた後、グローバル大手IT企業で広告事業のアカウントストラテジスト（年間40億円超のポートフォリオ運用）。その後、国内大手IT企業の経営企画に転じ、300億円規模のエンタメ領域の事業管理を統括。事業計画・投資評価・中期戦略まで、経営判断の中枢で意思決定を支援。
              </p>
              <p>
                2021年、ミックスナッツ株式会社を創業。AI-firstファームを率い、戦略・AI・マーケティングの統合提供を牽引。早稲田大学大学院経営管理研究科（MBA）修了。
              </p>
              <div className="path">
                <Link href="/team/ceo" className="btn btn-dark magnetic">
                  <span>詳細プロフィールを見る</span>
                  <i className="arr">↗</i>
                </Link>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 56 }}>
            <Link href="/team" className="btn btn-dark magnetic reveal">
              <span>メンバー一覧を見る</span>
              <i className="arr">↗</i>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== COMPANY INFO ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Company Information
            </div>
            <h2 className="title reveal">
              会社<em>概要</em>。
            </h2>
          </div>
          <div className="contact-grid">
            <div className="info-card reveal">
              <div className="row">
                <div className="l">Name</div>
                <div className="v">
                  ミックスナッツ株式会社
                  <br />
                  (mixednuts Inc.)
                </div>
              </div>
              <div className="row">
                <div className="l">Founded</div>
                <div className="v">2021年4月19日</div>
              </div>
              <div className="row">
                <div className="l">CEO</div>
                <div className="v">石井 希実</div>
              </div>
              <div className="row">
                <div className="l">Business</div>
                <div className="v">
                  戦略コンサルティング事業
                  <br />
                  AI実装支援事業
                  <br />
                  マーケティング成長支援事業
                </div>
              </div>
            </div>
            <div className="info-card reveal">
              <div className="row">
                <div className="l">Address</div>
                <div className="v">
                  〒107-0062
                  <br />
                  東京都港区南青山3-8-40
                </div>
              </div>
              <div className="row">
                <div className="l">Contact</div>
                <div className="v cy">
                  <a href="mailto:hello@mixednuts-inc.com">
                    hello@mixednuts-inc.com
                  </a>
                </div>
              </div>
              <div className="row">
                <div className="l">Bank</div>
                <div className="v">
                  三井住友銀行
                  <br />
                  三菱UFJ銀行
                </div>
              </div>
              <div className="row">
                <div className="l">Legal Advisor</div>
                <div className="v">弁護士法人クレア法律事務所</div>
              </div>
              <div className="row">
                <div className="l">Tax Advisor</div>
                <div className="v">関野会計事務所</div>
              </div>
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
            一緒に、事業の次の章を
            <br />
            <em>書き始めませんか。</em>
          </h2>
          <p className="reveal" style={{ wordBreak: "keep-all", overflowWrap: "break-word" }}>
            60 分で貴社の課題を聞き、最適なアプローチを提案します。
          </p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>初回 60 分、無料でヒアリングする</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
