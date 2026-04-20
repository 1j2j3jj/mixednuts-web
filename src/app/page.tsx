import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Section from "@/components/Section";
import Marquee from "@/components/Marquee";

export const metadata: Metadata = {
  title: "mixednuts — Strategy × AI × Marketing",
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
};

export default function HomePage() {
  return (
    <>
      <PageHero
        eyebrow="AI-FIRST CONSULTING · EST. 2024"
        title={
          <>
            Rethink<br />
            growth<span className="em">.</span><br />
            with <span className="em">AI.</span>
          </>
        }
        sub="広告代理店、事業会社マーケ責任者、戦略コンサル、外資系ビッグテック、SNSクリエイター——多様なバックグラウンドが&quot;ミックス&quot;するプロフェッショナル集団が、大手企業から新規事業まで、戦略・AI・マーケを一気通貫で支援。"
        primary={{ label: "Let's Talk", href: "/contact" }}
        ghost={{ label: "See Works", href: "/works" }}
      />

      <Marquee />

      {/* Capabilities */}
      <Section
        tone="bg"
        eyebrow="What We Do"
        title={<>Three forces. <span className="em">one</span> growth engine.</>}
        lead="戦略・AI・マーケティングの3領域を断絶させず、一つのファームに束ねる。分厚い報告書ではなく、明日からの行動に変換する実装支援を提供します。"
      >
        <div className="grid-3" style={{ marginTop: 32 }}>
          <Link href="/services/strategy" className="cap-item-v4">
            <div className="num">01 · Strategy</div>
            <h3>Strategy<span className="em">.</span></h3>
            <span className="jp">戦略コンサルティング</span>
            <p>事業戦略、新規事業、M&amp;A、経営管理まで。AIで仮説検証を加速し、意思決定を数日で回します。</p>
            <span className="link">Explore</span>
          </Link>
          <Link href="/services/ai" className="cap-item-v4">
            <div className="num">02 · AI — Most Requested</div>
            <h3>AI<span className="em">.</span></h3>
            <span className="jp">AI 実装支援</span>
            <p>エージェント設計、LLM業務実装、プロンプトエンジニアリング。自社120体超のAIで磨いた知見を、貴社の業務に実装します。</p>
            <span className="link">Explore</span>
          </Link>
          <Link href="/services/marketing" className="cap-item-v4">
            <div className="num">03 · Growth</div>
            <h3>Growth<span className="em">.</span></h3>
            <span className="jp">マーケティング成長支援</span>
            <p>広告運用、CVR改善、SEO/AIO、SNS。評論家ではなく、現場の最前線で実行。AIで再現性のある成長を設計。</p>
            <span className="link">Explore</span>
          </Link>
        </div>
      </Section>

      {/* Manifesto */}
      <Section tone="ink">
        <div style={{ maxWidth: 1200 }}>
          <div className="eyebrow" style={{ color: "var(--accent)" }}>— Manifesto</div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(32px, 4.2vw, 64px)",
              lineHeight: 1.3,
              letterSpacing: "-0.015em",
              margin: "16px 0 0 0",
              color: "var(--bg)",
            }}
          >
            戦略だけでは遅い。<br />
            AIだけでは浅い。<br />
            マーケだけでは一過性。<br />
            <br />
            3つが <span style={{ fontStyle: "italic", color: "var(--accent)" }}>&quot;ミックス&quot;</span> して初めて、<br />
            事業は再現性のある成長曲線を描きはじめる。
          </p>
          <div
            style={{
              marginTop: 72,
              paddingTop: 32,
              borderTop: "1px solid rgba(250,250,247,0.15)",
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(250,250,247,0.5)",
            }}
          >
            <span>— mixednuts, Inc.</span>
            <span>Since 2024 · Tokyo</span>
          </div>
        </div>
      </Section>

      {/* Stats */}
      <Section
        tone="paper"
        eyebrow="By the numbers"
        title={<>AI-first 組織の、<span className="em">数字</span>で見るケイパビリティ。</>}
      >
        <div className="stats-grid-v4" style={{ marginTop: 24 }}>
          <div className="stat">
            <div className="num">120<span className="unit">+</span></div>
            <div className="label">社内 AI エージェント稼働中</div>
          </div>
          <div className="stat">
            <div className="num">30<span className="unit">+</span></div>
            <div className="label">累計支援クライアント</div>
          </div>
          <div className="stat">
            <div className="num">40<span className="unit">+</span></div>
            <div className="label">業務プロセス自動化</div>
          </div>
          <div className="stat">
            <div className="num">−70<span className="unit">%</span></div>
            <div className="label">業務時間削減の実例</div>
          </div>
        </div>
      </Section>

      {/* Cases */}
      <Section
        tone="bg"
        eyebrow="Selected works"
        title={<>Selected <span className="em">works</span>.</>}
      >
        <div className="cases-grid-v4" style={{ marginTop: 24 }}>
          <Link href="/works/fpna-ai-automation" className="case-v4 big">
            <div className="case-bg" style={{ background: "linear-gradient(135deg, rgba(255,91,31,0.5), rgba(17,17,17,0.9)), url('/images/generated/ai_hero.png') center/cover" }} />
            <div className="case-inner">
              <div className="case-top">
                <span className="case-tag">AI × Strategy</span>
                <span className="case-meta">Entertainment · 12 months</span>
              </div>
              <div>
                <h3>FP&amp;A × AI 自動化で、経営管理の意思決定を高速化。</h3>
                <div className="case-nums">
                  <div className="case-num"><div className="label">月次締め工数</div><div className="value">−70%</div></div>
                  <div className="case-num"><div className="label">予実精度</div><div className="value">+25pt</div></div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/works/ads-campaign-restructure" className="case-v4 med">
            <div className="case-bg" style={{ background: "linear-gradient(135deg, rgba(240,238,230,0.3), rgba(17,17,17,0.95)), url('/images/generated/strategy_hero.png') center/cover" }} />
            <div className="case-inner">
              <div className="case-top">
                <span className="case-tag">Marketing × Strategy</span>
                <span className="case-meta">D2C · Ongoing</span>
              </div>
              <div>
                <h3>広告運用再構築で ROAS 170% 改善。</h3>
                <div className="case-nums">
                  <div className="case-num"><div className="label">ROAS</div><div className="value">+170%</div></div>
                  <div className="case-num"><div className="label">CPA</div><div className="value">−45%</div></div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/works/saas-growth-playbook" className="case-v4 sm">
            <div className="case-bg" style={{ background: "linear-gradient(135deg, rgba(255,91,31,0.3), rgba(17,17,17,0.95)), url('/images/generated/marketing_hero.png') center/cover" }} />
            <div className="case-inner">
              <div className="case-top">
                <span className="case-tag">Marketing</span>
                <span className="case-meta">SaaS · 6mo</span>
              </div>
              <div>
                <h3>B2B SaaS のグロースプレイブック策定。</h3>
                <div className="case-nums">
                  <div className="case-num"><div className="label">MQL</div><div className="value">+3.2x</div></div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/works/tiktok-campaign" className="case-v4 sm">
            <div className="case-bg" style={{ background: "linear-gradient(135deg, rgba(255,91,31,0.35), rgba(17,17,17,0.95)), url('/images/generated/ai_hero.png') center/cover" }} />
            <div className="case-inner">
              <div className="case-top">
                <span className="case-tag">AI × Marketing</span>
                <span className="case-meta">EC · 3mo</span>
              </div>
              <div>
                <h3>TikTok × AI クリエイティブで CPA 60% 改善。</h3>
                <div className="case-nums">
                  <div className="case-num"><div className="label">CPA</div><div className="value">−60%</div></div>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/works/ai-first-org-design" className="case-v4 sm">
            <div className="case-bg" style={{ background: "linear-gradient(135deg, rgba(240,238,230,0.25), rgba(17,17,17,0.95)), url('/images/generated/strategy_hero.png') center/cover" }} />
            <div className="case-inner">
              <div className="case-top">
                <span className="case-tag">Strategy × AI</span>
                <span className="case-meta">Manufacturing · 8mo</span>
              </div>
              <div>
                <h3>AI-First 組織設計コンサルティング。</h3>
                <div className="case-nums">
                  <div className="case-num"><div className="label">工数削減</div><div className="value">−12Kh/年</div></div>
                </div>
              </div>
            </div>
          </Link>
        </div>
        <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
          <Link href="/works" className="btn-ink ghost">All Works →</Link>
        </div>
      </Section>

      {/* CTA Big */}
      <section className="cta-big-v4">
        <div className="cta-big-v4-inner">
          <h2>
            Let&apos;s build<br />
            <span className="em">growth</span>.
          </h2>
          <p>60分の無料相談で、貴社の事業に適したアプローチを共に設計しませんか。</p>
          <Link href="/contact" className="btn-ink primary">
            Start the Conversation
            <span className="arrow">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
