import type { Metadata } from "next";
import Link from "next/link";
import { positions, CASUAL_INTERVIEW_SLUG } from "@/data/careers";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";

const faqItems = [
  {
    q: "副業・大手企業在籍のままの業務委託は可能ですか?",
    a: "はい、多くのメンバーが副業形態で参画しています。週2日〜設計可能です。所属企業の副業規定を遵守いただく形で、機密性・利害関係にも配慮して進めます。",
  },
  {
    q: "リモートは可能ですか?",
    a: "業務委託は完全リモート、正社員は \"週1オフィス (南青山) + リモート\" が基本です。地方在住メンバーもいます。",
  },
  {
    q: "未経験でも応募可能ですか?",
    a: "ポジションによります。AI Implementation Engineer は AI 実装未経験でも、エンジニアリング経験があれば応募可。Senior Strategy Consultant のようなシニアポジションは相応の経験が必要です。迷ったら気軽にお問い合わせください。",
  },
  {
    q: "どんな人が活躍していますか?",
    a: "共通しているのは (1) 自律的に動ける、(2) AI を使うことへの抵抗がない、(3) 複数領域に興味がある、(4) Calibration (数字と事実を大切にする)、の4点です。専門性は多様で、広告代理店、事業会社CxO、戦略ファーム、ビッグテック、クリエイター など様々です。",
  },
  {
    q: "記載されているポジション以外も応募できますか?",
    a: "もちろんです。スキルセットやご関心がフィットしそうな方は、ぜひお問い合わせください。新しいポジションをご一緒に設計することも可能です。",
  },
  {
    q: "英語は必須ですか?",
    a: "一部のポジション (海外案件担当等) では有利ですが、必須ではありません。現在のクライアントは国内中心です。",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Careers", path: "/careers" },
]);

export const metadata: Metadata = {
  title: "Careers — AI と共に働くプロフェッショナル募集 | mixednuts inc.",
  description:
    "戦略・AI・マーケのプロフェッショナルを募集。フルタイム、業務委託、プロジェクト単位のパートナーまで、多様な働き方を設計可能。",
  alternates: { canonical: "/careers" },
};

const hiringSteps = [
  { num: "01", day: "Day 1", title: "カジュアル面談", desc: "30分のカジュアル面談で、お互いの興味と相性を確認。" },
  { num: "02", day: "Week 1", title: "書類選考", desc: "職務経歴書 + ポートフォリオを2営業日以内に確認。" },
  { num: "03", day: "Week 2", title: "実技・ケース", desc: "実際の業務に即したケース (持ち帰り2-3h程度) を提出。" },
  { num: "04", day: "Week 3", title: "CEO 面談", desc: "CEO (石井 希実) と60分の最終面談。" },
  { num: "05", day: "Week 4", title: "オファー", desc: "条件提示 → 合意 → 契約締結。最短翌週から着任可。" },
];

export default function CareersPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumb} />

      {/* ===== HERO ===== */}
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
            <Link href="/">Home</Link> / Careers
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Join Us
          </div>
          <h1 className="big-title-jp reveal">
            AI と&quot;<em>共に働く</em>&quot;
            <br />
            プロフェッショナルを募集中。
          </h1>
          <p className="subhero-lead reveal">
            フルタイム社員、業務委託、プロジェクト単位のパートナーまで。多様な働き方を組み合わせ、
            &quot;ミックス&quot;の文化を育てていく仲間を探しています。戦略 / AI / マーケ / デザイン /
            クリエイティブ、あらゆる領域で出会いを歓迎します。
          </p>
          <div className="subhero-meta reveal">
            <div>
              <div className="k">{positions.length}</div>
              <div className="l">Open Roles</div>
            </div>
            <div>
              <div className="k">Remote</div>
              <div className="l">フルリモート可</div>
            </div>
            <div>
              <div className="k">120+</div>
              <div className="l">AI Coworkers</div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== WHY JOIN US ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Why Join Us
            </div>
            <h2 className="title reveal">
              ミックスナッツで働く、
              <br />
              <em>3つ</em>の魅力。
            </h2>
            <p className="lead-lg reveal">
              AI-first ファームで、&quot;自分の専門性&quot; × &quot;AIの拡張力&quot; を試せる場所。
            </p>
          </div>
          <div className="vgrid three">
            <div className="vcard reveal">
              <div className="vn">01</div>
              <h4>AI が同僚になる</h4>
              <p>
                120体超の AI エージェントがあなたの仕事を助けます。単純作業は AI に任せ、人間は戦略判断と
                クリエイティビティに集中。&quot;自分の時間単価&quot; が2倍以上になる感覚を得られます。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vn">02</div>
              <h4>領域を越えた学び</h4>
              <p>
                戦略ファーム、ビッグテック、事業会社CxO、クリエイター出身者と日常的に協業。
                1年間で&quot;複数領域のプロフェッショナル&quot;になれるラーニング環境です。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vn">03</div>
              <h4>決定権と責任</h4>
              <p>
                年次・肩書ではなく、成果と信頼で意思決定の範囲が広がる設計。
                &quot;AIを使って、自分で判断する&quot; を当たり前にする組織です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WORK STYLES ===== */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Work Styles
            </div>
            <h2 className="title reveal">
              3つの<em>働き方</em>。
            </h2>
            <p className="lead-lg reveal">
              ご自身のライフステージ・専門性・コミット度に合わせて選べます。
            </p>
          </div>
          <div className="ws-grid">
            <div className="ws-card reveal">
              <div className="tag">FULL-TIME</div>
              <h4>正社員</h4>
              <p>
                フルコミットで事業成長をドライブする中核メンバー。経営幹部候補としての採用を含みます。
              </p>
              <ul>
                <li>リモート + 週1オフィス (南青山)</li>
                <li>ストックオプション検討</li>
                <li>フレックス制</li>
                <li>書籍・学習支援あり</li>
              </ul>
              <a href="#open" className="ws-link">
                Open positions ↓
              </a>
            </div>
            <div className="ws-card reveal">
              <div className="tag">CONTRACT</div>
              <h4>業務委託</h4>
              <p>
                週2-4日のコミットで、特定案件に深く関わる形。副業可。大手企業在籍中の方も歓迎。
              </p>
              <ul>
                <li>完全リモート</li>
                <li>週2日〜 柔軟に設計</li>
                <li>プロジェクト開始は最短翌週</li>
                <li>契約更新は3ヶ月ごと</li>
              </ul>
              <a href="#open" className="ws-link">
                Open positions ↓
              </a>
            </div>
            <div className="ws-card reveal">
              <div className="tag">PARTNER</div>
              <h4>プロジェクト パートナー</h4>
              <p>
                スポット案件や専門領域の助言で参画。1プロジェクト単位・1回コンサルから可能。
              </p>
              <ul>
                <li>完全リモート</li>
                <li>成果報酬 / プロジェクト単位</li>
                <li>最短1ヶ月〜</li>
                <li>継続的な関係性も歓迎</li>
                <li>顧問・Advisory も相談可</li>
              </ul>
              <a href="#open" className="ws-link">
                Open positions ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OPEN POSITIONS ===== */}
      <section className="sec white" id="open">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Open Positions
            </div>
            <h2 className="title reveal">
              募集中の<em>ポジション</em>。
            </h2>
            <p className="lead-lg reveal">
              記載以外のポジションでも、スキルセットにフィットする方は随時相談可能です。
            </p>
          </div>
          <div className="pos-list">
            {positions.map((pos) => (
              <Link
                key={pos.slug}
                href={`/careers/apply?position=${pos.slug}`}
                className="pos reveal"
              >
                <div>
                  <div className="pt">{pos.title}</div>
                  <div className="ptags">
                    {pos.tags.map((t) => (
                      <span key={t} className="ptag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pgo">{pos.type} →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HIRING PROCESS ===== */}
      <section className="sec" id="process" style={{ background: "#0A0A0A" }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow reveal">
              <i className="pulse" /> Hiring Process
            </div>
            <h2 className="title reveal" style={{ color: "#fff" }}>
              選考<em>フロー</em>。
            </h2>
            <p className="lead-lg reveal" style={{ color: "rgba(255,255,255,.62)" }}>
              2-4週間で選考完了。スピーディーに、お互い納得できる形を目指します。
            </p>
          </div>
          <div className="proc">
            {hiringSteps.map((step) => (
              <div key={step.num} className="proc-step reveal">
                <div className="proc-n">{step.num}</div>
                <h4>{step.title}</h4>
                <p>
                  <span style={{ display: "block", color: "var(--cyan,#00D9FF)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>
                    {step.day}
                  </span>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> FAQ
            </div>
            <h2 className="title reveal">
              採用に関する<em>質問</em>。
            </h2>
          </div>
          <div style={{ maxWidth: 860 }}>
            {faqItems.map((item) => (
              <details key={item.q} className="faq reveal">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
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
            <i className="pulse" /> Let&apos;s talk
          </div>
          <h2 className="cta-h reveal">
            MIX WITH
            <br />
            <em>us.</em>
          </h2>
          <p className="reveal">
            まずは、話しましょう。カジュアル面談 (30分) から始められます。応募前の質問も歓迎します。
          </p>
          <Link
            href={`/careers/apply?position=${CASUAL_INTERVIEW_SLUG}`}
            className="btn btn-cyan btn-lg magnetic reveal"
          >
            <span>カジュアル面談を申し込む</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
