import type { Metadata } from "next";
import Link from "next/link";
import SiteMotion from "@/components/SiteMotion";

export const metadata: Metadata = {
  title: "mixednuts — 戦略 × AI × マーケティング",
  description:
    "戦略 × AI × マーケティングを一気通貫で。AI-Firstコンサルティングで事業成長を再定義する mixednuts Inc.",
  alternates: { canonical: "/" },
};

// CSS custom property in an inline style (React needs the cast)
const img = (src: string) => ({ ["--img"]: `url(${src})` } as React.CSSProperties);

export default function HomePage() {
  return (
    <div className="mn-v4">
      {/* ===== NAV ===== */}
      <nav className="nav" id="nav">
        <Link href="/" className="nav-brand" aria-label="mixednuts Inc. — Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="nav-mark" width={13} height={36} />
          <span>
            mixednuts<span className="dim">Inc.</span>
          </span>
        </Link>
        <button className="nav-toggle" aria-label="Menu" type="button">
          <span />
          <span />
          <span />
        </button>
        <div className="nav-links">
          <Link href="/about">About</Link>
          <div className="nav-drop">
            <Link href="/services" className="nav-drop-t">
              Services <i>▾</i>
            </Link>
            <div className="nav-menu">
              <Link href="/services/ai">
                <strong>AI Solutions</strong>
                <span>AIエージェント・自動化</span>
              </Link>
              <Link href="/services/strategy">
                <strong>Strategy</strong>
                <span>事業戦略・FP&amp;A</span>
              </Link>
              <Link href="/services/marketing">
                <strong>Marketing</strong>
                <span>広告・グロース</span>
              </Link>
            </div>
          </div>
          <Link href="/works">Works</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/team">Team</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/login" className="nav-login">
            Login
          </Link>
          <Link href="/contact" className="nav-cta">
            <span>Contact</span>
            <i>→</i>
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header className="hero" id="top">
        <div className="hero-photo" data-parallax="0.22" data-mouse="0.018" aria-hidden="true" />
        <canvas className="hero-fx" id="fx" aria-hidden="true" />
        <div className="hero-grid" data-parallax="0.12" data-mouse="0.012" aria-hidden="true" />
        <div className="hero-orb o1" data-parallax="0.4" data-mouse="0.05" aria-hidden="true" />
        <div className="hero-orb o2" data-parallax="0.26" data-mouse="0.04" aria-hidden="true" />
        <div className="hero-orb o3" data-parallax="0.5" data-mouse="0.06" aria-hidden="true" />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />

        <div className="hero-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> AI-First Consulting · Est. 2021 · Tokyo
          </div>
          <h1 className="hero-h1">
            <span className="ln">
              <span className="up">RETHINK</span>
            </span>
            <span className="ln">
              <span className="up">
                GROWTH<em>.</em>
              </span>
            </span>
            <span className="ln">
              <span className="up grad">WITH AI</span>
            </span>
          </h1>
          <div className="hero-sub reveal">
            <div>
              <p className="hero-tagline">Strategy, AI &amp; Marketing — executed as one.</p>
              <p className="hero-lead">
                戦略・AI・マーケティングを3軸で、上場企業から新規事業まで一気通貫。分厚い報告書ではなく、明日から動けるアクションを届けます。
              </p>
            </div>
            <div className="hero-ctas">
              <Link href="/contact" className="btn btn-cyan magnetic">
                <span>Let&apos;s Talk</span>
                <i className="arr">↗</i>
              </Link>
              <Link href="/works" className="btn btn-ghost magnetic">
                <span>See Works</span>
              </Link>
            </div>
          </div>
          <div className="hero-stats reveal">
            <div className="hs">
              <div className="hsv" data-count="120" data-suffix="+">
                0
              </div>
              <div className="hsl">AI エージェント稼働中</div>
            </div>
            <div className="hs">
              <div className="hsv" data-count="30" data-suffix="+">
                0
              </div>
              <div className="hsl">累計クライアント</div>
            </div>
            <div className="hs">
              <div className="hsv" data-count="-70" data-suffix="%">
                0
              </div>
              <div className="hsl">業務時間削減の実例</div>
            </div>
          </div>
        </div>
        <div className="scrollcue">
          <span>Scroll</span>
          <i />
        </div>
      </header>

      {/* ===== MARQUEE ===== */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-run">
          <span>
            Strategy<b />
            <em>ai</em>
            <b />
            Marketing<b />
            Strategy<b />
            <em>ai</em>
            <b />
            Marketing<b />
          </span>
          <span>
            Strategy<b />
            <em>ai</em>
            <b />
            Marketing<b />
            Strategy<b />
            <em>ai</em>
            <b />
            Marketing<b />
          </span>
        </div>
      </div>

      {/* ===== CAPABILITIES ===== */}
      <section className="cap" id="capabilities">
        <div className="wrap">
          <div className="cap-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> What We Do
            </div>
            <h2 className="title reveal">
              Three forces.
              <br />
              <em>one</em> growth engine.
            </h2>
          </div>
          <div className="cap-grid">
            <Link href="/services" className="cap-card reveal">
              <div className="cap-num">01 / STRATEGY</div>
              <h3>Strategy</h3>
              <span className="cap-jp">戦略コンサルティング</span>
              <p>
                事業戦略、新規事業、M&amp;A、経営管理まで。&ldquo;分厚い報告書&rdquo;ではなく、明日からの行動に変えるロードマップ。AIで仮説検証を加速し、意思決定を数日で回します。
              </p>
              <span className="cap-link">
                Explore Strategy <i>→</i>
              </span>
            </Link>
            <Link href="/services" className="cap-card feature reveal">
              <div className="cap-num">02 / AI — MOST REQUESTED</div>
              <h3>
                AI<em>.</em>
              </h3>
              <span className="cap-jp">AI 実装支援</span>
              <p>
                エージェント設計、LLM業務実装、プロンプトエンジニアリング。私たち自身が120体超のAIと働くAI-first組織。その知見を貴社の業務に実装します。
              </p>
              <span className="cap-link">
                Explore AI <i>→</i>
              </span>
            </Link>
            <Link href="/services" className="cap-card reveal">
              <div className="cap-num">03 / MARKETING</div>
              <h3>Growth</h3>
              <span className="cap-jp">マーケティング成長支援</span>
              <p>
                広告運用、CVR改善、SEO/AIO、SNS。評論家ではなく、現場の最前線で実行。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ再現性のある成長。
              </p>
              <span className="cap-link">
                Explore Marketing <i>→</i>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MANIFESTO ===== */}
      <section className="manifesto" id="manifesto">
        <div className="mani-bg" data-parallax="0.2" aria-hidden="true" />
        <div className="mani-glow" aria-hidden="true" />
        <div className="wrap mani-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Manifesto
          </div>
          <p className="mani-text">
            <span className="reveal">戦略だけでは、遅い。</span>
            <span className="reveal">AIだけでは、浅い。</span>
            <span className="reveal">マーケだけでは、一過性。</span>
            <span className="reveal big">
              3つが <em>&ldquo;ミックス&rdquo;</em> して初めて、
              <br />
              事業は再現性のある成長曲線を描きはじめる。
            </span>
          </p>
          <div className="mani-sig reveal">
            <span>— mixednuts Inc.</span>
            <span>Since 2021 · Tokyo</span>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="stats" id="stats">
        <div className="wrap">
          <div className="stats-head reveal">
            <h2 className="title">
              By <em>the</em> Numbers
            </h2>
            <p>AI-first 組織の、数字で見るケイパビリティ。</p>
          </div>
          <div className="stats-grid">
            <div className="stat reveal">
              <div className="stat-num" data-count="120" data-suffix="+">
                0
              </div>
              <div className="stat-label">社内 AI エージェント稼働中</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num" data-count="30" data-suffix="+">
                0
              </div>
              <div className="stat-label">累計支援クライアント</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num" data-count="40" data-suffix="+">
                0
              </div>
              <div className="stat-label">業務プロセス自動化</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num" data-count="-70" data-suffix="%">
                0
              </div>
              <div className="stat-label">業務時間削減の実例</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WORKS ===== */}
      <section className="works" id="works">
        <div className="wrap">
          <div className="works-head">
            <div>
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Selected Works
              </div>
              <h2 className="title reveal">
                Selected
                <br />
                <em>works</em>.
              </h2>
            </div>
            <Link href="/works" className="btn btn-dark magnetic reveal">
              <span>All Works</span>
              <i className="arr">↗</i>
            </Link>
          </div>
          <div className="works-grid">
            <Link href="/works" className="work big reveal" style={img("/brand/strategy_hero.jpg")}>
              <div className="work-shade" />
              <div className="work-body">
                <div className="work-top">
                  <span className="chip">Strategy × Marketing</span>
                  <span className="work-meta">Fitness · 18 months</span>
                </div>
                <div className="work-foot">
                  <h3>大手フィットネス、新事業を 18ヶ月でローンチ。</h3>
                  <div className="work-nums">
                    <div>
                      <span className="wl">年間マーケ予算</span>
                      <span className="wv">50億円</span>
                    </div>
                    <div>
                      <span className="wl">業態</span>
                      <span className="wv">新業態ゼロイチ</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works" className="work reveal" style={img("/brand/ai_hero.jpg")}>
              <div className="work-shade ai" />
              <div className="work-body">
                <div className="work-top">
                  <span className="chip">AI × Strategy</span>
                  <span className="work-meta">Internal</span>
                </div>
                <div className="work-foot">
                  <h3>90体超の AI エージェント組織。</h3>
                  <div className="work-nums">
                    <div>
                      <span className="wl">エージェント数</span>
                      <span className="wv">90体超</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works" className="work reveal" style={img("/brand/marketing_hero.jpg")}>
              <div className="work-shade mk" />
              <div className="work-body">
                <div className="work-top">
                  <span className="chip">Marketing × Strategy</span>
                  <span className="work-meta">Banking · 1.5y</span>
                </div>
                <div className="work-foot">
                  <h3>銀行ローン、審査通過率の改善。</h3>
                  <div className="work-nums">
                    <div>
                      <span className="wl">有効契約率</span>
                      <span className="wv">+18%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/works" className="work wide reveal" style={img("/brand/strategy_hero.jpg")}>
              <div className="work-shade" />
              <div className="work-body">
                <div className="work-top">
                  <span className="chip">Strategy × Marketing × AI</span>
                  <span className="work-meta">Insurance · Ongoing</span>
                </div>
                <div className="work-foot">
                  <h3>新規デジタル事業、CMO 代行。</h3>
                  <div className="work-nums">
                    <div>
                      <span className="wl">リード目標</span>
                      <span className="wv">+40% 超過</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta" id="contact">
        <div className="cta-photo" data-parallax="0.16" aria-hidden="true" />
        <canvas className="cta-fx" id="fx2" aria-hidden="true" />
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Let&apos;s build together
          </div>
          <h2 className="cta-h reveal">
            LET&apos;S BUILD
            <br />
            <em>growth.</em>
          </h2>
          <p className="reveal">
            60分の無料相談で、貴社の事業に適したアプローチを共に設計しませんか。
          </p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>無料相談を申し込む</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.png" alt="mixednuts Inc." className="footer-mark" width={210} height={40} />
            <p>
              戦略 × AI × マーケティング。
              <br />
              3つの力で成長エンジンをつくる。
            </p>
            <p className="addr">ミックスナッツ株式会社 · mixednuts Inc.</p>
          </div>
          <div className="footer-col">
            <h5>Services</h5>
            <Link href="/services/ai">AI Solutions</Link>
            <Link href="/services/strategy">Strategy</Link>
            <Link href="/services/marketing">Marketing</Link>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <Link href="/about">About</Link>
            <Link href="/team">Team</Link>
            <Link href="/careers">Careers</Link>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <Link href="/works">Works</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="footer-col">
            <h5>Legal</h5>
            <Link href="/privacy">プライバシー</Link>
            <Link href="/legal">利用規約</Link>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© 2021–2026 mixednuts Inc. All rights reserved.</span>
          <span>Tokyo, Japan</span>
        </div>
      </footer>

      <SiteMotion />
    </div>
  );
}
