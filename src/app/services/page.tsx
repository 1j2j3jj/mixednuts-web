import type { Metadata } from "next";
import Link from "next/link";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Services — Strategy × AI × Marketing",
  description: "戦略コンサルティング・AI実装支援・マーケティング成長支援の3軸を一気通貫で提供。",
  alternates: { canonical: "/services" },
};

// Per-slug presentation: pillar number label + brand hero image.
const pillarMeta: Record<
  (typeof services)[number]["slug"],
  { num: string; tag: string; img: string }
> = {
  ai: { num: "02", tag: "AI — MOST REQUESTED", img: "/brand/ai_hero.jpg" },
  strategy: { num: "01", tag: "STRATEGY", img: "/brand/strategy_hero.jpg" },
  marketing: { num: "03", tag: "MARKETING", img: "/brand/marketing_hero.jpg" },
};

// Render strategy first, then AI, then marketing to mirror the 01/02/03 ordering.
const pillarOrder: (typeof services)[number]["slug"][] = ["strategy", "ai", "marketing"];

const orderedServices = pillarOrder
  .map((slug) => services.find((s) => s.slug === slug))
  .filter((s): s is (typeof services)[number] => Boolean(s));

export default function ServicesPage() {
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
            <Link href="/">Home</Link> / Services
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Our Services
          </div>
          <h1 className="big-title-jp reveal">
            3つの専門性を、
            <br />
            <em>1つのチームで</em>。
          </h1>
          <p className="subhero-lead reveal">
            戦略コンサルティング、AI実装支援、グロースマーケティング。多くのファームが「どれか一つ」しか提供できない領域を、私たちは統合して届けます。断絶させず、有機的に繋ぐのが
            mixednuts の強みです。
          </p>
        </div>
      </header>

      {/* ===== THREE PILLARS ===== */}
      <section className="sec white">
        <div className="wrap">
          <p className="lead-lg reveal" style={{ maxWidth: "880px" }}>
            &ldquo;考える&rdquo;と&ldquo;実装する&rdquo;と&ldquo;伸ばす&rdquo;を、ひとつのチームで。だから速く、深く、続く。
          </p>

          {orderedServices.map((service) => {
            const meta = pillarMeta[service.slug];
            return (
              <div key={service.slug} className="pillar reveal">
                <div className="pillar-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={meta.img} alt={service.label} />
                </div>
                <div>
                  <div className="pillar-num">
                    {meta.num} / {meta.tag}
                  </div>
                  <h3>{service.label}</h3>
                  <div className="jp">{service.tagline}</div>
                  <p>{service.description}</p>
                  <ul className="svc-list">
                    {service.capabilities.map((cap) => (
                      <li key={cap}>{cap}</li>
                    ))}
                  </ul>
                  <Link href={`/services/${service.slug}`} className="svc-explore magnetic">
                    {service.label} を詳しく見る <i>→</i>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== WHY INTEGRATION MATTERS ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow reveal">
              <i className="pulse" /> Why Integration Matters
            </div>
            <h2 className="title reveal">
              なぜ「<em>統合</em>」が重要なのか。
            </h2>
          </div>
          <p className="lead-lg reveal" style={{ maxWidth: "880px" }}>
            3つを別々に依頼しても、断絶が生まれます。mixednuts は、3つが常に連動する設計で動きます。
          </p>
          <div className="vgrid three">
            <div className="vcard reveal">
              <div className="vn">→</div>
              <div className="vbig">戦略が AI を加速する</div>
              <p>
                「どのプロセスを自動化すべきか」の判断は戦略思考が必要です。戦略家とAIエンジニアが同じチームにいるから、正しいAI投資ができます。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vn">→</div>
              <div className="vbig">AI がマーケを進化させる</div>
              <p>
                クリエイティブ生成、入札最適化、データ分析。AIなしのマーケティングは2024年以前の話。AI前提でマーケを設計します。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vn">→</div>
              <div className="vbig">マーケが戦略を検証する</div>
              <p>
                顧客の反応は最良の戦略検証です。マーケの実行データを戦略のループに取り込み、仮説検証を高速で回します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW WE WORK ===== */}
      <section className="sec" style={{ background: "#0A0A0A" }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow reveal">
              <i className="pulse" /> How We Work
            </div>
            <h2 className="title reveal" style={{ color: "#fff" }}>
              4つの<em>ステップ</em>。
            </h2>
          </div>
          <div className="proc">
            <div className="proc-step reveal">
              <div className="proc-n">01</div>
              <h4>診断</h4>
              <p>事業・組織・データを横断で把握。ボトルネックと伸びしろを特定します。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">02</div>
              <h4>設計</h4>
              <p>戦略・AI・マーケを混ぜた打ち手を設計。優先順位とKPIを合意します。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">03</div>
              <h4>実装</h4>
              <p>AIエージェントと共に、現場に実装。報告書ではなく成果物を出します。</p>
            </div>
            <div className="proc-step reveal">
              <div className="proc-n">04</div>
              <h4>改善</h4>
              <p>データで検証し、高速に改善。再現性のある成長曲線に乗せます。</p>
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
            どのサービスが
            <br />
            <em>最適か、</em>一緒に考えましょう。
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
