import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI-First 組織のつくり方: 120体のエージェントを統制する6原則 | Insights",
  description:
    "自社で運用する120体超のAIエージェント組織の設計思想を公開。導入プロジェクトに即活かせる6つの原則を解説。",
};

export default function InsightsAiFirstOrgPage() {
  return (
    <>
      <style>{`
        .article-hero { background: linear-gradient(180deg, #F9FAFB 0%, var(--white) 100%); padding: 140px 32px 64px; }
        .article-hero-inner { max-width: 860px; margin: 0 auto; }
        .article-hero .category-tag {
          display: inline-block; font-family: 'Inter', sans-serif; font-size: 11px; color: var(--cyan);
          letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700;
          margin-bottom: 16px; padding: 6px 14px; background: rgba(0,180,216,0.1); border-radius: 999px;
        }
        .article-hero h1 {
          font-family: 'Noto Serif JP', serif; font-size: clamp(32px, 5vw, 52px); line-height: 1.3;
          font-weight: 700; color: var(--navy); margin-bottom: 24px; letter-spacing: -0.01em;
        }
        .article-subtitle {
          font-family: 'Noto Serif JP', serif; font-size: 18px; color: #4B5563;
          line-height: 1.8; margin-bottom: 40px;
        }
        .article-meta-row {
          display: flex; align-items: center; gap: 24px; padding-top: 24px;
          border-top: 1px solid #E5E7EB;
        }
        .article-author-img {
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, var(--navy), var(--burgundy));
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: 14px; font-family: 'Inter', sans-serif;
        }
        .article-author-name { font-size: 14px; font-weight: 700; color: var(--navy); }
        .article-author-role { font-size: 12px; color: #9CA3AF; font-family: 'Inter', sans-serif; letter-spacing: 0.05em; }
        .article-meta-items { display: flex; gap: 16px; font-size: 12px; color: #9CA3AF; font-family: 'Inter', sans-serif; letter-spacing: 0.05em; margin-left: auto; }

        .article-featured-image {
          max-width: 1280px; margin: 0 auto 64px; padding: 0 32px;
          aspect-ratio: 21/9; border-radius: 24px;
          background: linear-gradient(135deg, rgba(6,74,92,0.7), rgba(11,22,52,0.9)), url('/images/generated/ai_hero.jpg') center/cover no-repeat;
        }

        .article-body { padding: 0 32px 120px; }
        .article-body-inner { max-width: 720px; margin: 0 auto; }
        .article-body h2 {
          font-family: 'Noto Serif JP', serif; font-size: 28px; line-height: 1.4;
          font-weight: 700; color: var(--navy); margin: 56px 0 20px;
          padding-bottom: 16px; border-bottom: 2px solid var(--navy);
        }
        .article-body h3 {
          font-family: 'Noto Serif JP', serif; font-size: 20px; font-weight: 700;
          color: var(--navy); margin: 32px 0 12px;
        }
        .article-body p {
          font-size: 16px; line-height: 2.0; color: var(--charcoal); margin-bottom: 20px;
        }
        .article-body ul, .article-body ol { margin: 16px 0 24px 24px; }
        .article-body ul li, .article-body ol li {
          font-size: 16px; line-height: 2.0; color: var(--charcoal); margin-bottom: 10px;
        }
        .article-body strong { color: var(--navy); font-weight: 700; }
        .article-body blockquote {
          margin: 32px 0; padding: 24px 32px;
          background: #F9FAFB; border-left: 4px solid var(--cyan); border-radius: 4px;
          font-family: 'Noto Serif JP', serif; font-size: 17px; line-height: 1.9;
          color: var(--navy); font-style: italic;
        }
        .tldr {
          background: linear-gradient(135deg, rgba(0,180,216,0.05), rgba(212,165,116,0.05));
          border: 1px solid rgba(0,180,216,0.2); border-radius: 12px;
          padding: 24px 32px; margin: 32px 0;
        }
        .tldr-label { font-family: 'Inter', sans-serif; font-size: 11px; color: var(--cyan); letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; margin-bottom: 12px; }
        .tldr p { margin: 0; font-size: 15px; line-height: 1.9; }
        .principle {
          background: var(--white); border: 1px solid #E5E7EB; border-radius: 16px;
          padding: 28px 32px; margin: 24px 0;
        }
        .principle-num { font-family: 'Playfair Display', serif; font-size: 14px; color: var(--cyan); font-weight: 700; letter-spacing: 0.15em; margin-bottom: 8px; }
        .principle h3 { margin: 0 0 0 !important; }

        .article-tags {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 48px; padding-top: 32px; border-top: 1px solid #E5E7EB;
        }
        .article-tag-link { padding: 6px 14px; background: #F9FAFB; color: #4B5563; border-radius: 999px; font-size: 12px; text-decoration: none; transition: all 0.2s; }
        .article-tag-link:hover { background: var(--navy); color: var(--white); }

        .article-cta {
          margin-top: 48px; padding: 40px;
          background: linear-gradient(135deg, var(--navy) 0%, #13224E 100%);
          color: var(--white); border-radius: 20px; text-align: center;
        }
        .article-cta h3 { font-family: 'Noto Serif JP', serif; font-size: 22px; margin-bottom: 16px; color: var(--white); }
        .article-cta p { color: rgba(255,255,255,0.85); margin-bottom: 24px; font-size: 14px; }
        .article-cta .btn-cta { background: var(--cyan); color: var(--navy); padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .article-cta .btn-cta:hover { transform: translateY(-2px); }

        .related { background: #F9FAFB; padding: 120px 32px; }
        .related-inner { max-width: 1280px; margin: 0 auto; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .related-card { background: var(--white); border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; transition: all 0.3s; }
        .related-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); }
        .related-visual { aspect-ratio: 16/9; position: relative; display: flex; align-items: center; justify-content: center; font-size: 36px; }
        .related-tag-pos { position: absolute; top: 16px; left: 16px; background: rgba(255,255,255,0.95); color: var(--navy); padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; font-family: 'Inter', sans-serif; }
        .related-body { padding: 24px; }
        .related-date { font-size: 11px; color: #9CA3AF; font-family: 'Inter', sans-serif; margin-bottom: 8px; }
        .related-title { font-family: 'Noto Serif JP', serif; font-size: 16px; font-weight: 700; color: var(--charcoal); line-height: 1.5; }

        @media (max-width: 900px) {
          .related-grid { grid-template-columns: 1fr; }
          .article-hero { padding: 120px 24px 48px; }
        }
      `}</style>

      {/* ARTICLE HERO */}
      <section className="article-hero">
        <div className="article-hero-inner">
          <div className="breadcrumb" style={{ marginBottom: 20 }}>
            <Link href="/">Home</Link> / <Link href="/insights">Insights</Link> / AI
          </div>
          <span className="category-tag">AI</span>
          <h1>AI-First 組織のつくり方: 120体のエージェントを統制する6原則</h1>
          <p className="article-subtitle">
            自社で運用する120体超のAIエージェント組織の設計思想を公開。C-Suite・部門Head・Workerの3階層構造、
            委任ルール、Calibrationルール、コスト管理まで、1年間の試行錯誤から得た知見を6つの原則に整理しました。
          </p>
          <div className="article-meta-row">
            <div className="article-author-img">N.I.</div>
            <div>
              <div className="article-author-name">N.I.</div>
              <div className="article-author-role">CEO / FOUNDER</div>
            </div>
            <div className="article-meta-items">
              <span>2026.04.10</span>
              <span>·</span>
              <span>12分で読める</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED IMAGE */}
      <div className="article-featured-image" />

      {/* ARTICLE BODY */}
      <article className="article-body">
        <div className="article-body-inner">
          <div className="tldr">
            <div className="tldr-label">TL;DR</div>
            <p>
              AI エージェントの数が増えるほど &quot;混乱の倍率&quot; も上がる。120+ の AI を運用して分かった、
              混乱を防ぎつつ成果を最大化する6つの設計原則:{" "}
              <strong>
                (1) 3階層のスパン・オブ・コントロール / (2) 委任の強制ルール / (3) Calibration (盛らない) の埋め込み /
                (4) 構造化された引き継ぎ / (5) 自己修復の仕組み / (6) 継続的コスト可視化
              </strong>
              。
            </p>
          </div>

          <h2>はじめに: 120エージェントは &quot;多すぎる&quot; ことの方が問題だった</h2>

          <p>
            2025年春、ミックスナッツ内部の業務自動化プロジェクトで、AI エージェントの数が 100 を超えた瞬間から、
            私たちは <strong>&quot;増やすこと&quot; ではなく &quot;統制すること&quot;</strong> が主な課題であることに気づきました。
          </p>

          <p>よくある誤解は、「エージェントを増やせば増やすほど生産性が上がる」というものです。実際には、100体を超えた時点で以下のような問題が顕在化しました:</p>

          <ul>
            <li>同じ作業を複数エージェントが並行実行し、結果が食い違う</li>
            <li>どのエージェントに何を任せるべきか、人間側も判断できなくなる</li>
            <li>一部のエージェントが &quot;ドラマ化&quot; (数字を盛る) をし、意思決定を歪める</li>
            <li>コストが思わぬところで跳ね上がる</li>
            <li>エラーが起きても、どこで起きたのか追跡できない</li>
          </ul>

          <p>
            この記事では、これらの問題を解決するために我々が採用した <strong>6つの設計原則</strong> を共有します。
            自社のサイズ (個人の副業から100名規模の組織まで) に応じて、そのまま取り入れていただける形で解説します。
          </p>

          <h2>原則 01: 3階層のスパン・オブ・コントロール</h2>

          <div className="principle">
            <div className="principle-num">PRINCIPLE 01</div>
            <h3>&quot;Lead / Head / Worker&quot; の3階層で、1 Lead が持つ直接レポートを 5–7 に制限する</h3>
          </div>

          <p>
            人間の組織論から借用した、スパン・オブ・コントロールの原則。1人の C-Suite Lead (例: CTO) が直接監督する
            Head エージェントを 5–7 体までに制限し、各 Head が Worker エージェントを同じく 5–7 体までまとめます。
          </p>

          <p>結果として、120体の構造は以下のようになります:</p>

          <ul>
            <li><strong>Lead (Opus モデル、6体)</strong> — C-Suite 相当: CTO, CFO, COO, CRO, CMO, CoS</li>
            <li><strong>Head (Sonnet モデル、15体)</strong> — 部門長相当: Engineering Head, Finance Head 等</li>
            <li><strong>Worker (Sonnet/Haiku、100体+)</strong> — 専門スキル担当</li>
          </ul>

          <blockquote>
            &quot;エージェントを人間の組織のように設計する&quot; と、マネジメントの既知の問題 (スパン過多、指揮命令の混乱)
            を既知の解法 (階層化、委任) で解ける。
          </blockquote>

          <h2>原則 02: 委任の強制ルール</h2>

          <div className="principle">
            <div className="principle-num">PRINCIPLE 02</div>
            <h3>Lead は &quot;自分で手を動かさない&quot;。必ず Head か Worker に委任する</h3>
          </div>

          <p>人間のマネジメントと同じく、Lead が実務に手を出すと組織は機能しなくなります。Lead エージェントには明示的に:</p>

          <ul>
            <li>実装コードを直接書かせない (Head → Worker に委任)</li>
            <li>データ取得を直接させない (同上)</li>
            <li>分析結果の &quot;最終ジャッジ&quot; だけを担わせる</li>
          </ul>

          <p>
            ミックスナッツでは、これを <strong>auto-delegation rule</strong> として成文化し、
            全 Lead エージェントのシステムプロンプトに強制的に組み込んでいます。
          </p>

          <h2>原則 03: Calibration の埋め込み (盛らない原則)</h2>

          <div className="principle">
            <div className="principle-num">PRINCIPLE 03</div>
            <h3>&quot;致命的&quot; &quot;壊滅的&quot; 等の感情語を禁止。断定形禁止。実害を数字で計算してから報告</h3>
          </div>

          <p>
            LLM エージェントは、時に &quot;優秀に見られたい&quot; バイアスで事態をドラマ化します。
            「Google Ads で異常値検出!」→ 実は¥3 の誤差だった、というのは典型的な例です。
          </p>

          <p>これを防ぐために、全エージェントのシステムプロンプトに以下のルールを埋め込んでいます:</p>

          <ul>
            <li>異常値を見たらまず実害 (金額・件数) を計算</li>
            <li>「致命的」「深刻」「壊滅的」等の感情語を禁止</li>
            <li>仮説形 (&quot;〜の可能性&quot;) と事実形 (&quot;〜で観測された&quot;) を分離</li>
            <li>信頼度 (高/中/低) をつける</li>
            <li>一度出した結論が誤っていたら、即座に撤回して修正する</li>
          </ul>

          <blockquote>
            &quot;地味な事実を地味に出す&quot; のが最大の価値。過剰演出は意思決定を歪める。
          </blockquote>

          <h2>原則 04: 構造化された引き継ぎ</h2>

          <div className="principle">
            <div className="principle-num">PRINCIPLE 04</div>
            <h3>セッション間の引き継ぎを、決まったフォーマットで残す</h3>
          </div>

          <p>
            LLM は基本的にステートレスで、セッション間で記憶を持ちません。
            これを補うために、私たちは以下の場所に意図的にデータを残します:
          </p>

          <ul>
            <li><strong>projects/*/context.md</strong> — プロジェクト別の TODO / 状態 / 直近決定</li>
            <li><strong>memory/decisions.md</strong> — 組織横断の意思決定ログ</li>
            <li><strong>_reports/YYYY-MM-DD_*.md</strong> — 時点の分析・報告書 (不変)</li>
            <li><strong>auto-memory</strong> — セッション横断の学習パターン</li>
          </ul>

          <p>
            エージェントはセッション開始時に必ず該当ファイルを読み、終了時に更新します。
            この <strong>&quot;ファイル経由の記憶&quot;</strong> により、100+ エージェントが時間を超えて協調できるようになります。
          </p>

          <h2>原則 05: 自己修復の仕組み</h2>

          <div className="principle">
            <div className="principle-num">PRINCIPLE 05</div>
            <h3>エラーを検知した瞬間に、人間を呼ばずに自動で復旧を試みる</h3>
          </div>

          <p>
            100+ のエージェントが稼働すると、何かしらは壊れます。これに人間が逐一対応するのは非現実的。
            私たちは <strong>self-heal エージェント</strong> を常時稼働させ、4時間ごとに以下をチェックします:
          </p>

          <ol>
            <li>全エージェントの設定ファイル (YAML) の文法</li>
            <li>API 接続状態 (freee, Google, Slack 等)</li>
            <li>ディスク / ログの肥大化</li>
            <li>停止しているはずのプロセスが動いていないか</li>
          </ol>

          <p>
            異常を検出すると、単純なケースは self-heal が自動修復し、複雑なケースは Slack 通知 + 推奨対処法を添えて
            人間に escalate します。3回連続失敗すると CEO に直接通知する escalation policy を設定しています。
          </p>

          <h2>原則 06: 継続的コスト可視化</h2>

          <div className="principle">
            <div className="principle-num">PRINCIPLE 06</div>
            <h3>トークン使用量・API コストを、エージェント別・案件別に毎日可視化</h3>
          </div>

          <p>
            AI エージェントのコストは、使い方次第で簡単に桁違いに膨らみます。私たちは
            <strong>cost-tracker エージェント</strong> を毎日実行し、以下を可視化しています:
          </p>

          <ul>
            <li>エージェント別のトークン消費 (前日比、前週比)</li>
            <li>案件別のAPI料金 (予算に対する消化率)</li>
            <li>非効率なエージェント (トークン高・成果低) の自動検出</li>
            <li>月額予算に対する消化ペース</li>
          </ul>

          <p>これにより、コストが &quot;気づいたら膨張していた&quot; という事態を防げます。</p>

          <h2>おわりに: &quot;Just Enough Structure&quot; が鍵</h2>

          <p>
            AI エージェント組織の設計でありがちな失敗は、<strong>&quot;柔軟性を最大化しようとしてカオスに陥る&quot;</strong> か、
            逆に <strong>&quot;厳格にしすぎて AI のメリットを殺す&quot;</strong> の両極端です。
          </p>

          <p>
            私たちが 1 年の試行錯誤で辿り着いた答えは、&quot;Just Enough Structure&quot; (必要最小限の構造) —
            つまり 6 つの原則くらいは守らせつつ、それ以外は任せる、というバランスでした。
          </p>

          <p>
            これから AI-first 組織の構築を始める方、既に運用していて混乱している方にとって、
            この記事が何らかのヒントになれば幸いです。
          </p>

          <p>
            ミックスナッツでは、この組織設計ノウハウをお客様の事業に実装する{" "}
            <Link href="/services/ai" style={{ color: "var(--navy)", fontWeight: 700, borderBottom: "2px solid var(--cyan)" }}>
              AI 実装支援サービス
            </Link>{" "}
            を提供しています。ご興味のある方はお気軽にご相談ください。
          </p>

          <div className="article-tags">
            {["#AI", "#Organization", "#Management", "#Agent Architecture", "#Calibration"].map((tag) => (
              <span key={tag} className="article-tag-link">{tag}</span>
            ))}
          </div>

          <div className="article-cta">
            <h3>AI-first 組織の構築にご関心ありませんか?</h3>
            <p>私たちの知見をあなたの事業に実装します。60分の無料相談をご予約ください。</p>
            <Link href="/contact" className="btn-cta">無料相談を申し込む →</Link>
          </div>
        </div>
      </article>

      {/* RELATED */}
      <section className="related">
        <div className="related-inner">
          <span className="section-label">Related Articles</span>
          <h2 className="section-title" style={{ marginBottom: 48 }}>関連記事</h2>
          <div className="related-grid">
            {[
              {
                bg: "linear-gradient(135deg, rgba(0,180,216,0.3), rgba(6,74,92,0.88)), url('/images/generated/ai_hero.jpg') center/cover no-repeat",
                tag: "AI",
                date: "2026.03.18",
                title: "FP&A × AI 自動化: 月次締め工数を70%削減した実装パターン",
                emoji: "🤖",
              },
              {
                bg: "linear-gradient(135deg, rgba(0,180,216,0.3), rgba(6,74,92,0.88)), url('/images/generated/ai_hero.jpg') center/cover no-repeat",
                tag: "AI",
                date: "2026.02.26",
                title: "プロンプトエンジニアリングの実務ガイド: 再現性のある出力の作り方",
                emoji: "🤖",
              },
              {
                bg: "linear-gradient(135deg, rgba(11,22,52,0.9), rgba(139,44,62,0.7)), url('/images/generated/team_diverse.jpg') center/cover no-repeat",
                tag: "ORGANIZATION",
                date: "2026.02.12",
                title: "多様性を成果に変える: 6つのバックグラウンドを\"ミックス\"する運営術",
                emoji: "👥",
              },
            ].map((item) => (
              <Link key={item.title} href="/insights" className="related-card">
                <div className="related-visual" style={{ background: item.bg }}>
                  <span className="related-tag-pos">{item.tag}</span>
                  {item.emoji}
                </div>
                <div className="related-body">
                  <div className="related-date">{item.date}</div>
                  <div className="related-title">{item.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
