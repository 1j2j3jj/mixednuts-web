import type { Metadata } from "next";
import Link from "next/link";
import { members, divisionLabels } from "@/data/members";

export const metadata: Metadata = {
  title: "Team — 多様な才能の「ミックス」",
  description: "広告代理店、事業会社マーケ、戦略コンサル、ビッグテック、クリエイター——多様なバックグラウンドのプロフェッショナルが集結。",
  alternates: { canonical: "/team" },
};

const divisionColors: Record<string, string> = {
  leadership: "#0A0A0A",
  strategy: "#1A1A1A",
  ai: "#0A0A0A",
  marketing: "#1A1A1A",
};

export default function TeamPage() {
  const ceo = members.find((m) => m.division === "leadership");
  const restMembers = members.filter((m) => m.division !== "leadership");

  return (
    <>
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
            <Link href="/">Home</Link> / Team
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Our People
          </div>
          <h1 className="big-title-jp reveal">
            多様な才能が
            <br />
            &ldquo;<em>ミックス</em>&rdquo;する場所。
          </h1>
          <p className="subhero-lead reveal">
            単一のバックグラウンドに依存しない。広告代理店、事業会社マーケ責任者、戦略コンサル、ビッグテック、SNSクリエイター——異なる専門性を持つプロフェッショナルが、一つのプロジェクトで視座を重ねます。
          </p>
        </div>
      </header>

      {/* ===== PHILOSOPHY ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Our Philosophy
            </div>
            <p className="lead-lg reveal">
              それぞれのプロが、
              <br />
              本来の強さを発揮できる場所。
            </p>
          </div>
          <div className="twocol" style={{ marginBottom: 64 }}>
            <div className="reveal">
              <p>
                ミックスナッツは、スペシャリストの集合体です。全員が「自分の得意」だけに集中できるよう、チームとAIエージェントが補完し合う設計になっています。
              </p>
              <p>
                マネジメントの負荷はAIが吸収し、人間は高付加価値な思考と実行に専念する。それが私たちの「AI-first, Human-led」の実践形です。
              </p>
            </div>
            <div className="media reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/office_interior.jpg" alt="mixednuts studio" />
            </div>
          </div>
          <div className="bg-grid">
            {[
              { label: "Strategy", value: "外資系戦略ファーム、事業会社の経営企画・FP&A出身。" },
              { label: "AI", value: "グローバルIT企業 ML、スタートアップ CTO 経験者。" },
              { label: "Marketing", value: "国内大手広告代理店、事業会社のマーケ責任者。" },
              { label: "Creative", value: "SNSクリエイター、編集者・コンテンツ制作。" },
            ].map((bg) => (
              <div key={bg.label} className="bg-card reveal">
                <div className="h">{bg.label}</div>
                <p>{bg.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CEO ===== */}
      {ceo && (
        <section className="sec">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Leadership
              </div>
              <h2 className="title reveal">
                Founder &amp; <em>CEO</em>
              </h2>
            </div>
            <div className="lead-card reveal">
              <div className="avatar">N.I.</div>
              <div>
                <h3>石井 希実</h3>
                <div className="role">{ceo.role} · Nozomi Ishii</div>
                <p>{ceo.bio}</p>
                <p>{ceo.background}</p>
                <div className="path">
                  <b>Education:</b> 早稲田大学大学院 経営管理研究科（MBA）　·
                  <Link href="/team/ceo">詳細プロフィール →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== MEMBERS GRID — hidden until profiles are finalized ===== */}
      {false && (
        <section className="sec white">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow dark reveal">
                <i className="pulse" /> Team Members
              </div>
              <h2 className="title reveal">専門家が揃う、3つの部門。</h2>
              <p className="lead-lg reveal">
                Strategy, AI, Marketingの各領域に、確かな実績を持つプロフェッショナルが在籍しています。
              </p>
            </div>
            <div className="vgrid three">
              {restMembers.map((member) => (
                <div
                  key={member.initial}
                  className="vcard reveal"
                  style={{
                    borderBottom: `2px solid var(--cyan)`,
                    ["--mc" as string]: divisionColors[member.division] || "#0A0A0A",
                  }}
                >
                  <div className="vn">{divisionLabels[member.division]}</div>
                  <h4>{member.initial}</h4>
                  <p style={{ color: "var(--cyan-deep,#00B4D8)", marginBottom: 10 }}>
                    {member.role}
                  </p>
                  <p>{member.background}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== DEPARTMENTS ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow dark reveal">
              <i className="pulse" /> Departments
            </div>
            <h2 className="title reveal">
              3つの専門部門 ＋ <em>AI</em>。
            </h2>
            <p className="lead-lg reveal">
              各部門が独立した専門性を持ちながら、プロジェクトに応じてクロスファンクショナルに動く設計です。
            </p>
          </div>
          <div className="vgrid">
            <div className="vcard reveal">
              <div className="vn">01</div>
              <h4>Strategy</h4>
              <p>
                中期戦略、M&amp;A、FP&amp;A、新規事業。経営判断の中枢に入り込み、意思決定を支援する。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vn">02</div>
              <h4>AI Implementation</h4>
              <p>
                エージェント設計、LLM実装、RAG構築。自社で120体超を運用してきた実装ノウハウが強み。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vn">03</div>
              <h4>Marketing &amp; Growth</h4>
              <p>
                広告運用、SEO/AIO、CVR改善、コンテンツ。代理店出身と事業会社出身が組んで実行する。
              </p>
            </div>
            <div className="vcard reveal">
              <div className="vbig">120+</div>
              <h4>AI Agents</h4>
              <p>
                120体超のAIエージェントが24時間稼働。人間チームをサポートし、組織全体の処理能力を拡張する。
              </p>
            </div>
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
            <i className="pulse" /> Join the team
          </div>
          <h2 className="cta-h reveal">
            才能を&ldquo;ミックス&rdquo;して、
            <br />
            <em>次の事業の章を書こう。</em>
          </h2>
          <p className="reveal">
            私たちのチームに興味がある方、また採用・協業については Careers ページをご覧ください。
          </p>
          <Link href="/careers" className="btn btn-cyan btn-lg magnetic reveal">
            <span>採用情報を見る</span>
            <i className="arr">↗</i>
          </Link>
        </div>
      </section>
    </>
  );
}
