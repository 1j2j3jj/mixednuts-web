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
};

export default function CareersPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumb} />
      <style>{`
        .page-hero-careers { background: var(--off-white); }

        /* Why us */
        .why-us { background: var(--white); padding: 120px 32px; }
        .why-us-inner { max-width: 1280px; margin: 0 auto; }
        .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .why-card {
          background: #F9FAFB; border-radius: 20px; padding: 40px 32px;
          transition: all 0.3s; border: 1px solid #E5E7EB;
        }
        .why-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(11,22,52,0.08); border-color: var(--cyan); }
        .why-num { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; color: var(--cyan); line-height: 1; margin-bottom: 16px; }
        .why-card h3 { font-family: 'Noto Serif JP', serif; font-size: 20px; font-weight: 700; color: var(--navy); margin-bottom: 12px; }
        .why-card p { color: #4B5563; font-size: 14px; line-height: 1.9; }

        /* Work styles */
        .work-styles { background: #F9FAFB; padding: 120px 32px; }
        .work-styles-inner { max-width: 1280px; margin: 0 auto; }
        .styles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .style-card { background: var(--white); border: 1px solid #E5E7EB; border-radius: 20px; padding: 40px; }
        .style-card.featured { background: var(--navy); color: var(--white); position: relative; border: none; }
        .style-card.featured::before {
          content: 'POPULAR'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--gold); color: var(--navy);
          padding: 4px 16px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; font-family: 'Inter', sans-serif;
        }
        .style-card h3 { font-family: 'Noto Serif JP', serif; font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .style-type { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-family: 'Inter', sans-serif; font-weight: 700; margin-bottom: 16px; }
        .style-card p { font-size: 14px; line-height: 1.9; margin-bottom: 24px; opacity: 0.9; }
        .style-card ul { list-style: none; margin-bottom: 24px; padding: 0; }
        .style-card ul li { padding: 8px 0 8px 20px; font-size: 13px; position: relative; line-height: 1.7; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .style-card.featured ul li { border-bottom-color: rgba(255,255,255,0.08); }
        .style-card ul li::before { content: '✓'; position: absolute; left: 0; color: var(--cyan); font-weight: 700; }

        /* Open positions */
        .positions { background: var(--white); padding: 120px 32px; }
        .positions-inner { max-width: 1280px; margin: 0 auto; }
        .position-list { margin-top: 48px; }
        .position-item {
          background: var(--white); border: 1px solid #E5E7EB; border-radius: 16px;
          padding: 32px; margin-bottom: 16px; transition: all 0.2s;
          display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 24px; align-items: center;
          text-decoration: none; color: inherit;
        }
        .position-item:hover { border-color: var(--navy); transform: translateX(4px); }
        .position-main h3 { font-family: 'Noto Serif JP', serif; font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
        .position-tags { display: flex; gap: 8px; flex-wrap: wrap; }
        .position-tag { padding: 3px 10px; background: #F9FAFB; color: #4B5563; font-size: 11px; border-radius: 4px; font-weight: 600; }
        .position-meta { font-size: 13px; color: #9CA3AF; }
        .position-arrow { font-size: 20px; color: #9CA3AF; transition: all 0.2s; }
        .position-item:hover .position-arrow { color: var(--cyan); transform: translateX(4px); }

        /* Process */
        .hiring-process { background: #F9FAFB; padding: 120px 32px; }
        .hiring-process-inner { max-width: 1280px; margin: 0 auto; }
        .hiring-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 48px; }
        .hiring-step { background: var(--white); border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px 24px; position: relative; }
        .hiring-step-num { position: absolute; top: -14px; left: 24px; background: var(--navy); color: var(--white); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 13px; }
        .hiring-step h3 { font-family: 'Noto Serif JP', serif; font-size: 15px; font-weight: 700; color: var(--navy); margin: 12px 0 8px; }
        .hiring-step .days { font-size: 11px; color: var(--cyan); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; font-family: 'Inter', sans-serif; margin-bottom: 6px; }
        .hiring-step p { font-size: 12px; color: #4B5563; line-height: 1.7; }

        /* FAQ (details/summary accordion) */
        .careers-faq { background: var(--white); padding: 120px 32px; }
        .careers-faq-list { max-width: 900px; margin: 0 auto; }
        .faq-item { background: #F9FAFB; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
        .faq-item summary {
          padding: 24px 28px; font-family: 'Noto Serif JP', serif; font-size: 16px; font-weight: 700;
          color: var(--navy); display: flex; justify-content: space-between; align-items: center;
          cursor: pointer; list-style: none; gap: 16px;
        }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item summary::after {
          content: '+'; font-size: 28px; color: var(--cyan); line-height: 1; flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .faq-item[open] summary::after { transform: rotate(45deg); }
        .faq-item .faq-a { padding: 0 28px 24px; color: #4B5563; font-size: 14px; line-height: 1.9; }

        @media (max-width: 900px) {
          .why-grid, .styles-grid { grid-template-columns: 1fr; }
          .position-item { grid-template-columns: 1fr; gap: 12px; }
          .hiring-steps { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* HERO */}
      <section className="page-hero page-hero-careers">
        <div className="page-hero-inner">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / Careers
          </div>
          <div className="page-hero-badge">Join Us</div>
          <h1>
            AI と&quot;<span className="accent">共に働く</span>&quot;<br />
            プロフェッショナルを<br />
            募集しています。
          </h1>
          <p className="lead">
            フルタイム社員、業務委託、プロジェクト単位のパートナーまで。多様な働き方を組み合わせ、
            &quot;ミックス&quot;の文化を育てていく仲間を探しています。戦略 / AI / マーケ / デザイン / クリエイティブ、
            あらゆる領域で出会いを歓迎します。
          </p>
        </div>
      </section>

      {/* WHY JOIN US */}
      <section className="why-us">
        <div className="why-us-inner">
          <span className="section-label">Why Join Us</span>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            ミックスナッツで働く3つの魅力
          </h2>
          <p className="section-lead" style={{ marginBottom: 0 }}>
            AI-first ファームで、&quot;自分の専門性&quot; × &quot;AIの拡張力&quot; を試せる場所。
          </p>
          <div className="why-grid">
            <div className="why-card">
              <div className="why-num">01</div>
              <h3>AI が同僚になる</h3>
              <p>
                120体超の AI エージェントがあなたの仕事を助けます。単純作業は AI に任せ、人間は戦略判断と
                クリエイティビティに集中。&quot;自分の時間単価&quot; が2倍以上になる感覚を得られます。
              </p>
            </div>
            <div className="why-card">
              <div className="why-num">02</div>
              <h3>領域を越えた学び</h3>
              <p>
                戦略ファーム、ビッグテック、事業会社CxO、クリエイター出身者と日常的に協業。
                1年間で&quot;複数領域のプロフェッショナル&quot;になれるラーニング環境です。
              </p>
            </div>
            <div className="why-card">
              <div className="why-num">03</div>
              <h3>決定権と責任</h3>
              <p>
                年次・肩書ではなく、成果と信頼で意思決定の範囲が広がる設計。
                &quot;AIを使って、自分で判断する&quot; を当たり前にする組織です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WORK STYLES */}
      <section className="work-styles">
        <div className="work-styles-inner">
          <span className="section-label">Work Styles</span>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            3つの働き方
          </h2>
          <p className="section-lead" style={{ marginBottom: 0 }}>
            ご自身のライフステージ・専門性・コミット度に合わせて選べます。
          </p>
          <div className="styles-grid">
            <div className="style-card">
              <div className="style-type">FULL-TIME</div>
              <h3>正社員</h3>
              <p>フルコミットで事業成長をドライブする中核メンバー。経営幹部候補としての採用を含みます。</p>
              <ul>
                <li>リモート + 週1オフィス (南青山)</li>
                <li>年収: 600–1800万円</li>
                <li>ストックオプション検討</li>
                <li>フレックス制</li>
                <li>書籍・学習支援あり</li>
              </ul>
              <a href="#open" style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textDecoration: "underline" }}>
                Open positions ↓
              </a>
            </div>
            <div className="style-card featured">
              <div className="style-type">CONTRACT</div>
              <h3>業務委託</h3>
              <p>週2-4日のコミットで、特定案件に深く関わる形。副業可。大手企業在籍中の方も歓迎。</p>
              <ul>
                <li>完全リモート</li>
                <li>月額: 30万円〜 (工数・スキル次第)</li>
                <li>週2日〜 柔軟に設計</li>
                <li>プロジェクト開始は最短翌週</li>
                <li>契約更新は3ヶ月ごと</li>
              </ul>
              <a href="#open" style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", textDecoration: "underline" }}>
                Open positions ↓
              </a>
            </div>
            <div className="style-card">
              <div className="style-type">PARTNER</div>
              <h3>プロジェクト パートナー</h3>
              <p>スポット案件や専門領域の助言で参画。1プロジェクト単位・1回コンサルから可能。</p>
              <ul>
                <li>完全リモート</li>
                <li>成果報酬 / プロジェクト単位</li>
                <li>最短1ヶ月〜</li>
                <li>継続的な関係性も歓迎</li>
                <li>顧問・Advisory も相談可</li>
              </ul>
              <a href="#open" style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", textDecoration: "underline" }}>
                Open positions ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* OPEN POSITIONS */}
      <section className="positions" id="open">
        <div className="positions-inner">
          <span className="section-label">Open Positions</span>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            募集中のポジション
          </h2>
          <p className="section-lead" style={{ marginBottom: 0 }}>
            記載以外のポジションでも、スキルセットにフィットする方は随時相談可能です。
          </p>
          <div className="position-list">
            {positions.map((pos) => (
              <Link key={pos.slug} href={`/careers/apply?position=${pos.slug}`} className="position-item">
                <div className="position-main">
                  <h3>{pos.title}</h3>
                  <div className="position-tags">
                    {pos.tags.map((t) => (
                      <span key={t} className="position-tag">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="position-meta">{pos.type}</div>
                <div className="position-arrow">→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HIRING PROCESS */}
      <section className="hiring-process" id="process">
        <div className="hiring-process-inner">
          <span className="section-label">Hiring Process</span>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            選考フロー
          </h2>
          <p className="section-lead" style={{ marginBottom: 0 }}>
            2-4週間で選考完了。スピーディーに、お互い納得できる形を目指します。
          </p>
          <div className="hiring-steps">
            {[
              { num: "1", day: "Day 1", title: "カジュアル面談", desc: "30分のカジュアル面談で、お互いの興味と相性を確認。" },
              { num: "2", day: "Week 1", title: "書類選考", desc: "職務経歴書 + ポートフォリオを2営業日以内に確認。" },
              { num: "3", day: "Week 2", title: "実技・ケース", desc: "実際の業務に即したケース (持ち帰り2-3h程度) を提出。" },
              { num: "4", day: "Week 3", title: "CEO 面談", desc: "CEO (石井 希実) と60分の最終面談。" },
              { num: "5", day: "Week 4", title: "オファー", desc: "条件提示 → 合意 → 契約締結。最短翌週から着任可。" },
            ].map((step) => (
              <div key={step.num} className="hiring-step">
                <div className="hiring-step-num">{step.num}</div>
                <div className="days">{step.day}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="careers-faq">
        <div className="careers-faq-list">
          <span className="section-label">FAQ</span>
          <h2 className="section-title" style={{ marginBottom: 48 }}>
            採用に関するよくある質問
          </h2>
          {faqItems.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="faq-a">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <h2>まずは、話しましょう。</h2>
          <p>カジュアル面談 (30分) から始められます。応募前の質問も歓迎します。</p>
          <Link href={`/careers/apply?position=${CASUAL_INTERVIEW_SLUG}`} className="btn-primary">
            カジュアル面談を申し込む →
          </Link>
        </div>
      </section>
    </>
  );
}
